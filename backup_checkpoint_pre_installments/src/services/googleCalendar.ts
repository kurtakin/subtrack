/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
];

let inMemoryAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getCachedAccessToken = (): string | null => {
  return inMemoryAccessToken;
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
  inMemoryAccessToken = credential.accessToken;
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
    summary: cal.summaryOverride || cal.summary || 'İsimsiz Takvim',
    primary: !!cal.primary,
    description: cal.description || '',
    backgroundColor: cal.backgroundColor
  }));

  // Ensure primary calendar is first in list
  return items.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
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
}

/**
 * Creates or updates an event in the user's selected Google Calendar.
 * Configured with 1-day advance alarm (1440 minutes) via popup and email reminder.
 * Repeating rule: RRULE:FREQ=MONTHLY for monthly subscriptions, RRULE:FREQ=YEARLY for yearly.
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

  const buildEventBody = (useCustomReminders = true) => ({
    summary: `🔔 [SubTrack] ${payload.name} - ${payload.amount.toFixed(2)} ${curr}`,
    description: `SubTrack Otomatik Fatura & Abonelik Hatırlatıcı\n\n` +
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
    // Google Calendar universally supports popup reminders. Email reminder can fail on accounts without email notification support.
    reminders: useCustomReminders ? {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 } // 1 day before
      ]
    } : {
      useDefault: true
    },
    transparency: 'transparent'
  });

  let url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`;
  let method = 'POST';

  if (existingEventId) {
    url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${existingEventId}`;
    method = 'PUT';
  }

  // Use AbortController with 6s timeout so individual requests never block the flow
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
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

    if (!response.ok) {
      if (response.status === 401) {
        inMemoryAccessToken = null;
        throw new Error('Oturum süresi doldu (401). Lütfen Google Takvim bağlantısını yenileyin.');
      }
      if (response.status === 404 && existingEventId) {
        return syncEventToGoogleCalendar(accessToken, calendarId, payload);
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
      throw new Error(`Google Takvim yanıt vermedi (6sn zaman aşımı).`);
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
