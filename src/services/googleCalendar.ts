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
 * Resolves the explicit target period (YYYY-MM) for a regular payment.
 * If targetPeriod is provided and valid, uses it.
 * Otherwise extracts it strictly from nextPaymentDate (YYYY-MM-DD).
 * If neither provides a valid period, throws a descriptive error and NEVER defaults to current month.
 */
export function resolveTargetPeriod(targetPeriod?: string, nextPaymentDate?: string): string {
  if (targetPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(targetPeriod.trim())) {
    return targetPeriod.trim();
  }
  if (nextPaymentDate && typeof nextPaymentDate === 'string') {
    const raw = nextPaymentDate.split('T')[0].trim();
    const match = raw.match(/^(\d{4})-(0[1-9]|1[0-2])/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
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

  // 1. Resolve explicit target period (throws descriptive error if it cannot be determined, never falls back to current month)
  const targetPeriod = resolveTargetPeriod(payment.targetPeriod, payment.nextPaymentDate);

  // Validate nextPaymentDate format strictly
  if (!payment.nextPaymentDate || typeof payment.nextPaymentDate !== 'string') {
    throw new Error('Düzenli ödeme için hedef dönem belirlenemedi: nextPaymentDate eksik veya boş.');
  }
  const rawDateStr = payment.nextPaymentDate.split('T')[0].trim();
  const dateMatch = rawDateStr.match(/^(\d{4})-(0[1-9]|1[0-2])-([0-3]\d)$/);
  if (!dateMatch) {
    throw new Error(`Düzenli ödeme vade tarihi YYYY-MM-DD formatında olmalıdır. Alınan değer: "${payment.nextPaymentDate}".`);
  }

  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const y = Number(dateMatch[1]);
  const m = Number(dateMatch[2]);
  const d = Number(dateMatch[3]);
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const curr = payment.currency || 'USD';

  // 2. Determine actual payment status STRICTLY for this targetPeriod.
  // CRITICAL:
  // - Auto-payment preference (isAutoPayment) is NOT treated as proof of payment!
  // - Current month payment does NOT count as payment for a different target period!
  const isActuallyPaid = payment.isPaid !== undefined
    ? payment.isPaid
    : isRegularPaymentPaidForPeriod(payment, targetPeriod);

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

  // 3. Kararlı etkinlik kimliği (Stable event ID) MUST use the exact targetPeriod
  const stableEventId = generateStableCalendarEventId('reg', payment.id, targetPeriod);
  const targetEventId = (existingEventId && existingEventId.startsWith('budfol') && existingEventId !== stableEventId)
    ? stableEventId
    : (existingEventId || stableEventId);

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
  eventId?: string;
  name: string;
  amount: number;
  currency?: string;
  payee?: string;
  category?: string;
  dueDate?: string;
  isAutoPayment?: boolean;
}

/**
 * Marks regular payment event in Google Calendar as paid with GREEN color (colorId: 10 - Basil).
 * If the eventId is not provided or not found, it automatically searches the user's calendar
 * or creates the green paid event on the payment due date.
 */
export const markRegularPaymentEventPaidInGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  payment: MarkRegularPaymentPaidPayload
): Promise<string | null> => {
  if (!accessToken) return null;
  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const curr = payment.currency || 'USD';
  const rawDate = (payment.dueDate || '').split('T')[0] || new Date().toISOString().split('T')[0];
  const parts = rawDate.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || (new Date().getMonth() + 1);
  const d = parts[2] || new Date().getDate();
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;

  const isAuto = payment.isAutoPayment ?? true;
  const summary = `✅ [ÖDENDİ${isAuto ? ' - Otomatik Ödeme' : ''}] ${payment.name} - ${payment.amount.toFixed(2)} ${curr}${payment.payee ? ` (${payment.payee})` : ''}`;
  const description = `✅ BU DÜZENLİ ÖDEME SUBTRACK ÜZERİNDEN BAŞARIYLA ÖDENDİ OLARAK İŞARETLENDİ!\n\n` +
    `🏷️ Ödeme: ${payment.name}\n` +
    (payment.payee ? `🏢 Alıcı: ${payment.payee}\n` : '') +
    `💵 Tutar: ${payment.amount.toFixed(2)} ${curr}\n` +
    `📅 Vade / Ödeme Tarihi: ${dateStr}\n` +
    (isAuto ? `🔄 Ödeme Türü: Otomatik Ödeme Talimatı ile Günü Geldiğinde Ödendi\n` : `✋ Ödeme Türü: Manuel Ödendi\n`) +
    `\nBu ödemenin günü geldiğinde SubTrack tarafından otomatik olarak ödendiği onaylanmış ve Google Takvim'de yeşil renkle (Ödendi) güncellenmiştir.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let targetEventId = payment.eventId;

    // If eventId wasn't known, search Google Calendar for matching event in the month
    if (!targetEventId) {
      try {
        const searchMin = `${y}-${String(m).padStart(2, '0')}-01T00:00:00Z`;
        const endMonthDate = new Date(Date.UTC(y, m, 0));
        const searchMax = `${y}-${String(m).padStart(2, '0')}-${String(endMonthDate.getUTCDate()).padStart(2, '0')}T23:59:59Z`;
        const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events?timeMin=${encodeURIComponent(searchMin)}&timeMax=${encodeURIComponent(searchMax)}&q=${encodeURIComponent(payment.name)}`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items.length > 0) {
            const match = searchData.items.find((item: any) => 
              item.start?.date === dateStr || 
              (item.summary && item.summary.toLowerCase().includes(payment.name.toLowerCase()))
            ) || searchData.items[0];
            targetEventId = match?.id;
          }
        }
      } catch (searchErr) {
        console.warn('Could not search for existing calendar event:', searchErr);
      }
    }

    if (targetEventId) {
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
          colorId: '10', // Forest Green / Basil
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

    // If targetEventId was missing or PATCH returned 404, CREATE a fresh green event with POST
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
        colorId: '10', // Forest Green / Basil
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
    console.warn('Could not mark regular payment as paid in Google Calendar:', err);
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
};

