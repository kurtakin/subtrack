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

export interface CalendarSyncPayload {
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
}

export interface InstallmentCalendarSyncPayload {
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
 * Configured with 1-day advance alarm (1440 minutes) via popup and email reminder.
 * Repeating rule: RRULE:FREQ=MONTHLY for monthly subscriptions, RRULE:FREQ=YEARLY for yearly.
 * If subscription is on auto-payment or paid, it is highlighted in Basil Green (colorId: 10).
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
  const isGreen = Boolean(payload.isPaid || payload.isAutoPayment);

  const buildEventBody = (useCustomReminders = true) => ({
    summary: isGreen
      ? `✅ [ÖDENDİ${payload.isAutoPayment ? ' - Otomatik Ödeme' : ''}] ${payload.name} - ${payload.amount.toFixed(2)} ${curr}`
      : `🔔 [SubTrack] ${payload.name} - ${payload.amount.toFixed(2)} ${curr}`,
    description: isGreen
      ? `✅ SUBTRACK OTOMATİK ABONELİK PLANI\n\n` +
        `📌 Servis / Abonelik: ${payload.name}\n` +
        `💳 Tutar: ${payload.amount.toFixed(2)} ${curr}\n` +
        `🏷️ Kategori: ${payload.category}\n` +
        `🔄 Dönem: ${payload.billingCycle === 'monthly' ? 'Aylık' : 'Yıllık'}\n` +
        `🔄 Ödeme Durumu: Otomatik Ödeme Talimatı Aktif (Yeşil - Ödendi)\n` +
        (payload.note ? `📝 Not: ${payload.note}\n` : '') +
        `\nBu etkinlik SubTrack uygulaması tarafından otomatik ödeme kapsamında takviminizde yeşil olarak işaretlenmiştir.`
      : `SubTrack Otomatik Fatura & Abonelik Hatırlatıcı\n\n` +
        `📌 Servis / Abonelik: ${payload.name}\n` +
        `💳 Tutar: ${payload.amount.toFixed(2)} ${curr}\n` +
        `🏷️ Kategori: ${payload.category}\n` +
        `🔄 Dönem: ${payload.billingCycle === 'monthly' ? 'Aylık' : 'Yıllık'}\n` +
        (payload.note ? `📝 Not: ${payload.note}\n` : '') +
        `\nBu etkinlik SubTrack uygulaması tarafından 1 gün öncesine alarmlı olarak otomatik senkronize edilmiştir.`,
    start: {
      date: startDateStr
    },
    end: {
      date: endDateStr
    },
    recurrence: [recurrenceRule],
    colorId: isGreen ? '10' : undefined, // 10 = Basil (Forest Green)
    // Google Calendar universally supports popup reminders. Email reminder can fail on accounts without email notification support.
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
    transparency: 'transparent'
  });

