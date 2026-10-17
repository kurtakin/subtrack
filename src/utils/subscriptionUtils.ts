import { Subscription } from '../types';

/**
 * Ensures a Subscription object contains NO undefined fields before writing to Firestore or local state.
 * - Strictly preserves false, 0, and non-empty string values.
 * - Preserves existing note, auto-payment, and payment history when present.
 * - Never invents fake payment information for new records.
 * - Completely avoids 'as any' or '@ts-ignore'.
 */
export function cleanSubscriptionPayload(
  sub: Subscription,
  fallbackUid?: string
): Subscription {
  const result: Subscription = {
    id: sub.id,
    uid: sub.uid || fallbackUid || 'default_user',
    name: sub.name,
    amount: typeof sub.amount === 'number' ? sub.amount : (Number(sub.amount) || 0),
    category: sub.category,
    billingCycle: sub.billingCycle,
    nextPaymentDate: sub.nextPaymentDate,
    status: sub.status,
    icon: sub.icon
  };

  if (sub.pricingType !== undefined) {
    result.pricingType = sub.pricingType;
  }
  if (sub.isAutoPayment !== undefined) {
    result.isAutoPayment = sub.isAutoPayment;
  }
  if (sub.note !== undefined && sub.note.trim() !== '') {
    result.note = sub.note.trim();
  }
  if (sub.isPaid !== undefined) {
    result.isPaid = sub.isPaid;
  }
  if (sub.lastPaidMonth !== undefined) {
    result.lastPaidMonth = sub.lastPaidMonth;
  }
  if (sub.lastPaidDate !== undefined) {
    result.lastPaidDate = sub.lastPaidDate;
  }
  if (sub.lastNotified !== undefined) {
    result.lastNotified = sub.lastNotified;
  }
  if (sub.calendarEventId !== undefined && sub.calendarEventId !== null) {
    result.calendarEventId = sub.calendarEventId;
  }
  if (sub.calendarSyncedAt !== undefined) {
    result.calendarSyncedAt = sub.calendarSyncedAt;
  }

  return result;
}

/**
 * Validates that an object contains zero undefined properties.
 */
export function hasUndefinedProperties(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some(val => val === undefined);
}