/**
 * Marks a subscription event in Google Calendar as paid / auto-renewed (Green, colorId: 10).
 * Searches and creates fallback if not already on calendar.
 */
export const markSubscriptionEventPaidInGoogleCalendar = async (
  accessToken: string,
  calendarId: string,
  subscription: {
    eventId?: string;
    name: string;
    amount: number;
    currency?: string;
    category?: string;
    lang?: string;
    dueDate?: string;
  }
): Promise<string | null> => {
  if (!accessToken) return null;
  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const curr = subscription.currency || 'USD';
  const isEn = subscription.lang === 'en';
  const rawDate = (subscription.dueDate || '').split('T')[0] || new Date().toISOString().split('T')[0];
  const parts = rawDate.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || (new Date().getMonth() + 1);
  const d = parts[2] || new Date().getDate();
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;

  const summary = isEn
    ? `✅ [PAID - Auto-Pay] ${subscription.name} - ${subscription.amount.toFixed(2)} ${curr}`
    : `✅ [ÖDENDİ - Otomatik Ödeme] ${subscription.name} - ${subscription.amount.toFixed(2)} ${curr}`;

  const description = isEn
    ? `SubTrack Automatic Plan Renewal\n\n📌 Service / Subscription: ${subscription.name}\n💳 Amount: ${subscription.amount.toFixed(2)} ${curr}\n\nThis payment was automatically processed on its due date and highlighted in green (Paid) in your Google Calendar.`
    : `SubTrack Otomatik Plan Yenilemesi\n\n📌 Servis / Abonelik: ${subscription.name}\n💳 Tutar: ${subscription.amount.toFixed(2)} ${curr}\n\nBu ödeme günü geldiğinde SubTrack tarafından otomatik olarak ödendi olarak işaretlenmiş ve takvimde yeşil renkle güncellenmiştir.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let targetEventId = subscription.eventId;

    if (!targetEventId) {
      try {
        const searchMin = `${y}-${String(m).padStart(2, '0')}-01T00:00:00Z`;
        const endMonthDate = new Date(Date.UTC(y, m, 0));
        const searchMax = `${y}-${String(m).padStart(2, '0')}-${String(endMonthDate.getUTCDate()).padStart(2, '0')}T23:59:59Z`;
        const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events?timeMin=${encodeURIComponent(searchMin)}&timeMax=${encodeURIComponent(searchMax)}&q=${encodeURIComponent(subscription.name)}`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items.length > 0) {
            const match = searchData.items.find((item: any) => 
              (item.summary && item.summary.toLowerCase().includes(subscription.name.toLowerCase()))
            ) || searchData.items[0];
            targetEventId = match?.id;
          }
        }
      } catch {}
    }

    if (targetEventId) {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary,
          colorId: '10', // Forest Green / Basil
          description,
          reminders: { useDefault: false, overrides: [] }
        }),
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        return data.id || targetEventId;
      }
      if (res.status === 401) {
        setCachedAccessToken(null);
        return null;
      }
    }

    const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
    const postRes = await fetch(postUrl, {
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
        colorId: '10',
        transparency: 'transparent',
        reminders: { useDefault: false, overrides: [] }
      }),
      signal: controller.signal
    });
    if (postRes.ok) {
      const d = await postRes.json();
      return d.id;
    }
  } catch (err) {
    console.warn('Could not mark subscription as paid in Google Calendar:', err);
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
};
