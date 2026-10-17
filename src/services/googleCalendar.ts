/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { parseISO, addMonths, format } from 'date-fns';
import { auth } from '../firebase';

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
];

const GCAL_TOKEN_KEY = 'subtrack_gcal_token';
const GCAL_TOKEN_EXP_KEY = 'subtrack_gcal_token_expires_at';

let inMemoryAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null, expiresInSeconds: number = 3500) => {
  inMemoryAccessToken = token;
  if (token) {
    try {
      localStorage.setItem(GCAL_TOKEN_KEY, token);
      localStorage.setItem(GCAL_TOKEN_EXP_KEY, (Date.now() + expiresInSeconds * 1000).toString());
    } catch {}
  } else {
    try {
      localStorage.removeItem(GCAL_TOKEN_KEY);
      localStorage.removeItem(GCAL_TOKEN_EXP_KEY);
    } catch {}
  }
};

export const getCachedAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    const saved = localStorage.getItem(GCAL_TOKEN_KEY);
    const exp = localStorage.getItem(GCAL_TOKEN_EXP_KEY);
    if (saved) {
      if (!exp || Date.now() < parseInt(exp, 10)) {
        inMemoryAccessToken = saved;
        return saved;
      }
      // Keep saved token with a grace period; if the API returns 401 it will be cleaned up
      if (exp && Date.now() < parseInt(exp, 10) + 24 * 3600 * 1000) {
        inMemoryAccessToken = saved;
        return saved;
      }
    }
  } catch {}
  return null;
};

export const createGoogleCalendarProvider = () => {
  const provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
};

export const connectGoogleCalendar = async (): Promise<string> => {
  const provider = createGoogleCalendarProvider();
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Google Takvim erişim izni alınamadı.');
  }
  setCachedAccessToken(credential.accessToken);
  return credential.accessToken;
};

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
  description?: string;
  backgroundColor?: string;
}

/**
 * Fetch list of user's Google Calendars (primary and secondary)
 */
export const fetchGoogleCalendars = async (accessToken: string): Promise<GoogleCalendarItem[]> => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      inMemoryAccessToken = null;
      throw new Error('Oturum süresi doldu. Lütfen Google Takvim bağlantısını yenileyin.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Takvim listesi alınamadı (${response.status})`);
  }

  const data = await response.json();
  const items: GoogleCalendarItem[] = (data.items || []).map((cal: any) => ({
    id: cal.id,
    summary: cal.summaryOverride || cal.summary || 'Gmail Calendar',
    primary: !!cal.primary,
    description: cal.description || '',
    backgroundColor: cal.backgroundColor
  }));

  // Ensure primary calendar is first in list
  return items.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
};

/**
 * Fetches existing events from the Google Calendar created or matched by SubTrack.
 */