  // If existing event ID wasn't provided, search Google Calendar for existing events matching this subscription
  let targetEventId = existingEventId;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // 1. Check Google Calendar for existing events with this subscription name
    try {
      const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events?maxResults=50&q=${encodeURIComponent(payload.name)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items = searchData.items || [];
        // Match items where summary or description contains payload.name or matches existingEventId
        const matched = items.filter((it: any) => 
          it.id === existingEventId ||
          (it.summary && it.summary.toLowerCase().includes(payload.name.toLowerCase())) ||
          (it.description && it.description.toLowerCase().includes(payload.name.toLowerCase()))
        );

        if (matched.length > 0) {
          targetEventId = matched[0].id;

          // If there are duplicate/excess events found for this subscription, clean them up!
          if (matched.length > 1) {
            for (let idx = 1; idx < matched.length; idx++) {
              const dupId = matched[idx].id;
              if (dupId && dupId !== targetEventId) {
                fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${dupId}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${accessToken}` }
                }).catch(() => {});
              }
            }
          }
        }
      }
    } catch (searchErr) {
      console.warn('Could not search for existing calendar events:', searchErr);
    }

    let url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
    let method = 'POST';

    if (targetEventId) {
      url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${targetEventId}`;
      method = 'PUT';
    }

    let response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildEventBody(true)),
      signal: controller.signal
    });

    // If custom reminder fails with 400 Bad Request, retry with useDefault: true
    if (!response.ok && response.status === 400) {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventBody(false)),
        signal: controller.signal
      });
    }

    // If PUT on targetEventId returned 404 (event was deleted on Google Calendar), fall back to POST
    if (!response.ok && response.status === 404 && targetEventId) {
      url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
      method = 'POST';
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventBody(true)),
        signal: controller.signal
      });
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
      eventId: resJson.id,
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

  // If previous event IDs exist, clean them up first so calendar has no orphaned/duplicate events
  if (previousEventIds) {
    await deleteInstallmentCalendarEvents(accessToken, calendarId, previousEventIds).catch(() => {});
  }

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
    const isInstAuto = Boolean(payload.isPaid || payload.isAutoPayment);

    const buildEventBody = (useCustomReminders = true) => ({
      summary: isInstAuto
        ? `✅ [ÖDENDİ${payload.isAutoPayment ? ' - Otomatik Ödeme' : ''} - Taksit ${currentInstNum}/${total}${isLast ? ' - Son Taksit! 🎉' : ''}] ${payload.name} - ${payload.monthlyAmount.toFixed(2)} ${curr}${storeInfo}`
        : `🔔 [Taksit ${currentInstNum}/${total}${isLast ? ' - Son Taksit! 🎉' : ''}] ${payload.name} - ${payload.monthlyAmount.toFixed(2)} ${curr}${storeInfo}`,
      description: isInstAuto
        ? `✅ BU TAKSİT OTOMATİK ÖDEME KAPSAMINDA SUBTRACK TARAFINDAN ÖDENDİ OLARAK KAYDEDİLMİŞTİR!\n\n` +
          `📦 Ürün / Hizmet: ${payload.name}\n` +
          (payload.store ? `🏬 Satıcı / Firma: ${payload.store}\n` : '') +
          `💳 Taksit Bilgisi: ${currentInstNum}. Taksit / Toplam ${total}\n` +
          `💵 Bu Ayki Taksit Tutarı: ${payload.monthlyAmount.toFixed(2)} ${curr}\n` +
          `🔄 Ödeme Türü: Otomatik Ödeme Talimatı ile Ödendi (Yeşil)\n` +
          (payload.bankOrCard ? `🏦 Ödeme Kartı / Banka: ${payload.bankOrCard}\n` : '') +
          (payload.note ? `📝 Not: ${payload.note}\n` : '')
        : `SubTrack Taksitli Alışveriş Hatırlatıcı\n\n` +
          `📦 Ürün / Hizmet: ${payload.name}\n` +
          (payload.store ? `🏬 Satıcı / Firma: ${payload.store}\n` : '') +
          `💳 Taksit Bilgisi: ${currentInstNum}. Taksit / Toplam ${total} (${isLast ? 'Bu ay ile taksitleriniz tamamlanıyor! 🎉' : `Kalan: ${remainingAfterThis} taksit`})\n` +
          `💵 Bu Ayki Taksit Tutarı: ${payload.monthlyAmount.toFixed(2)} ${curr}\n` +
          `📊 Toplam Ürün Değeri: ${payload.totalAmount.toFixed(2)} ${curr}\n` +
          `   • Bu Taksite Kadar Ödenen: ${paidUpToThis.toFixed(2)} ${curr}\n` +
          `   • Kalan Borç (Bu Taksit Sonrası): ${remainingDebtAfterThis.toFixed(2)} ${curr}\n` +
          (payload.bankOrCard ? `🏦 Ödeme Kartı / Banka: ${payload.bankOrCard}\n` : '') +
          (payload.note ? `📝 Not: ${payload.note}\n` : '') +
          `\nBu taksit etkinliği SubTrack uygulaması tarafından 1 gün öncesine alarmlı olarak Google Takviminize eklenmiştir.`,
      start: {
        date: startDateStr
      },
      end: {
        date: endDateStr
      },
      colorId: isInstAuto ? '10' : undefined, // 10 = Basil (Forest Green)
      reminders: isInstAuto
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
      transparency: 'transparent'
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEventBody(true)),
        signal: controller.signal
      });

      if (!response.ok && response.status === 400) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildEventBody(false)),
          signal: controller.signal
        });
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
      if (resJson.id) {
        createdEventIds.push(resJson.id);
        eventMap[currentInstNum] = resJson.id;
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
 * Syncs a regular payment (Kira, Fatura, Kişiler, vb.) to Google Calendar.
 * If the payment is already paid or its due date has arrived under auto-payment, it is created/updated in Green (colorId: 10).
 * Otherwise it is created with 1-day prior alert in Tangerine (colorId: 6).
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
  },
  existingEventId?: string
): Promise<{ eventId: string; htmlLink?: string }> => {
  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const rawDateStr = (payment.nextPaymentDate || '').split('T')[0] || new Date().toISOString().split('T')[0];
  const parts = rawDateStr.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || (new Date().getMonth() + 1);
  const d = parts[2] || new Date().getDate();
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const endDateStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const curr = payment.currency || 'USD';

  const todayStr = new Date().toISOString().split('T')[0];
  const isDueOrPast = Boolean(dateStr <= todayStr);
  const isPaidOrAutoPaid = Boolean(payment.isPaid || payment.isAutoPayment || (payment.isAutoPayment && isDueOrPast));

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

  const summary = isPaidOrAutoPaid
    ? `✅ [ÖDENDİ${payment.isAutoPayment ? ' - Otomatik Ödeme' : ''}] ${payment.name} - ${payment.amount.toFixed(2)} ${curr}${payment.payee ? ` (${payment.payee})` : ''}`
    : `🔔 [${catLabel}] ${payment.name} - ${payment.amount.toFixed(2)} ${curr}${payment.payee ? ` (${payment.payee})` : ''}`;

  const description = isPaidOrAutoPaid
    ? `✅ BU DÜZENLİ ÖDEME SUBTRACK TARAFINDAN BAŞARIYLA ÖDENDİ OLARAK KAYDEDİLDİ!\n\n` +
      `🏷️ Ödeme: ${payment.name}\n` +
      (payment.payee ? `🏢 Alıcı: ${payment.payee}\n` : '') +
      `💵 Tutar: ${payment.amount.toFixed(2)} ${curr}\n` +
      `📅 Vade / Ödeme Tarihi: ${dateStr}\n` +
      (payment.isAutoPayment ? `🔄 Ödeme Türü: Otomatik Ödeme Talimatı ile Günü Geldiğinde Ödendi\n` : `✋ Ödeme Türü: Manuel Ödendi\n`) +
      (payment.accountOrSubscriberNo ? `🔢 Abone/Tesisat/IBAN: ${payment.accountOrSubscriberNo}\n` : '') +
      (payment.bankOrCard ? `🏦 Ödeme Hesabı/Kartı: ${payment.bankOrCard}\n` : '') +
      (payment.note ? `📝 Not: ${payment.note}\n` : '') +
      `\nBu ödemenin günü geldiğinde SubTrack tarafından yeşil renkle (Ödendi) güncellenmiştir.`
    : `📌 AYLIK DÜZENLİ ÖDEME HATIRLATMASI (SubTrack)\n\n` +
      `🏷️ Ödeme: ${payment.name}\n` +
      (payment.payee ? `🏢 Alıcı: ${payment.payee}\n` : '') +
      `💵 Tutar: ${payment.amount.toFixed(2)} ${curr}\n` +
      `📅 Vade Tarihi: ${dateStr}\n` +
      (payment.isAutoPayment ? `🔄 Ödeme Türü: Otomatik Ödeme Talimatlı\n` : `✋ Ödeme Türü: Manuel Ödeme (EFT/Havale)\n`) +
      (payment.accountOrSubscriberNo ? `🔢 Abone/Tesisat/IBAN: ${payment.accountOrSubscriberNo}\n` : '') +
      (payment.bankOrCard ? `🏦 Ödeme Hesabı/Kartı: ${payment.bankOrCard}\n` : '') +
      (payment.note ? `📝 Not: ${payment.note}\n` : '') +
      `\nBu etkinlik SubTrack tarafından 1 gün öncesine alarmlı olarak takviminize eklenmiştir.`;

  const eventBody = {
    summary,
    description,
    start: { date: dateStr },
    end: { date: endDateStr },
    colorId: isPaidOrAutoPaid ? '10' : '6', // 10 = Basil (Forest Green), 6 = Tangerine (Orange)
    reminders: isPaidOrAutoPaid
      ? { useDefault: false, overrides: [] }
      : {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 }, // 1 day before
            { method: 'popup', minutes: 120 }   // 2 hours before
          ]
        }
  };

  if (existingEventId) {
    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${existingEventId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      });
      if (res.ok) {
        const data = await res.json();
        return { eventId: data.id, htmlLink: data.htmlLink };
      }
    } catch {}
  }

  const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  });
  if (!createRes.ok) {
    throw new Error('Google Takvim etkinliği oluşturulamadı');
  }
  const createData = await createRes.json();
  return { eventId: createData.id, htmlLink: createData.htmlLink };
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