export const fetchExistingSubTrackEvents = async (
  accessToken: string,
  calendarId: string = 'primary'
): Promise<Array<{ id: string; summary?: string; description?: string }>> => {
  if (!accessToken) return [];
  try {
    const targetCalId = encodeURIComponent(calendarId || 'primary');
    const url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events?maxResults=250&q=SubTrack`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || '',
      description: item.description || ''
    }));
  } catch {
    return [];
  }
};

/**
 * Generates a deterministic, collision-resistant Google Calendar event ID.
 * Google Calendar API event ID rules: characters in [a-v0-9], length 5 to 1024.
 */
export function generateStableCalendarEventId(
  recordType: 'sub' | 'inst' | 'reg' | 'tax',
  recordId: string,
  periodKey: string = 'default'
): string {
  const rawKey = `budfol_${recordType}_${recordId}_${periodKey}`.toLowerCase();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < rawKey.length; i++) {
    const ch = rawKey.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');

  const sanitizedId = recordId.toLowerCase().replace(/[^a-v0-9]/g, '').slice(0, 20);
  const sanitizedPeriod = periodKey.toLowerCase().replace(/[^a-v0-9]/g, '').slice(0, 10);

  const eventId = `budfol${recordType.slice(0, 4)}${sanitizedId}${sanitizedPeriod}${part1}${part2}`;
  return eventId.replace(/[^a-v0-9]/g, '').slice(0, 64);
}

export interface CalendarSyncPayload {
  id?: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  billingCycle: 'monthly' | 'yearly';
  nextPaymentDate: string;
  status: 'active' | 'cancelled';
  note?: string;
  isAutoPayment?: boolean;
  isPaid?: boolean;
  periodKey?: string;
}

export interface InstallmentCalendarSyncPayload {
  id?: string;
  name: string;
  store: string;
  totalAmount: number;
  monthlyAmount: number;
  currency: string;
  category: string;
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments: number;
  nextPaymentDate: string;
  bankOrCard?: string;
  note?: string;
  isAutoPayment?: boolean;
  isPaid?: boolean;
}

/**
 * Creates or updates an event in the user's selected Google Calendar.
 * Uses a stable source identifier (deterministic ID + record ID + periodKey) so re-syncing
 * updates the existing event rather than creating duplicates.
 * Auto-payment preference is NOT treated as proof of actual payment.
 * Events are NOT deleted or adopted based on title/name similarity.
 */
export const syncEventToGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payload: CalendarSyncPayload,
  existingEventId?: string
): Promise<{ eventId: string; htmlLink?: string }> => {
  if (!accessToken) {
    throw new Error('Google erişim anahtarı bulunamadı. Lütfen takvimi bağlayın.');
  }

  const targetCalId = encodeURIComponent(calendarId || 'primary');

  // Format dates: ISO YYYY-MM-DD safely without timezone shifts
  const rawDateStr = (payload.nextPaymentDate || '').split('T')[0] || new Date().toISOString().split('T')[0];
  const parts = rawDateStr.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  const startDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endY = dt.getUTCFullYear();
  const endM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const endD = String(dt.getUTCDate()).padStart(2, '0');
  const endDateStr = `${endY}-${endM}-${endD}`;

  const recurrenceRule = payload.billingCycle === 'yearly' ? 'RRULE:FREQ=YEARLY' : 'RRULE:FREQ=MONTHLY';
  const curr = payload.currency || 'USD';

  // CRITICAL: Auto-payment preference is NOT treated as proof of payment.
  // An event only gets green / paid status if payload.isPaid is true.
  const isGreen = Boolean(payload.isPaid);

  const periodKey = payload.periodKey || `${y}-${String(m).padStart(2, '0')}`;
  const recordId = payload.id || payload.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const stableId = generateStableCalendarEventId('sub', recordId, periodKey);
  const targetEventId = existingEventId || stableId;

  const buildEventBody = (useCustomReminders = true) => ({
    id: targetEventId,
    summary: isGreen
      ? `✅ [ÖDENDİ] ${payload.name} - ${payload.amount.toFixed(2)} ${curr}`
      : `🔔 [Budfol] ${payload.name} - ${payload.amount.toFixed(2)} ${curr}`,
    description: isGreen
      ? `✅ BUDFOL ABONELİK ÖDEMESİ\n\n` +
        `📌 Servis / Abonelik: ${payload.name}\n` +
        `💳 Tutar: ${payload.amount.toFixed(2)} ${curr}\n` +
        `🏷️ Kategori: ${payload.category}\n` +
        `🔄 Dönem: ${payload.billingCycle === 'monthly' ? 'Aylık' : 'Yıllık'}\n` +
        `🔄 Ödeme Durumu: Ödendi (Yeşil)\n` +
        (payload.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
        (payload.note ? `📝 Not: ${payload.note}\n` : '') +
        `\nBu etkinlik Budfol uygulaması tarafından takviminizde güncellenmiştir.`
      : `Budfol Fatura & Abonelik Hatırlatıcı\n\n` +
        `📌 Servis / Abonelik: ${payload.name}\n` +
        `💳 Tutar: ${payload.amount.toFixed(2)} ${curr}\n` +
        `🏷️ Kategori: ${payload.category}\n` +
        `🔄 Dönem: ${payload.billingCycle === 'monthly' ? 'Aylık' : 'Yıllık'}\n` +
        `⏳ Ödeme Durumu: Bekliyor / Planlandı\n` +
        (payload.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
        (payload.note ? `📝 Not: ${payload.note}\n` : '') +
        `\nBu etkinlik Budfol uygulaması tarafından 1 gün öncesine alarmlı olarak senkronize edilmiştir.`,
    start: {
      date: startDateStr
    },
    end: {
      date: endDateStr
    },
    recurrence: [recurrenceRule],
    colorId: isGreen ? '10' : '6', // 10 = Basil (Forest Green), 6 = Tangerine
    reminders: isGreen
      ? { useDefault: false, overrides: [] }
      : useCustomReminders
      ? {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 } // 1 day before
          ]
        }
      : {
          useDefault: true
        },
    extendedProperties: {
      private: {
        budfolApp: 'budfol',
        budfolType: 'subscription',
        budfolRecordId: recordId,
        budfolPeriod: periodKey
      }
    },
    transparency: 'transparent'
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const putUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
    let response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildEventBody(true)),
      signal: controller.signal
    });

    // If PUT returns 400 with custom reminders, retry PUT with useDefault: true
    if (!response.ok && response.status === 400) {
      response = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventBody(false)),
        signal: controller.signal
      });
    }

    // If event does not exist yet (404), create it via POST
    if (response.status === 404) {
      const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
      response = await fetch(postUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventBody(true)),
        signal: controller.signal
      });

      if (!response.ok && response.status === 400) {
        response = await fetch(postUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildEventBody(false)),
          signal: controller.signal
        });
      }

      // If POST returns 409 Conflict, event was created concurrently; update it with PUT
      if (response.status === 409) {
        response = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildEventBody(true)),
          signal: controller.signal
        });
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        inMemoryAccessToken = null;
        throw new Error('Oturum süresi doldu (401). Lütfen Google Takvim bağlantısını yenileyin.');
      }
      const errData = await response.json().catch(() => ({}));
      console.error('Google Calendar error response:', response.status, errData);
      throw new Error(errData.error?.message || `Takvim etkinliği oluşturulamadı (${response.status})`);
    }

    const resJson = await response.json();
    return {
      eventId: resJson.id || targetEventId,
      htmlLink: resJson.htmlLink
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Google Takvim yanıt vermedi (8sn zaman aşımı).`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Deletes an event from Google Calendar
 */
export const deleteGoogleCalendarEvent = async (
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<boolean> => {
  if (!eventId) return true;
  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${eventId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.ok || response.status === 404;
};

/**
 * Deletes multiple installment events from Google Calendar
 */
export const deleteInstallmentCalendarEvents = async (
  accessToken: string,
  calendarId: string,
  eventIds?: string[] | string
): Promise<void> => {
  if (!eventIds || !accessToken) return;
  const list = Array.isArray(eventIds) ? eventIds : [eventIds];
  for (const id of list) {
    if (id) {
      await deleteGoogleCalendarEvent(accessToken, calendarId, id).catch(() => {});
    }
  }
};

export interface InstallmentMonthlySyncResult {
  eventId: string;
  eventIds: string[];
  eventMap: Record<number, string>;
  count: number;
}

/**
 * Creates individual monthly events in Google Calendar for all remaining installment months.
 * Title on each month shows that specific month's installment number:
 * e.g. "[Taksit 9/24] iPhone 16 Pro Max", "[Taksit 10/24] ...", ..., "[Taksit 24/24 - Son Taksit! 🎉]"
 * Each event has 1-day advance alarm and detailed balance breakdown.
 */
/**
 * Creates or updates individual monthly events in Google Calendar for installment months.
 * Uses a stable source identifier (deterministic ID + record ID + month number) so re-syncing
 * updates existing events rather than duplicating them.
 * Auto-payment preference is NOT treated as proof of actual payment.
 * Events are NOT deleted or adopted based on name similarity.
 */
export const syncInstallmentMonthlyEventsToGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payload: InstallmentCalendarSyncPayload,
  previousEventIds?: string[] | string
): Promise<InstallmentMonthlySyncResult> => {
  if (!accessToken) {
    throw new Error('Google erişim anahtarı bulunamadı. Lütfen takvimi bağlayın.');
  }

  const targetCalId = encodeURIComponent(calendarId || 'primary');

  const total = Math.max(1, payload.totalInstallments || 1);
  const paid = Math.max(0, payload.paidInstallments || 0);
  const remaining = Math.max(1, payload.remainingInstallments || (total - paid));
  const countToCreate = Math.min(remaining, Math.max(1, total - paid));
  const startInstNumber = Math.min(total, paid + 1);

  const curr = payload.currency || 'USD';
  const storeInfo = payload.store ? ` (${payload.store})` : '';

  let baseDate: Date;
  try {
    const raw = (payload.nextPaymentDate || '').split('T')[0];
    baseDate = raw ? parseISO(raw) : new Date();
  } catch {
    baseDate = new Date();
  }

  const createdEventIds: string[] = [];
  const eventMap: Record<number, string> = {};
  const recordId = payload.id || payload.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  for (let i = 0; i < countToCreate; i++) {
    const currentInstNum = startInstNumber + i;
    const isLast = currentInstNum === total;
    const remainingAfterThis = Math.max(0, total - currentInstNum);

    const monthDate = addMonths(baseDate, i);
    const startDateStr = format(monthDate, 'yyyy-MM-dd');

    // End date is next day for all-day Google Calendar event
    const dt = new Date(Date.UTC(monthDate.getFullYear(), monthDate.getMonth(), monthDate.getDate()));
    dt.setUTCDate(dt.getUTCDate() + 1);
    const endY = dt.getUTCFullYear();
    const endM = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const endD = String(dt.getUTCDate()).padStart(2, '0');
    const endDateStr = `${endY}-${endM}-${endD}`;

    const paidUpToThis = currentInstNum * (payload.monthlyAmount || 0);
    const remainingDebtAfterThis = remainingAfterThis * (payload.monthlyAmount || 0);

    // CRITICAL: Auto-payment preference is NOT treated as proof of payment!
    // A future installment is only marked paid if currentInstNum <= paidInstallments or payload.isPaid is true.
    const isThisInstPaid = Boolean(payload.isPaid || currentInstNum <= paid);

    const periodKey = `inst_${currentInstNum}`;
    const stableInstEventId = generateStableCalendarEventId('inst', recordId, periodKey);
    const prevId = Array.isArray(previousEventIds) ? previousEventIds[i] : (i === 0 ? previousEventIds : undefined);
    const targetEventId = prevId || stableInstEventId;

    const buildEventBody = (useCustomReminders = true) => ({
      id: targetEventId,
      summary: isThisInstPaid
        ? `✅ [ÖDENDİ - Taksit ${currentInstNum}/${total}${isLast ? ' - Son Taksit! 🎉' : ''}] ${payload.name} - ${payload.monthlyAmount.toFixed(2)} ${curr}${storeInfo}`
        : `🔔 [Taksit ${currentInstNum}/${total}${isLast ? ' - Son Taksit! 🎉' : ''}] ${payload.name} - ${payload.monthlyAmount.toFixed(2)} ${curr}${storeInfo}`,
      description: isThisInstPaid
        ? `✅ BU TAKSİT BUDFOL TARAFINDAN ÖDENDİ OLARAK KAYDEDİLMİŞTİR!\n\n` +
          `📦 Ürün / Hizmet: ${payload.name}\n` +
          (payload.store ? `🏬 Satıcı / Firma: ${payload.store}\n` : '') +
          `💳 Taksit Bilgisi: ${currentInstNum}. Taksit / Toplam ${total}\n` +
          `💵 Taksit Tutarı: ${payload.monthlyAmount.toFixed(2)} ${curr}\n` +
          `🔄 Ödeme Durumu: Ödendi (Yeşil)\n` +
          (payload.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
          (payload.bankOrCard ? `🏦 Ödeme Kartı / Banka: ${payload.bankOrCard}\n` : '') +
          (payload.note ? `📝 Not: ${payload.note}\n` : '')
        : `Budfol Taksitli Harcama Hatırlatıcı\n\n` +
          `📦 Ürün / Hizmet: ${payload.name}\n` +
          (payload.store ? `🏬 Satıcı / Firma: ${payload.store}\n` : '') +
          `💳 Taksit Bilgisi: ${currentInstNum}. Taksit / Toplam ${total} (${isLast ? 'Bu ay ile taksitleriniz tamamlanıyor! 🎉' : `Kalan: ${remainingAfterThis} taksit`})\n` +
          `💵 Bu Ayki Taksit Tutarı: ${payload.monthlyAmount.toFixed(2)} ${curr}\n` +
          `📊 Toplam Ürün Değeri: ${payload.totalAmount.toFixed(2)} ${curr}\n` +
          `   • Bu Taksite Kadar Ödenen: ${paidUpToThis.toFixed(2)} ${curr}\n` +
          `   • Kalan Borç (Bu Taksit Sonrası): ${remainingDebtAfterThis.toFixed(2)} ${curr}\n` +
          (payload.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
          (payload.bankOrCard ? `🏦 Ödeme Kartı / Banka: ${payload.bankOrCard}\n` : '') +
          (payload.note ? `📝 Not: ${payload.note}\n` : '') +
          `\nBu taksit etkinliği Budfol uygulaması tarafından 1 gün öncesine alarmlı olarak Google Takviminize eklenmiştir.`,
      start: {
        date: startDateStr
      },
      end: {
        date: endDateStr
      },
      colorId: isThisInstPaid ? '10' : '6', // 10 = Basil (Forest Green), 6 = Tangerine
      reminders: isThisInstPaid
        ? { useDefault: false, overrides: [] }
        : useCustomReminders
        ? {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 1440 } // 1 day before
            ]
          }
        : {
            useDefault: true
          },
      extendedProperties: {
        private: {
          budfolApp: 'budfol',
          budfolType: 'installment',
          budfolRecordId: recordId,
          budfolPeriod: periodKey
        }
      },
      transparency: 'transparent'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const putUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
      let response = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventBody(true)),
        signal: controller.signal
      });

      if (!response.ok && response.status === 400) {
        response = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildEventBody(false)),
          signal: controller.signal
        });
      }

      // If event does not exist yet (404), create it via POST
      if (response.status === 404) {
        const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
        response = await fetch(postUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildEventBody(true)),
          signal: controller.signal
        });

        if (!response.ok && response.status === 400) {
          response = await fetch(postUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildEventBody(false)),
            signal: controller.signal
          });
        }

        if (response.status === 409) {
          response = await fetch(putUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildEventBody(true)),
            signal: controller.signal
          });
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          setCachedAccessToken(null);
          throw new Error('Oturum süresi doldu (401). Lütfen Google Takvim bağlantısını yenileyin.');
        }
        const errData = await response.json().catch(() => ({}));
        console.error(`Google Calendar error response for installment month ${currentInstNum}:`, response.status, errData);
        throw new Error(errData.error?.message || `Takvim etkinliği oluşturulamadı (${response.status})`);
      }

      const resJson = await response.json();
      const savedId = resJson.id || targetEventId;
      if (savedId) {
        createdEventIds.push(savedId);
        eventMap[currentInstNum] = savedId;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Google Takvim yanıt vermedi (6sn zaman aşımı).`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Small delay between calls to avoid API rate limits
    if (i < countToCreate - 1) {
      await new Promise(r => setTimeout(r, 60));
    }
  }

  return {
    eventId: createdEventIds[0] || '',
    eventIds: createdEventIds,
    eventMap,
    count: createdEventIds.length
  };
};

export interface MarkInstallmentPaidPayload {
  eventId?: string;
  name: string;
  store?: string;
  paidInstallmentNumber: number;
  totalInstallments: number;
  monthlyAmount: number;
  currency: string;
  paymentDate: string; // YYYY-MM-DD
  bankOrCard?: string;
}

/**
 * Updates or creates the paid month's event in Google Calendar with green color (colorId: 10 - Basil)
 * and title "✅ [ÖDENDİ - Taksit X/Y] Product Name".
 */
export const markInstallmentEventPaidInGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payload: MarkInstallmentPaidPayload
): Promise<string | null> => {
  if (!accessToken) return null;
  const targetCalId = encodeURIComponent(calendarId || 'primary');

  const curr = payload.currency || 'USD';
  const storeInfo = payload.store ? ` (${payload.store})` : '';
  const rawDate = (payload.paymentDate || '').split('T')[0] || new Date().toISOString().split('T')[0];
  const parts = rawDate.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || (new Date().getMonth() + 1);
  const d = parts[2] || new Date().getDate();
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;

  const isCompleted = payload.paidInstallmentNumber >= payload.totalInstallments;
  const remainingCount = Math.max(0, payload.totalInstallments - payload.paidInstallmentNumber);

  const summary = `✅ [ÖDENDİ - Taksit ${payload.paidInstallmentNumber}/${payload.totalInstallments}${isCompleted ? ' - Tüm Taksitler Bitti! 🎉' : ''}] ${payload.name} - ${payload.monthlyAmount.toFixed(2)} ${curr}${storeInfo}`;
  const description = `✅ BU TAKSİT SUBTRACK ÜZERİNDEN BAŞARIYLA ÖDENDİ OLARAK İŞARETLENDİ!\n\n` +
    `📦 Ürün / Hizmet: ${payload.name}\n` +
    (payload.store ? `🏬 Satıcı / Firma: ${payload.store}\n` : '') +
    `💳 Ödenen Taksit: ${payload.paidInstallmentNumber}. Taksit / Toplam ${payload.totalInstallments}\n` +
    `💵 Ödenen Tutar: ${payload.monthlyAmount.toFixed(2)} ${curr}\n` +
    `📅 Ödeme Tarihi: ${dateStr}\n` +
    (remainingCount > 0 ? `📊 Kalan Taksit: ${remainingCount} taksit\n` : `🎉 Tebrikler! Bu ürünün tüm taksit borcu başarıyla kapatıldı.\n`) +
    (payload.bankOrCard ? `🏦 Ödeme Kartı / Banka: ${payload.bankOrCard}\n` : '') +
    `\nBu taksit zamanında ödendiği için alarmı kapatılmış ve Google Takvim'de yeşil renkle (Ödendi) işaretlenmiştir.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let targetEventId = payload.eventId;

    // If eventId wasn't known, search for an existing event for this installment around the payment month
    if (!targetEventId) {
      try {
        const searchMin = `${y}-${String(m).padStart(2, '0')}-01T00:00:00Z`;
        const endMonthDate = new Date(Date.UTC(y, m, 0));
        const searchMax = `${y}-${String(m).padStart(2, '0')}-${String(endMonthDate.getUTCDate()).padStart(2, '0')}T23:59:59Z`;
        const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events?timeMin=${encodeURIComponent(searchMin)}&timeMax=${encodeURIComponent(searchMax)}&q=${encodeURIComponent(payload.name)}`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items.length > 0) {
            const match = searchData.items.find((item: any) => 
              item.start?.date === dateStr || 
              (item.summary && (item.summary.includes(payload.name) || item.summary.includes(`Taksit ${payload.paidInstallmentNumber}`)))
            ) || searchData.items[0];
            targetEventId = match?.id;
          }
        }
      } catch (searchErr) {
        console.warn('Could not search for existing calendar event:', searchErr);
      }
    }

    if (targetEventId) {
      // 1. Try PATCH on existing event (preserves all other attributes while updating color to Green & title to Paid)
      const patchUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary,
          description,
          colorId: '10', // Google Calendar Basil / Forest Green
          transparency: 'transparent',
          reminders: {
            useDefault: false,
            overrides: []
          }
        }),
        signal: controller.signal
      });

      if (patchRes.ok) {
        const patchData = await patchRes.json();
        return patchData.id || targetEventId;
      }

      if (patchRes.status === 401) {
        setCachedAccessToken(null);
        return null;
      }
    }

    // 2. If targetEventId was missing or PATCH returned 404, CREATE a fresh green event with POST
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
    const postRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary,
        description,
        start: { date: dateStr },
        end: { date: endDateStr },
        colorId: '10', // Google Calendar Basil / Forest Green
        transparency: 'transparent',
        reminders: {
          useDefault: false,
          overrides: []
        }
      }),
      signal: controller.signal
    });

    if (postRes.ok) {
      const postData = await postRes.json();
      return postData.id;
    }
  } catch (err) {
    console.warn('Could not mark installment as paid in Google Calendar:', err);
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
};

/**
 * Reverts a previously paid installment event back to unpaid status (color lavender/default, alarm on)
 */
export const unmarkInstallmentEventPaidInGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payload: MarkInstallmentPaidPayload
): Promise<boolean> => {
  if (!accessToken || !payload.eventId) return false;
  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const isLast = payload.paidInstallmentNumber >= payload.totalInstallments;
  const curr = payload.currency || 'USD';
  const storeInfo = payload.store ? ` (${payload.store})` : '';

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${payload.eventId}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: `🔔 [Taksit ${payload.paidInstallmentNumber}/${payload.totalInstallments}${isLast ? ' - Son Taksit! 🎉' : ''}] ${payload.name} - ${payload.monthlyAmount.toFixed(2)} ${curr}${storeInfo}`,
        colorId: '1', // Default / Lavender
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 1440 }]
        }
      })
    });
    return response.ok;
  } catch (err) {
    console.warn('Could not revert installment payment status in Google Calendar:', err);
    return false;
  }
};

/**
 * Creates or updates installment events in Google Calendar for all remaining months.
 * Title reflects each specific month's installment (e.g. "[Taksit 9/24] iPhone 16 Pro Max").
 */
export const syncInstallmentToGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payload: InstallmentCalendarSyncPayload,
  existingEventId?: string | string[]
): Promise<{ eventId: string; eventIds: string[]; eventMap: Record<number, string>; count: number; htmlLink?: string }> => {
  return syncInstallmentMonthlyEventsToGoogleCalendar(accessToken, calendarId, payload, existingEventId);
};

/**
 * Returns the exact number of calendar days in a given year and month.
 * Correctly accounts for leap years in February.
 */
export function getDaysInCalendarMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeap ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/**
 * Validates date format strictly as YYYY-MM-DD (with optional standard ISO time),
 * verifies real calendar days (rejecting Feb 31, day 00, day 32, corrupt suffixes, etc.),
 * and ensures that explicit targetPeriod (if provided) matches the month of nextPaymentDate.
 * Throws a descriptive error BEFORE any API request.
 */
export function validateAndResolvePaymentDate(
  nextPaymentDate: string,
  targetPeriod?: string
): { year: number; month: number; day: number; dateStr: string; targetPeriod: string } {
  if (!nextPaymentDate || typeof nextPaymentDate !== 'string') {
    throw new Error('Düzenli ödeme için hedef dönem belirlenemedi: nextPaymentDate eksik veya boş.');
  }

  const trimmed = nextPaymentDate.trim();
  // Strictly validate date format: YYYY-MM-DD, or standard ISO timestamp YYYY-MM-DDTHH:mm:ss(Z)
  // Rejects invalid days like 00, 32, Feb 31, and broken suffixes like "-suffix", "_corrupted", etc.
  const dateRegex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-][0-2]\d:?[0-5]\d)?)?$/;
  const match = trimmed.match(dateRegex);
  if (!match) {
    throw new Error(`Düzenli ödeme vade tarihi YYYY-MM-DD formatında geçerli bir takvim tarihi olmalıdır. Alınan değer: "${nextPaymentDate}".`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Strict calendar day validation
  const maxDays = getDaysInCalendarMonth(year, month);
  if (day < 1 || day > maxDays) {
    throw new Error(`Geçersiz takvim günü: "${nextPaymentDate}". ${year}-${String(month).padStart(2, '0')} dönemi için gün 1 ile ${maxDays} arasında olmalıdır.`);
  }

  const resolvedPeriod = `${year}-${String(month).padStart(2, '0')}`;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Check if explicit targetPeriod conflicts with nextPaymentDate
  if (targetPeriod && targetPeriod.trim()) {
    const cleanPeriod = targetPeriod.trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(cleanPeriod)) {
      throw new Error(`Geçersiz hedef dönem formatı: "${targetPeriod}". Format YYYY-MM olmalıdır.`);
    }
    if (cleanPeriod !== resolvedPeriod) {
      throw new Error(`Hedef dönem ("${cleanPeriod}") ile vade tarihinin dönemi ("${resolvedPeriod}") çelişiyor. Lütfen tarihleri kontrol edin.`);
    }
  }

  return { year, month, day, dateStr, targetPeriod: resolvedPeriod };
}

/**
 * Resolves the explicit target period (YYYY-MM) for a regular payment.
 * Validates date format, real calendar days, and detects conflicts before returning.
 * If neither provides a valid period, throws a descriptive error and NEVER defaults to current month.
 */
export function resolveTargetPeriod(targetPeriod?: string, nextPaymentDate?: string): string {
  if (nextPaymentDate && typeof nextPaymentDate === 'string') {
    const validated = validateAndResolvePaymentDate(nextPaymentDate, targetPeriod);
    return validated.targetPeriod;
  }
  if (targetPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(targetPeriod.trim())) {
    return targetPeriod.trim();
  }
  throw new Error('Düzenli ödeme için hedef dönem belirlenemedi. Lütfen geçerli bir vade tarihi (YYYY-MM-DD) veya hedef dönem (YYYY-MM) belirtin.');
}

/**
 * Checks whether a regular payment is actually marked paid for the specified explicit target period.
 * Auto-payment preference is NOT proof of payment. Current month payment does NOT count for another period.
 */
export function isRegularPaymentPaidForPeriod(
  payment: {
    lastPaidMonth?: string;
    paidMonths?: string[];
    paymentHistory?: Array<{ month: string }>;
  },
  targetPeriod: string
): boolean {
  if (payment.lastPaidMonth === targetPeriod) return true;
  if (payment.paidMonths && payment.paidMonths.includes(targetPeriod)) return true;
  if (payment.paymentHistory && payment.paymentHistory.some(h => h.month === targetPeriod)) return true;
  return false;
}

export interface SubscriptionPaymentLike {
  date: string;
  status?: string;
  type?: string;
  month?: string;
}

export interface SubscriptionPaidCheckTarget {
  id?: string;
  lastPaidMonth?: string;
  lastPaidDate?: string;
  paidMonths?: string[];
  paymentHistory?: Array<{ month?: string; date?: string; status?: string }>;
  payments?: SubscriptionPaymentLike[];
  isPaid?: boolean;
  paidPeriod?: string;
}

/**
 * Checks whether a subscription is actually marked paid for the specified explicit target period.
 * Auto-payment preference is NOT proof of payment. Another period's payment does NOT count.
 */
export function isSubscriptionPaidForPeriod(
  subscription: SubscriptionPaidCheckTarget,
  targetPeriod: string
): boolean {
  if (subscription.lastPaidMonth === targetPeriod) return true;
  if (subscription.lastPaidDate && (!subscription.lastPaidMonth || subscription.lastPaidMonth === targetPeriod)) {
    const p = subscription.lastPaidDate.slice(0, 7);
    if (p === targetPeriod) return true;
  }
  if (subscription.paidMonths && subscription.paidMonths.includes(targetPeriod)) return true;
  if (subscription.paymentHistory && subscription.paymentHistory.some(h => {
    if (h.month === targetPeriod) return true;
    if (h.date && h.date.slice(0, 7) === targetPeriod && (!h.status || h.status === 'paid')) return true;
    return false;
  })) return true;
  if (subscription.payments && subscription.payments.some(p => {
    const period = p.month || p.date.slice(0, 7);
    return period === targetPeriod && (!p.status || p.status === 'paid');
  })) return true;
  if (subscription.paidPeriod === targetPeriod && subscription.isPaid === true && (!subscription.lastPaidMonth || subscription.lastPaidMonth === targetPeriod)) {
    return true;
  }
  return false;
}

export interface GoogleCalendarVerifiedEvent {
  id: string;
  summary?: string;
  description?: string;
  recurrence?: string[];
  colorId?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: {
    private?: {
      budfolApp?: string;
      budfolRecordId?: string;
      budfolPeriod?: string;
      budfolType?: string;
      [key: string]: string | undefined;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Runtime type guard: Checks if an unknown value is a valid non-array Google Calendar event object
 * with a valid non-empty string 'id' matching expectedEventId, and valid types for metadata if present.
 */
export function isGoogleCalendarEvent(
  val: unknown,
  expectedEventId: string
): val is GoogleCalendarVerifiedEvent {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) {
    return false;
  }
  const obj = val as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.trim() === '' || obj.id !== expectedEventId) {
    return false;
  }
  if ('extendedProperties' in obj && obj.extendedProperties !== undefined) {
    if (obj.extendedProperties === null || typeof obj.extendedProperties !== 'object' || Array.isArray(obj.extendedProperties)) {
      return false;
    }
    const ext = obj.extendedProperties as Record<string, unknown>;
    if ('private' in ext && ext.private !== undefined) {
      if (ext.private === null || typeof ext.private !== 'object' || Array.isArray(ext.private)) {
        return false;
      }
      const priv = ext.private as Record<string, unknown>;
      const metadataFields = ['budfolApp', 'budfolRecordId', 'budfolPeriod', 'budfolType'];
      for (const field of metadataFields) {
        if (field in priv && priv[field] !== undefined && typeof priv[field] !== 'string') {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Validates Google Calendar verification GET response at runtime with descriptive errors.
 * Rejects arrays ([]), empty objects ({}), missing/mismatched id, null metadata, and malformed metadata.
 * Differentiates valid personal events (events without budfol metadata) from corrupt responses.
 */
export function validateCalendarEventResponse(
  rawParsed: unknown,
  expectedEventId: string
): GoogleCalendarVerifiedEvent {
  if (rawParsed === null || typeof rawParsed !== 'object') {
    throw new Error(`Google Takvim doğrulama yanıtı geçersiz nesne yapısına sahip (null veya ilkel değer). Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
  }
  if (Array.isArray(rawParsed)) {
    throw new Error(`Google Takvim doğrulama yanıtı dizi ([]) olarak döndü, etkinlik nesnesi bekleniyordu. Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
  }

  const obj = rawParsed as Record<string, unknown>;
  if (!('id' in obj) || typeof obj.id !== 'string' || obj.id.trim() === '') {
    throw new Error(`Google Takvim etkinlik yanıtında 'id' alanı eksik veya boş. Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
  }
  if (obj.id !== expectedEventId) {
    throw new Error(`Google Takvim yanıtındaki etkinlik kimliği ("${obj.id}") istenen mevcut etkinlik kimliği ("${expectedEventId}") ile eşleşmiyor. Mevcut etkinlik doğrulanamadığı için takvim yazma işlemi durduruldu.`);
  }

  if ('extendedProperties' in obj && obj.extendedProperties !== undefined) {
    if (obj.extendedProperties === null) {
      throw new Error(`Google Takvim etkinliğinin 'extendedProperties' alanı null olamaz (geçersiz nesne yapısı). Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
    }
    if (typeof obj.extendedProperties !== 'object' || Array.isArray(obj.extendedProperties)) {
      throw new Error(`Google Takvim etkinliğinin 'extendedProperties' alanı geçersiz bir tipe sahip (nesne bekleniyor). Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
    }
    const ext = obj.extendedProperties as Record<string, unknown>;
    if ('private' in ext && ext.private !== undefined) {
      if (ext.private === null) {
        throw new Error(`Google Takvim etkinliğinin 'extendedProperties.private' alanı null olamaz (geçersiz nesne yapısı). Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
      }
      if (typeof ext.private !== 'object' || Array.isArray(ext.private)) {
        throw new Error(`Google Takvim etkinliğinin 'extendedProperties.private' alanı geçersiz bir tipe sahip (nesne bekleniyor). Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
      }
      const priv = ext.private as Record<string, unknown>;
      const metadataFields = ['budfolApp', 'budfolRecordId', 'budfolPeriod', 'budfolType'];
      for (const field of metadataFields) {
        if (field in priv && priv[field] !== undefined && typeof priv[field] !== 'string') {
          throw new Error(`Google Takvim etkinliğinin '${field}' metadata alanı geçersiz bir tipe sahip (string bekleniyor, alınan tip: ${typeof priv[field]}). Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }
      }
    }
  }

  if (!isGoogleCalendarEvent(rawParsed, expectedEventId)) {
    throw new Error(`Google Takvim etkinlik yanıtı çalışma zamanı tip doğrulamasını geçemedi. Mevcut etkinlik (${expectedEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
  }

  return rawParsed;
}

/**
 * Syncs a regular payment (Kira, Fatura, Kişiler, vb.) to Google Calendar using stable source identifier.
 * Payment status, stable event ID, and budfolPeriod all strictly use the same explicit target period.
 * Auto-payment preference is NOT treated as proof of actual payment.
 * Events are NOT deleted or adopted based on name similarity.
 */
export const syncRegularPaymentToGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payment: {
    id: string;
    name: string;
    category: string;
    payee?: string;
    amount: number;
    currency?: string;
    nextPaymentDate: string;
    isAutoPayment?: boolean;
    bankOrCard?: string;
    accountOrSubscriberNo?: string;
    note?: string;
    isPaid?: boolean;
    lastPaidMonth?: string;
    paidMonths?: string[];
    paymentHistory?: Array<{ month: string }>;
    targetPeriod?: string;
  },
  existingEventId?: string
): Promise<{ eventId: string; htmlLink?: string }> => {
  if (!accessToken) {
    throw new Error('Google erişim anahtarı bulunamadı.');
  }

  // 1 & 2 & 3: Validate date format, real calendar days, and ensure targetPeriod and nextPaymentDate do NOT conflict.
  // Throws descriptive error BEFORE any API call.
  const { dateStr, targetPeriod, year: y, month: m, day: d } = validateAndResolvePaymentDate(
    payment.nextPaymentDate,
    payment.targetPeriod
  );

  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const curr = payment.currency || 'USD';

  // Determine actual payment status strictly for targetPeriod.
  const isActuallyPaid = payment.isPaid !== undefined
    ? payment.isPaid
    : isRegularPaymentPaidForPeriod(payment, targetPeriod);

  // Default write target is the deterministic ID for this record and target period
  const stableEventId = generateStableCalendarEventId('reg', payment.id, targetPeriod);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // Verify existingEventId: only use existingEventId if it is verified to belong to the SAME app, record, calendar, and target period!
    let verifiedEventId: string | undefined;
    if (existingEventId) {
      if (existingEventId === stableEventId) {
        verifiedEventId = stableEventId;
      } else {
        const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${encodeURIComponent(existingEventId)}`;
        let checkRes: Response;
        try {
          checkRes = await fetch(checkUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal
          });
        } catch (fetchErr: unknown) {
          if (controller.signal.aborted) {
            throw new Error(`Google Takvim doğrulama isteği zaman aşımına uğradı (timeout). Mevcut etkinlik (${existingEventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          throw new Error(`Google Takvim ağına erişilemedi (ağ hatası: ${msg}). Mevcut etkinlik (${existingEventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }

        if (checkRes.status === 404) {
          // Kesin 404: Etkinlik takvimde bulunamadı (silinmiş veya mevcut değil).
          // Sahiplik/dönem çelişkisi riski yoktur; bu dönem için deterministik kimlik ile devam edilebilir.
          verifiedEventId = undefined;
        } else if (!checkRes.ok) {
          // 401, 403, 429, 5xx ve diğer belirsiz HTTP hataları: sahiplik/dönem bilinemez, yazma isteği göndermeden dur.
          if (checkRes.status === 401) {
            setCachedAccessToken(null);
            throw new Error(`Google Takvim oturum süresi doldu (401). Mevcut etkinlik (${existingEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu. Lütfen Google Takvim bağlantısını yenileyin.`);
          }
          if (checkRes.status === 403) {
            throw new Error(`Google Takvim erişim yetkisi veya kota hatası (403). Mevcut etkinlik (${existingEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          if (checkRes.status === 429) {
            throw new Error(`Google Takvim istek limiti aşıldı (429). Mevcut etkinlik (${existingEventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          if (checkRes.status >= 500) {
            throw new Error(`Google Takvim sunucu hatası (${checkRes.status}). Mevcut etkinlik (${existingEventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          throw new Error(`Google Takvim doğrulama hatası (${checkRes.status}). Mevcut etkinlik (${existingEventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        } else {
          // 200 OK: Gövdeyi runtime type guard ile doğrula ve sahiplik/dönem kontrolü yap
          let rawParsed: unknown;
          try {
            rawParsed = await checkRes.json();
          } catch (jsonErr: unknown) {
            const msg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
            throw new Error(`Google Takvim yanıtı çözümlenemedi (bozuk yanıt: ${msg}). Mevcut etkinlik (${existingEventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }

          const checkData = validateCalendarEventResponse(rawParsed, existingEventId);

          const priv = checkData.extendedProperties?.private;
          if (priv?.budfolApp === 'budfol' && priv?.budfolRecordId === payment.id && priv?.budfolPeriod === targetPeriod) {
            // Aynı kayıt ve hedef dönem doğrulandı: mevcut etkinliği kullan
            verifiedEventId = existingEventId;
          } else {
            // Metadata içermeyen fakat geçerli kişisel etkinlik veya farklı kayıt/dönem tespiti:
            // Sahiplik ve dönem doğrulandı ancak bu kayıt ve hedef döneme ait değil (veya kişisel etkinlik).
            // Bu mevcut etkinliğin üzerine yazılmaz; bu hedef dönem için deterministik kimlik kullanılır.
            verifiedEventId = undefined;
          }
        }
      }
    }

    const targetEventId = verifiedEventId || stableEventId;

    const categoryLabels: Record<string, string> = {
      rent: '🏠 Kira',
      electricity: '⚡ Elektrik',
      gas: '🔥 Doğalgaz',
      water: '💧 Su',
      phone_internet: '📱 Telefon & İnternet',
      dues: '🏢 Aidat',
      person: '👤 Kişiye Ödeme',
      institution: '🏛️ Kurum Ödemesi',
      insurance: '🛡️ Sigorta',
      other: '💳 Düzenli Ödeme'
    };
    const catLabel = categoryLabels[payment.category] || '💳 Aylık Ödeme';

    const summary = isActuallyPaid
      ? `✅ [ÖDENDİ] ${payment.name} - ${payment.amount.toFixed(2)} ${curr}${payment.payee ? ` (${payment.payee})` : ''}`
      : `🔔 [${catLabel}] ${payment.name} - ${payment.amount.toFixed(2)} ${curr}${payment.payee ? ` (${payment.payee})` : ''}`;

    const description = isActuallyPaid
      ? `✅ BU DÜZENLİ ÖDEME BUDFOL TARAFINDAN ÖDENDİ OLARAK KAYDEDİLDİ!\n\n` +
        `🏷️ Ödeme: ${payment.name}\n` +
        (payment.payee ? `🏢 Alıcı: ${payment.payee}\n` : '') +
        `💵 Tutar: ${payment.amount.toFixed(2)} ${curr}\n` +
        `📅 Vade / Ödeme Tarihi: ${dateStr}\n` +
        `🔄 Ödeme Durumu: Ödendi (Yeşil)\n` +
        `🎯 Hedef Dönem: ${targetPeriod}\n` +
        (payment.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
        (payment.accountOrSubscriberNo ? `🔢 Abone/Tesisat/IBAN: ${payment.accountOrSubscriberNo}\n` : '') +
        (payment.bankOrCard ? `🏦 Ödeme Hesabı/Kartı: ${payment.bankOrCard}\n` : '') +
        (payment.note ? `📝 Not: ${payment.note}\n` : '') +
        `\nBu etkinlik Budfol tarafından Google Takvim'de güncellenmiştir.`
      : `📌 AYLIK DÜZENLİ ÖDEME HATIRLATMASI (Budfol)\n\n` +
        `🏷️ Ödeme: ${payment.name}\n` +
        (payment.payee ? `🏢 Alıcı: ${payment.payee}\n` : '') +
        `💵 Tutar: ${payment.amount.toFixed(2)} ${curr}\n` +
        `📅 Vade Tarihi: ${dateStr}\n` +
        `⏳ Ödeme Durumu: Bekliyor / Planlandı\n` +
        `🎯 Hedef Dönem: ${targetPeriod}\n` +
        (payment.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
        (payment.accountOrSubscriberNo ? `🔢 Abone/Tesisat/IBAN: ${payment.accountOrSubscriberNo}\n` : '') +
        (payment.bankOrCard ? `🏦 Ödeme Hesabı/Kartı: ${payment.bankOrCard}\n` : '') +
        (payment.note ? `📝 Not: ${payment.note}\n` : '') +
        `\nBu etkinlik Budfol tarafından 1 gün öncesine alarmlı olarak takviminize eklenmiştir.`;

    const eventBody = {
      id: targetEventId,
      summary,
      description,
      start: { date: dateStr },
      end: { date: endDateStr },
      colorId: isActuallyPaid ? '10' : '6', // 10 = Basil (Forest Green), 6 = Tangerine (Orange)
      reminders: isActuallyPaid
        ? { useDefault: false, overrides: [] }
        : {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 1440 }, // 1 day before
              { method: 'popup', minutes: 120 }   // 2 hours before
            ]
          },
      extendedProperties: {
        private: {
          budfolApp: 'budfol',
          budfolType: 'regular_payment',
          budfolRecordId: payment.id,
          budfolPeriod: targetPeriod
        }
      },
      transparency: 'transparent'
    };

    const putUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
    let res = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody),
      signal: controller.signal
    });

    if (res.status === 404) {
      const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
      res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody),
        signal: controller.signal
      });

      if (res.status === 409) {
        res = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody),
          signal: controller.signal
        });
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        setCachedAccessToken(null);
        throw new Error('Oturum süresi doldu (401). Lütfen Google Takvim bağlantısını yenileyin.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Takvim etkinliği oluşturulamadı (${res.status})`);
    }

    const data = await res.json();
    return { eventId: data.id || targetEventId, htmlLink: data.htmlLink };
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface TaxCalendarSyncPayload {
  id: string; // unique stable identifier e.g. "ca_individual_filing_2026" or tax year record ID
  title: string;
  countryCode: string;
  taxAuthority?: string;
  date: string; // strictly ISO YYYY-MM-DD
  type: 'statutory_milestone' | 'declaration_filing';
  description?: string;
  isCompleted?: boolean;
}

/**
 * Syncs a tax declaration or user-selected statutory tax milestone to Google Calendar.
 * Strictly verifies date format (YYYY-MM-DD); does NOT invent or guess dates.
 * Uses a stable source identifier so re-syncing updates existing events without duplicates.
 * Does NOT delete or claim other events based on title/name similarity.
 */
export const syncTaxMilestoneToGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payload: TaxCalendarSyncPayload,
  existingEventId?: string
): Promise<{ eventId: string; htmlLink?: string }> => {
  if (!accessToken) {
    throw new Error('Google erişim anahtarı bulunamadı.');
  }

  // Strict date format verification: strictly ISO YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!payload.date || !datePattern.test(payload.date)) {
    throw new Error(`Geçerli bir vergi tarihi (YYYY-MM-DD) gereklidir. Alınan tarih: "${payload.date}"`);
  }

  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const parts = payload.date.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const startDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;

  const stableId = generateStableCalendarEventId('tax', payload.id, payload.date);
  const targetEventId = existingEventId || stableId;

  const isCompleted = Boolean(payload.isCompleted);
  const authLabel = payload.taxAuthority ? ` (${payload.taxAuthority})` : '';

  const summary = isCompleted
    ? `✅ [VERGİ BEYANI TAMAMLANDI${authLabel}] ${payload.title}`
    : `🏛️ [VERGİ SON TARİHİ${authLabel}] ${payload.title}`;

  const description = isCompleted
    ? `✅ BU VERGİ BEYANI / ÖDEMESİ BAŞARIYLA TAMAMLANDI!\n\n` +
      `🏛️ Başlık: ${payload.title}\n` +
      `🌐 Ülke / Otorite: ${payload.countryCode} ${payload.taxAuthority || ''}\n` +
      `📅 Beyan Tarihi: ${payload.date}\n` +
      (payload.description ? `📝 Detay: ${payload.description}\n` : '') +
      `\nBu etkinlik Budfol Vergi & İade Merkezi tarafından tamamlandı olarak işaretlenmiştir.`
    : `📌 RESMİ VERGİ BEYAN & ÖDEME HATIRLATMASI (Budfol)\n\n` +
      `🏛️ Başlık: ${payload.title}\n` +
      `🌐 Ülke / Otorite: ${payload.countryCode} ${payload.taxAuthority || ''}\n` +
      `📅 Son Tarih / Dönem: ${payload.date}\n` +
      (payload.description ? `📝 Detay: ${payload.description}\n` : '') +
      `\nBu etkinlik resmi vergi takvimine göre 1 gün öncesine alarmlı olarak Google Takviminize eklenmiştir.`;

  const eventBody = {
    id: targetEventId,
    summary,
    description,
    start: { date: startDateStr },
    end: { date: endDateStr },
    colorId: isCompleted ? '10' : '9', // 10 = Basil Green, 9 = Blueberry (Blue)
    reminders: isCompleted
      ? { useDefault: false, overrides: [] }
      : {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 }, // 1 day before
            { method: 'popup', minutes: 2880 }  // 2 days before
          ]
        },
    extendedProperties: {
      private: {
        budfolApp: 'budfol',
        budfolType: 'tax',
        budfolRecordId: payload.id,
        budfolPeriod: payload.date
      }
    },
    transparency: 'transparent'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const putUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
    let res = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody),
      signal: controller.signal
    });

    if (res.status === 404) {
      const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
      res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody),
        signal: controller.signal
      });

      if (res.status === 409) {
        res = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody),
          signal: controller.signal
        });
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        setCachedAccessToken(null);
        throw new Error('Oturum süresi doldu (401). Lütfen Google Takvim bağlantısını yenileyin.');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Takvim etkinliği oluşturulamadı (${res.status})`);
    }

    const data = await res.json();
    return { eventId: data.id || targetEventId, htmlLink: data.htmlLink };
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface MarkRegularPaymentPaidPayload {
  id: string; // real regular payment record ID
  name: string;
  amount: number;
  paidPeriod?: string; // explicit paid period e.g. "2026-10"
  dueDate?: string; // due date of the paid period e.g. "2026-10-15"
  currency?: string;
  payee?: string;
  category?: string;
  eventId?: string; // existing event ID if known
  isAutoPayment?: boolean;
  isPaid?: boolean;
  lastPaidMonth?: string;
  paidMonths?: string[];
  paymentHistory?: Array<{ month: string }>;
  note?: string;
  accountOrSubscriberNo?: string;
  bankOrCard?: string;
}

/**
 * Marks regular payment event in Google Calendar as paid with GREEN color (colorId: 10 - Basil).
 * Strictly uses the real record ID and explicit paid period (distinct from next payment date).
 * Uses the exact same deterministic event ID formula as regular synchronization.
 * Verifies existing event ownership using runtime type guards and validation helpers.
 * Does NOT adopt events based on name, summary, or date similarity, and never creates ID-less events.
 * Only updates to green when actual proof of payment exists for the paid period (auto-pay preference is not proof).
 * Stops on validation errors without writing; only creates event with deterministic ID upon definitive 404.
 */
export const markRegularPaymentEventPaidInGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payment: MarkRegularPaymentPaidPayload
): Promise<string> => {
  if (!accessToken) {
    throw new Error('Google erişim anahtarı bulunamadı.');
  }

  if (!payment.id || typeof payment.id !== 'string' || payment.id.trim() === '') {
    throw new Error('Düzenli ödeme kayıt kimliği (id) belirtilmedi.');
  }

  // Resolve and validate payment date & target period for the PAID period (not next payment date)
  const resolvedDueDate = payment.dueDate || (payment.paidPeriod ? `${payment.paidPeriod}-01` : '');
  if (!resolvedDueDate) {
    throw new Error('Ödenen dönem (paidPeriod) veya vade tarihi (dueDate) belirtilmedi.');
  }

  const { dateStr, targetPeriod, year: y, month: m, day: d } = validateAndResolvePaymentDate(
    resolvedDueDate,
    payment.paidPeriod
  );

  // Check actual proof of payment for this explicit paid targetPeriod. Auto-payment preference is NOT proof!
  // Unconditional isPaid: true CANNOT be used to hide a period mismatch with lastPaidMonth.
  const hasProof = Boolean(
    isRegularPaymentPaidForPeriod(payment, targetPeriod) ||
    (payment.isPaid === true && (!payment.lastPaidMonth || payment.lastPaidMonth === targetPeriod))
  );

  if (!hasProof) {
    throw new Error(`"${payment.name}" ödemesi için "${targetPeriod}" dönemine ait doğrulanmış bir ödeme kaydı bulunamadı. Otomatik ödeme talimatı veya tercihi tek başına ödeme kanıtı sayılamaz.`);
  }

  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const curr = payment.currency || 'USD';

  // Use the same deterministic ID format as regular synchronization
  const stableEventId = generateStableCalendarEventId('reg', payment.id, targetPeriod);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let verifiedEventId: string | undefined;

    if (payment.eventId) {
      if (payment.eventId === stableEventId) {
        verifiedEventId = stableEventId;
      } else {
        const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${encodeURIComponent(payment.eventId)}`;
        let checkRes: Response;
        try {
          checkRes = await fetch(checkUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal
          });
        } catch (fetchErr: unknown) {
          if (controller.signal.aborted) {
            throw new Error(`Google Takvim doğrulama isteği zaman aşımına uğradı (timeout). Mevcut etkinlik (${payment.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          throw new Error(`Google Takvim ağına erişilemedi (ağ hatası: ${msg}). Mevcut etkinlik (${payment.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }

        if (checkRes.status === 404) {
          // Kesin 404: Takvimde mevcut değil; bu ödenen dönem için deterministik kimlik ile sıfırdan oluşturulabilir
          verifiedEventId = undefined;
        } else if (!checkRes.ok) {
          if (checkRes.status === 401) {
            setCachedAccessToken(null);
            throw new Error(`Google Takvim oturum süresi doldu (401). Mevcut etkinlik (${payment.eventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu. Lütfen Google Takvim bağlantısını yenileyin.`);
          }
          if (checkRes.status === 403) {
            throw new Error(`Google Takvim erişim yetkisi veya kota hatası (403). Mevcut etkinlik (${payment.eventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          if (checkRes.status === 429) {
            throw new Error(`Google Takvim istek limiti aşıldı (429). Mevcut etkinlik (${payment.eventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          if (checkRes.status >= 500) {
            throw new Error(`Google Takvim sunucu hatası (${checkRes.status}). Mevcut etkinlik (${payment.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }
          throw new Error(`Google Takvim doğrulama hatası (${checkRes.status}). Mevcut etkinlik (${payment.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        } else {
          // 200 OK: validateCalendarEventResponse ile yapı ve metadata kontrolü yap
          let rawParsed: unknown;
          try {
            rawParsed = await checkRes.json();
          } catch (jsonErr: unknown) {
            const msg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
            throw new Error(`Google Takvim yanıtı çözümlenemedi (bozuk yanıt: ${msg}). Mevcut etkinlik (${payment.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
          }

          const checkData = validateCalendarEventResponse(rawParsed, payment.eventId);
          const priv = checkData.extendedProperties?.private;

          if (priv?.budfolApp === 'budfol' && priv?.budfolRecordId === payment.id && priv?.budfolPeriod === targetPeriod) {
            // Aynı uygulama, kayıt ve ödenen hedef dönem doğrulandı: bu mevcut etkinliği güncelle
            verifiedEventId = payment.eventId;
          } else {
            // Metadata içermeyen fakat geçerli kişisel etkinlik veya farklı kayıt/dönem tespiti:
            // Bu mevcut etkinliğin üzerine yazılmaz; bu ödenen dönem için deterministik kimlik kullanılır.
            verifiedEventId = undefined;
          }
        }
      }
    }

    const targetEventId = verifiedEventId || stableEventId;

    const summary = `✅ [ÖDENDİ] ${payment.name} - ${payment.amount.toFixed(2)} ${curr}${payment.payee ? ` (${payment.payee})` : ''}`;
    const description = `✅ BU DÜZENLİ ÖDEME BUDFOL TARAFINDAN ÖDENDİ OLARAK KAYDEDİLDİ!\n\n` +
      `🏷️ Ödeme: ${payment.name}\n` +
      (payment.payee ? `🏢 Alıcı: ${payment.payee}\n` : '') +
      `💵 Tutar: ${payment.amount.toFixed(2)} ${curr}\n` +
      `📅 Vade / Ödeme Tarihi: ${dateStr}\n` +
      `🔄 Ödeme Durumu: Ödendi (Yeşil)\n` +
      `🎯 Hedef Dönem: ${targetPeriod}\n` +
      (payment.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
      (payment.accountOrSubscriberNo ? `🔢 Abone/Tesisat/IBAN: ${payment.accountOrSubscriberNo}\n` : '') +
      (payment.bankOrCard ? `🏦 Ödeme Hesabı/Kartı: ${payment.bankOrCard}\n` : '') +
      (payment.note ? `📝 Not: ${payment.note}\n` : '') +
      `\nBu etkinlik Budfol tarafından Google Takvim'de güncellenmiştir.`;

    const eventBody = {
      id: targetEventId,
      summary,
      description,
      start: { date: dateStr },
      end: { date: endDateStr },
      colorId: '10', // Forest Green / Basil
      reminders: {
        useDefault: false,
        overrides: []
      },
      extendedProperties: {
        private: {
          budfolApp: 'budfol',
          budfolType: 'regular_payment',
          budfolRecordId: payment.id,
          budfolPeriod: targetPeriod
        }
      },
      transparency: 'transparent'
    };

    const putUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
    let res = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody),
      signal: controller.signal
    });

    if (res.status === 404) {
      const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
      res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody),
        signal: controller.signal
      });

      if (res.status === 409) {
        res = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody),
          signal: controller.signal
        });
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        setCachedAccessToken(null);
        throw new Error('Oturum süresi doldu (401). Lütfen Google Takvim bağlantısını yenileyin.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Takvim etkinliği güncellenemedi (${res.status})`);
    }

    const data = await res.json();
    return data.id || targetEventId;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface MarkSubscriptionPaidPayload {
  id: string; // real subscription record ID
  name: string;
  amount: number;
  paidPeriod?: string; // explicit paid period e.g. "2026-10"
  dueDate?: string; // due date of the paid period e.g. "2026-10-15"
  currency?: string;
  category?: string;
  billingCycle?: 'monthly' | 'yearly';
  eventId?: string; // existing event ID if known
  lang?: string;
  isAutoPayment?: boolean;
  isPaid?: boolean;
  lastPaidMonth?: string;
  lastPaidDate?: string;
  paidMonths?: string[];
  paymentHistory?: Array<{ month?: string; date?: string; status?: string }>;
  payments?: SubscriptionPaymentLike[];
  note?: string;
}

/**
 * Marks a subscription event in Google Calendar as paid with GREEN color (colorId: 10 - Basil).
 * Strictly uses the real record ID and explicit paid period (distinct from next payment date).
 * Uses the exact same deterministic event ID formula as regular synchronization.
 * Verifies existing event ownership using runtime type guards and validation helpers.
 * Does NOT adopt events based on name, summary, or date similarity, and never creates ID-less events.
 * Only updates to green when actual proof of payment exists for the paid period (auto-pay preference is not proof).
 * Prevents painting the entire recurring event green by leaving recurring series intact and targeting only the paid period.
 * Stops on validation errors without writing; only creates event with deterministic ID upon definitive 404.
 */
export const markSubscriptionEventPaidInGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  subscription: MarkSubscriptionPaidPayload
): Promise<string> => {
  if (!accessToken) {
    throw new Error('Google erişim anahtarı bulunamadı.');
  }

  if (!subscription.id || typeof subscription.id !== 'string' || subscription.id.trim() === '') {
    throw new Error('Abonelik kayıt kimliği (id) belirtilmedi.');
  }

  if (!subscription.name || typeof subscription.name !== 'string' || subscription.name.trim() === '') {
    throw new Error('Abonelik adı belirtilmedi.');
  }

  if (typeof subscription.amount !== 'number' || isNaN(subscription.amount)) {
    throw new Error('Geçerli bir abonelik tutarı belirtilmedi.');
  }

  // Resolve and validate payment date & target period for the PAID period (not next payment date)
  const resolvedDueDate = subscription.dueDate || (subscription.paidPeriod ? `${subscription.paidPeriod}-01` : '');
  if (!resolvedDueDate) {
    throw new Error('Ödenen dönem (paidPeriod) veya vade tarihi (dueDate) belirtilmedi.');
  }

  const { dateStr, targetPeriod, year: y, month: m, day: d } = validateAndResolvePaymentDate(
    resolvedDueDate,
    subscription.paidPeriod
  );

  // Check actual proof of payment for this explicit paid targetPeriod. Auto-payment preference is NOT proof!
  // Unconditional isPaid: true CANNOT be used to hide a period mismatch with lastPaidMonth.
  const hasProof = Boolean(
    isSubscriptionPaidForPeriod(subscription, targetPeriod) ||
    (subscription.isPaid === true && (!subscription.lastPaidMonth || subscription.lastPaidMonth === targetPeriod) && (!subscription.paidPeriod || subscription.paidPeriod === targetPeriod))
  );

  if (!hasProof) {
    throw new Error(`"${subscription.name}" aboneliği için "${targetPeriod}" dönemine ait doğrulanmış bir ödeme kaydı bulunamadı. Otomatik ödeme talimatı veya tercihi tek başına ödeme kanıtı sayılamaz.`);
  }

  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const curr = subscription.currency || 'USD';
  const isEn = subscription.lang === 'en';

  // Use the same deterministic ID format as regular synchronization
  const stableEventId = generateStableCalendarEventId('sub', subscription.id, targetPeriod);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let verifiedEventId: string | undefined;

    if (subscription.eventId) {
      const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${encodeURIComponent(subscription.eventId)}`;
      let checkRes: Response;
      try {
        checkRes = await fetch(checkUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
      } catch (fetchErr: unknown) {
        if (controller.signal.aborted) {
          throw new Error(`Google Takvim doğrulama isteği zaman aşımına uğradı (timeout). Mevcut etkinlik (${subscription.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        throw new Error(`Google Takvim ağına erişilemedi (ağ hatası: ${msg}). Mevcut etkinlik (${subscription.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
      }

      if (checkRes.status === 404) {
        // Kesin 404: Takvimde mevcut değil; bu ödenen dönem için deterministik kimlik ile sıfırdan oluşturulabilir
        verifiedEventId = undefined;
      } else if (!checkRes.ok) {
        if (checkRes.status === 401) {
          setCachedAccessToken(null);
          throw new Error(`Google Takvim oturum süresi doldu (401). Mevcut etkinlik (${subscription.eventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu. Lütfen Google Takvim bağlantısını yenileyin.`);
        }
        if (checkRes.status === 403) {
          throw new Error(`Google Takvim erişim yetkisi veya kota hatası (403). Mevcut etkinlik (${subscription.eventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }
        if (checkRes.status === 429) {
          throw new Error(`Google Takvim istek limiti aşıldı (429). Mevcut etkinlik (${subscription.eventId}) sahipliği doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }
        if (checkRes.status >= 500) {
          throw new Error(`Google Takvim sunucu hatası (${checkRes.status}). Mevcut etkinlik (${subscription.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }
        throw new Error(`Google Takvim doğrulama hatası (${checkRes.status}). Mevcut etkinlik (${subscription.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
      } else {
        // 200 OK: validateCalendarEventResponse ile yapı ve metadata kontrolü yap
        let rawParsed: unknown;
        try {
          rawParsed = await checkRes.json();
        } catch (jsonErr: unknown) {
          const msg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
          throw new Error(`Google Takvim yanıtı çözümlenemedi (bozuk yanıt: ${msg}). Mevcut etkinlik (${subscription.eventId}) durumu doğrulanamadığı için takvim yazma işlemi durduruldu.`);
        }

        const checkData = validateCalendarEventResponse(rawParsed, subscription.eventId);
        const priv = checkData.extendedProperties?.private;
        const isRecurring = Array.isArray(checkData.recurrence) && checkData.recurrence.length > 0;

        if (priv?.budfolApp === 'budfol' && priv?.budfolRecordId === subscription.id && priv?.budfolPeriod === targetPeriod) {
          if (isRecurring) {
            // Tekrarlayan ana etkinliğin tamamı yeşile boyanmaz! Gelecek dönemleri korumak için ana etkinlik bırakılır; bu ödenen dönem için deterministik tekil kimlik kullanılır.
            verifiedEventId = undefined;
          } else {
            // Aynı uygulama, kayıt ve ödenen hedef döneme ait tekil etkinlik doğrulandı: bu mevcut etkinliği güncelle
            verifiedEventId = subscription.eventId;
          }
        } else {
          // Metadata içermeyen fakat geçerli kişisel etkinlik veya farklı kayıt/dönem tespiti:
          // Bu mevcut etkinliğin üzerine yazılmaz; bu ödenen dönem için deterministik kimlik kullanılır.
          verifiedEventId = undefined;
        }
      }
    }

    const targetEventId = verifiedEventId || stableEventId;

    const summary = isEn
      ? `✅ [PAID] ${subscription.name} - ${subscription.amount.toFixed(2)} ${curr}`
      : `✅ [ÖDENDİ] ${subscription.name} - ${subscription.amount.toFixed(2)} ${curr}`;

    const description = isEn
      ? `✅ BUDFOL SUBSCRIPTION PAYMENT RECORDED AS PAID!\n\n` +
        `📌 Service / Subscription: ${subscription.name}\n` +
        `💳 Amount: ${subscription.amount.toFixed(2)} ${curr}\n` +
        (subscription.category ? `🏷️ Category: ${subscription.category}\n` : '') +
        `📅 Due / Payment Date: ${dateStr}\n` +
        `🔄 Payment Status: Paid (Green)\n` +
        `🎯 Target Period: ${targetPeriod}\n` +
        (subscription.billingCycle ? `🔄 Billing Cycle: ${subscription.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}\n` : '') +
        (subscription.isAutoPayment ? `⚙️ Payment Preference: Auto-Pay Instruction\n` : `⚙️ Payment Preference: Manual Payment\n`) +
        (subscription.note ? `📝 Note: ${subscription.note}\n` : '') +
        `\nThis event was updated in Google Calendar by Budfol.`
      : `✅ BUDFOL ABONELİK ÖDEMESİ ÖDENDİ OLARAK KAYDEDİLDİ!\n\n` +
        `📌 Servis / Abonelik: ${subscription.name}\n` +
        `💳 Tutar: ${subscription.amount.toFixed(2)} ${curr}\n` +
        (subscription.category ? `🏷️ Kategori: ${subscription.category}\n` : '') +
        `📅 Vade / Ödeme Tarihi: ${dateStr}\n` +
        `🔄 Ödeme Durumu: Ödendi (Yeşil)\n` +
        `🎯 Hedef Dönem: ${targetPeriod}\n` +
        (subscription.billingCycle ? `🔄 Dönem: ${subscription.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'}\n` : '') +
        (subscription.isAutoPayment ? `⚙️ Ödeme Tercihi: Otomatik Ödeme Talimatlı\n` : `⚙️ Ödeme Tercihi: Manuel Ödeme\n`) +
        (subscription.note ? `📝 Not: ${subscription.note}\n` : '') +
        `\nBu etkinlik Budfol tarafından Google Takvim'de güncellenmiştir.`;

    const eventBody = {
      id: targetEventId,
      summary,
      description,
      start: { date: dateStr },
      end: { date: endDateStr },
      colorId: '10', // Forest Green / Basil
      reminders: {
        useDefault: false,
        overrides: []
      },
      extendedProperties: {
        private: {
          budfolApp: 'budfol',
          budfolType: 'subscription',
          budfolRecordId: subscription.id,
          budfolPeriod: targetPeriod
        }
      },
      transparency: 'transparent'
    };

    const putUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
    let res = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody),
      signal: controller.signal
    });

    if (res.status === 404) {
      const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
      res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody),
        signal: controller.signal
      });

      if (res.status === 409) {
        res = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody),
          signal: controller.signal
        });
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        setCachedAccessToken(null);
        throw new Error('Oturum süresi doldu (401). Lütfen Google Takvim bağlantısını yenileyin.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Takvim etkinliği güncellenemedi (${res.status})`);
    }

    const data = await res.json();
    return data.id || targetEventId;
  } finally {
    clearTimeout(timeoutId);
  }
};

