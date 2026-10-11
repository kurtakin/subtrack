/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Bell,
  Mail,
  ExternalLink,
  Check,
  Sparkles,
  CalendarCheck2,
  ShoppingBag,
  CreditCard,
  Receipt
} from 'lucide-react';
import {
  connectGoogleCalendar,
  fetchGoogleCalendars,
  syncEventToGoogleCalendar,
  syncInstallmentToGoogleCalendar,
  syncRegularPaymentToGoogleCalendar,
  getCachedAccessToken,
  setCachedAccessToken,
  GoogleCalendarItem
} from '../services/googleCalendar';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { Installment, Payment, RegularPayment, Subscription } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  subscriptions: any[];
  payments?: Payment[];
  installments?: Installment[];
  regularPayments?: RegularPayment[];
  onConfirmAction: (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info';
    confirmText?: string;
  }) => void;
  onUpdateSubscription?: (sub: any) => void;
  onUpdateInstallment?: (inst: Installment) => void;
  onUpdateRegularPayment?: (regPay: RegularPayment) => void;
  onPayRegularPayment?: (id: string) => void;
  onPayInstallment?: (id: string) => void;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  subscriptions,
  payments = [],
  installments = [],
  regularPayments = [],
  onConfirmAction,
  onUpdateSubscription,
  onUpdateInstallment,
  onUpdateRegularPayment,
  onPayRegularPayment,
  onPayInstallment
}) => {
  const { t, language } = useTranslation();
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([]);
  const [selectedCalId, setSelectedCalId] = useState<string>(
    profile?.calendarSettings?.calendarId || 'primary'
  );
  const [autoSync, setAutoSync] = useState<boolean>(
    profile?.calendarSettings?.autoSync ?? true
  );
  const [isLoadingCals, setIsLoadingCals] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setAbortSyncRequested] = useState(false);
  const [singleSyncingId, setSingleSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; subName: string } | null>(null);
  const [lastErrors, setLastErrors] = useState<string[]>([]);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [syncTab, setSyncTab] = useState<'subscriptions' | 'installments' | 'regularPayments'>('subscriptions');
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Sync token from memory cache
  useEffect(() => {
    const token = getCachedAccessToken();
    setAccessToken(token);
    if (token && isOpen) {
      loadCalendars(token);
    }
  }, [isOpen]);

  useEffect(() => {
    if (profile?.calendarSettings?.calendarId) {
      setSelectedCalId(profile.calendarSettings.calendarId);
    }
    if (profile?.calendarSettings?.autoSync !== undefined) {
      setAutoSync(profile.calendarSettings.autoSync);
    }
  }, [profile]);

  const loadCalendars = async (token: string) => {
    setIsLoadingCals(true);
    try {
      const items = await fetchGoogleCalendars(token);
      setCalendars(items);
      if (items.length > 0 && !selectedCalId) {
        setSelectedCalId(items[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching Google Calendars:', err);
      if (err.message?.includes('Oturum') || err.message?.includes('Session') || err.message?.includes('401')) {
        setAccessToken(null);
        setCachedAccessToken(null);
      }
      setSyncStatusMessage({
        type: 'error',
        text: err.message || t('calendarConnectFailed')
      });
    } finally {
      setIsLoadingCals(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setSyncStatusMessage(null);
    setPopupBlocked(false);
    try {
      const token = await connectGoogleCalendar();
      setAccessToken(token);
      await loadCalendars(token);
      // Save calendar connection in user profile
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          'calendarSettings.enabled': true,
          'calendarSettings.calendarId': selectedCalId || 'primary',
          'calendarSettings.calendarName': selectedCalId === 'primary' ? t('primaryGmailCalendar') : 'Gmail Calendar',
          'calendarSettings.autoSync': autoSync,
          'calendarSettings.lastConnectedAt': new Date().toISOString()
        });
      }
      setSyncStatusMessage({
        type: 'success',
        text: t('calendarConnectedSuccess')
      });
    } catch (err: any) {
      console.error('Calendar connect error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setPopupBlocked(true);
        setSyncStatusMessage({
          type: 'error',
          text: t('popupBlockedMsg')
        });
        return;
      }
      setSyncStatusMessage({
        type: 'error',
        text: err.message || t('calendarConnectFailed')
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveSettings = async (newCalId: string, newAutoSync: boolean) => {
    setSelectedCalId(newCalId);
    setAutoSync(newAutoSync);
    if (!user) return;
    try {
      const targetCal = calendars.find(c => c.id === newCalId);
      await updateDoc(doc(db, 'users', user.uid), {
        'calendarSettings.calendarId': newCalId,
        'calendarSettings.calendarName': targetCal?.summary || 'Gmail Calendar',
        'calendarSettings.autoSync': newAutoSync,
        'calendarSettings.enabled': true
      });
    } catch (error) {
      console.error('Failed to update calendar settings:', error);
    }
  };

  const handleSyncSingle = async (sub: any) => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
        setAccessToken(token);
      } catch (err) {
        return;
      }
    }
    setSingleSyncingId(sub.id);
    setSyncStatusMessage(null);
    try {
      const result = await syncEventToGoogleCalendar(
        token,
        selectedCalId || 'primary',
        {
          name: sub.name,
          amount: sub.amount,
          currency: profile?.currency || 'USD',
          category: sub.category,
          billingCycle: sub.billingCycle,
          nextPaymentDate: sub.nextPaymentDate,
          status: sub.status,
          note: sub.note
        },
        sub.calendarEventId
      );

      const updatedSub = {
        ...sub,
        calendarEventId: result.eventId,
        calendarSyncedAt: new Date().toISOString()
      };

      // Non-blocking firestore sync
      setDoc(doc(db, 'subscriptions', sub.id), updatedSub, { merge: true }).catch(err => {
        console.warn('Firestore sync skipped/offline:', err);
      });

      if (onUpdateSubscription) {
        onUpdateSubscription(updatedSub);
      }

      try {
        const saved = localStorage.getItem('subtrack_subscriptions');
        if (saved) {
          const parsed = JSON.parse(saved);
          const list = parsed.map((s: any) => s.id === sub.id ? updatedSub : s);
          localStorage.setItem('subtrack_subscriptions', JSON.stringify(list));
        }
      } catch {}

      setSyncStatusMessage({
        type: 'success',
        text: `"${sub.name}" ${t('onCalendarBadge')} ✅`
      });
    } catch (err: any) {
      console.error(`Error syncing sub ${sub.name}:`, err);
      setSyncStatusMessage({
        type: 'error',
        text: `"${sub.name}": ${err.message}`
      });
    } finally {
      setSingleSyncingId(null);
    }
  };

  const handleSyncAllActive = async () => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
        setAccessToken(token);
      } catch (err) {
        return;
      }
    }

    const activeSubs = subscriptions.filter(s => s.status === 'active');
    if (activeSubs.length === 0) {
      setSyncStatusMessage({
        type: 'info',
        text: t('noActiveSubsToSync')
      });
      return;
    }

    const selectedCalSummary = calendars.find(c => c.id === selectedCalId)?.summary || t('primaryGmailCalendar');
    onConfirmAction({
      title: t('syncConfirmSubsTitle'),
      message: t('syncConfirmSubsMsg').replace('{count}', String(activeSubs.length)).replace('{calendar}', selectedCalSummary),
      confirmText: t('addAllSubsToCalendar'),
      variant: 'info',
      onConfirm: async () => {
        setIsSyncing(true);
        setAbortSyncRequested(false);
        setLastErrors([]);
        setSyncProgress({ current: 0, total: activeSubs.length, subName: '...' });

        let successCount = 0;
        let failCount = 0;
        const errorList: string[] = [];

        for (let i = 0; i < activeSubs.length; i++) {
          const sub = activeSubs[i];
          setSyncProgress({ current: i + 1, total: activeSubs.length, subName: sub.name });
          setSyncStatusMessage({
            type: 'info',
            text: `${t('syncingProgress')} (${i + 1}/${activeSubs.length}): ${sub.name}...`
          });

          await new Promise(r => setTimeout(r, 60));

          try {
            const result = await syncEventToGoogleCalendar(
              token!,
              selectedCalId || 'primary',
              {
                name: sub.name,
                amount: sub.amount,
                currency: profile?.currency || 'USD',
                category: sub.category,
                billingCycle: sub.billingCycle,
                nextPaymentDate: sub.nextPaymentDate,
                status: sub.status,
                note: sub.note
              },
              sub.calendarEventId
            );

            const updatedSub = {
              ...sub,
              calendarEventId: result.eventId,
              calendarSyncedAt: new Date().toISOString()
            };

            setDoc(doc(db, 'subscriptions', sub.id), updatedSub, { merge: true }).catch(err => {
              console.warn('Firestore offline, write queued locally:', err);
            });

            if (onUpdateSubscription) {
              onUpdateSubscription(updatedSub);
            }

            try {
              const saved = localStorage.getItem('subtrack_subscriptions');
              if (saved) {
                const parsed = JSON.parse(saved);
                const list = parsed.map((s: any) => s.id === sub.id ? updatedSub : s);
                localStorage.setItem('subtrack_subscriptions', JSON.stringify(list));
              }
            } catch {}

            successCount++;
          } catch (err: any) {
            console.error(`Error syncing sub ${sub.name}:`, err);
            failCount++;
            errorList.push(`${sub.name}: ${err.message || 'Error'}`);
          }
        }

        if (user) {
          setDoc(doc(db, 'users', user.uid), {
            'calendarSettings.lastSyncedAt': new Date().toISOString()
          }, { merge: true }).catch(() => {});
        }

        setIsSyncing(false);
        setSyncProgress(null);
        setLastErrors(errorList);

        if (failCount === 0) {
          setSyncStatusMessage({
            type: 'success',
            text: t('syncSuccessSubs').replace('{count}', String(successCount))
          });
        } else if (successCount > 0) {
          setSyncStatusMessage({
            type: 'info',
            text: t('syncPartialSubs').replace('{success}', String(successCount)).replace('{fail}', String(failCount))
          });
        } else {
          setSyncStatusMessage({
            type: 'error',
            text: `${t('calendarConnectFailed')} (${failCount})`
          });
        }
      }
    });
  };

  const handleSyncSingleInstallment = async (inst: any) => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
        setAccessToken(token);
      } catch (err) {
        return;
      }
    }
    setSingleSyncingId(inst.id);
    setSyncStatusMessage(null);
    try {
      const result = await syncInstallmentToGoogleCalendar(
        token,
        selectedCalId || 'primary',
        {
          name: inst.name,
          store: inst.store,
          totalAmount: inst.totalAmount,
          monthlyAmount: inst.monthlyAmount,
          currency: profile?.currency || 'USD',
          category: inst.category,
          totalInstallments: inst.totalInstallments,
          paidInstallments: inst.paidInstallments || 0,
          remainingInstallments: inst.remainingInstallments || (inst.totalInstallments - (inst.paidInstallments || 0)),
          nextPaymentDate: inst.nextPaymentDate,
          bankOrCard: inst.bankOrCard,
          note: inst.note
        },
        inst.calendarEventIds || inst.calendarEventId
      );

      const updatedInst = {
        ...inst,
        calendarEventId: result.eventId,
        calendarEventIds: result.eventIds,
        calendarEventMap: result.eventMap,
        calendarSyncedAt: new Date().toISOString()
      };

      setDoc(doc(db, 'installments', inst.id), updatedInst, { merge: true }).catch(() => {});

      if (onUpdateInstallment) {
        onUpdateInstallment(updatedInst);
      }

      try {
        const saved = localStorage.getItem('subtrack_installments');
        if (saved) {
          const parsed = JSON.parse(saved);
          const list = parsed.map((item: any) => item.id === inst.id ? updatedInst : item);
          localStorage.setItem('subtrack_installments', JSON.stringify(list));
        }
      } catch {}

      setSyncStatusMessage({
        type: 'success',
        text: `"${inst.name}" ${t('onCalendarBadge')} (${result.count} ${t('months')})`
      });
    } catch (err: any) {
      console.error(`Error syncing installment ${inst.name}:`, err);
      setSyncStatusMessage({
        type: 'error',
        text: `"${inst.name}": ${err.message}`
      });
    } finally {
      setSingleSyncingId(null);
    }
  };

  const handleSyncAllInstallments = async () => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
        setAccessToken(token);
      } catch (err) {
        return;
      }
    }

    const activeInsts = (installments || []).filter(i => i.status === 'active');
    if (activeInsts.length === 0) {
      setSyncStatusMessage({
        type: 'info',
        text: t('noActiveInstsToSync')
      });
      return;
    }

    const selectedCalSummary = calendars.find(c => c.id === selectedCalId)?.summary || t('primaryGmailCalendar');
    onConfirmAction({
      title: t('syncConfirmInstsTitle'),
      message: t('syncConfirmInstsMsg').replace('{count}', String(activeInsts.length)).replace('{calendar}', selectedCalSummary),
      confirmText: t('addAllInstsToCalendar'),
      variant: 'info',
      onConfirm: async () => {
        setIsSyncing(true);
        setAbortSyncRequested(false);
        setLastErrors([]);
        setSyncProgress({ current: 0, total: activeInsts.length, subName: '...' });

        let successCount = 0;
        let failCount = 0;
        const errorList: string[] = [];

        for (let i = 0; i < activeInsts.length; i++) {
          const inst = activeInsts[i];
          setSyncProgress({ current: i + 1, total: activeInsts.length, subName: inst.name });
          setSyncStatusMessage({
            type: 'info',
            text: `${t('syncingInstallmentsProgress')} (${i + 1}/${activeInsts.length}): ${inst.name}...`
          });

          await new Promise(r => setTimeout(r, 60));

          try {
            const result = await syncInstallmentToGoogleCalendar(
              token!,
              selectedCalId || 'primary',
              {
                name: inst.name,
                store: inst.store,
                totalAmount: inst.totalAmount,
                monthlyAmount: inst.monthlyAmount,
                currency: profile?.currency || 'USD',
                category: inst.category,
                totalInstallments: inst.totalInstallments,
                paidInstallments: inst.paidInstallments || 0,
                remainingInstallments: inst.remainingInstallments || (inst.totalInstallments - (inst.paidInstallments || 0)),
                nextPaymentDate: inst.nextPaymentDate,
                bankOrCard: inst.bankOrCard,
                note: inst.note
              },
              inst.calendarEventIds || inst.calendarEventId
            );

            const updatedInst = {
              ...inst,
              calendarEventId: result.eventId,
              calendarEventIds: result.eventIds,
              calendarEventMap: result.eventMap,
              calendarSyncedAt: new Date().toISOString()
            };

            setDoc(doc(db, 'installments', inst.id), updatedInst, { merge: true }).catch(() => {});

            if (onUpdateInstallment) {
              onUpdateInstallment(updatedInst);
            }

            try {
              const saved = localStorage.getItem('subtrack_installments');
              if (saved) {
                const parsed = JSON.parse(saved);
                const list = parsed.map((item: any) => item.id === inst.id ? updatedInst : item);
                localStorage.setItem('subtrack_installments', JSON.stringify(list));
              }
            } catch {}

            successCount++;
          } catch (err: any) {
            console.error(`Error syncing installment ${inst.name}:`, err);
            failCount++;
            errorList.push(`${inst.name}: ${err.message || 'Error'}`);
          }
        }

        if (user) {
          setDoc(doc(db, 'users', user.uid), {
            'calendarSettings.lastSyncedAt': new Date().toISOString()
          }, { merge: true }).catch(() => {});
        }

        setIsSyncing(false);
        setSyncProgress(null);
        setLastErrors(errorList);

        if (failCount === 0) {
          setSyncStatusMessage({
            type: 'success',
            text: t('syncSuccessInsts').replace('{count}', String(successCount))
          });
        } else if (successCount > 0) {
          setSyncStatusMessage({
            type: 'info',
            text: t('syncPartialInsts').replace('{success}', String(successCount)).replace('{fail}', String(failCount))
          });
        } else {
          setSyncStatusMessage({
            type: 'error',
            text: `${t('calendarConnectFailed')} (${failCount})`
          });
        }
      }
    });
  };

  const handleSyncSingleRegularPayment = async (regPay: RegularPayment) => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
        setAccessToken(token);
      } catch (err) {
        return;
      }
    }
    setSingleSyncingId(regPay.id);
    try {
      const result = await syncRegularPaymentToGoogleCalendar(
        token!,
        selectedCalId || 'primary',
        {
          id: regPay.id,
          name: regPay.name,
          category: regPay.category,
          payee: regPay.payee,
          amount: regPay.amount,
          currency: profile?.currency || 'USD',
          nextPaymentDate: regPay.nextPaymentDate,
          isAutoPayment: regPay.isAutoPayment,
          bankOrCard: regPay.bankOrCard,
          accountOrSubscriberNo: regPay.accountOrSubscriberNo,
          note: regPay.note
        },
        regPay.calendarEventId
      );

      const updated = {
        ...regPay,
        calendarEventId: result.eventId,
        calendarSyncedAt: new Date().toISOString()
      };

      if (onUpdateRegularPayment) onUpdateRegularPayment(updated);
      if (user) {
        setDoc(doc(db, 'regularPayments', regPay.id), updated, { merge: true }).catch(() => {});
      }

      setSyncStatusMessage({
        type: 'success',
        text: `✓ ${regPay.name} ${t('syncedSuccessShort', 'Google Takvim ile başarıyla senkronize edildi!')}`
      });
    } catch (err: any) {
      setSyncStatusMessage({
        type: 'error',
        text: `✕ ${regPay.name}: ${err?.message || 'Sync error'}`
      });
    } finally {
      setSingleSyncingId(null);
    }
  };

  const handleSyncAllActiveRegularPayments = async () => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
        setAccessToken(token);
      } catch (err) {
        return;
      }
    }

    const activeRegs = regularPayments.filter(r => r.status === 'active');
    if (activeRegs.length === 0) {
      setSyncStatusMessage({
        type: 'info',
        text: language === 'tr' ? 'Senkronize edilecek aktif düzenli ödeme bulunamadı.' : 'No active regular payments to sync.'
      });
      return;
    }

    const selectedCalSummary = calendars.find(c => c.id === selectedCalId)?.summary || t('primaryGmailCalendar');
    onConfirmAction({
      title: language === 'tr' ? 'Düzenli Ödemeleri Takvime Ekle' : 'Add Regular Payments to Calendar',
      message: `${activeRegs.length} ${language === 'tr' ? 'adet aktif düzenli ödeme takviminize eklenecektir.' : 'active regular payments will be added to your calendar.'}`,
      confirmText: language === 'tr' ? 'Tümünü Ekle' : 'Add All',
      variant: 'info',
      onConfirm: async () => {
        setIsSyncing(true);
        setAbortSyncRequested(false);
        setLastErrors([]);
        setSyncProgress({ current: 0, total: activeRegs.length, subName: '...' });

        let successCount = 0;
        let failCount = 0;
        const errorList: string[] = [];

        for (let i = 0; i < activeRegs.length; i++) {
          const reg = activeRegs[i];
          setSyncProgress({ current: i + 1, total: activeRegs.length, subName: reg.name });
          setSyncStatusMessage({
            type: 'info',
            text: `${t('syncingProgress')} (${i + 1}/${activeRegs.length}): ${reg.name}...`
          });

          await new Promise(r => setTimeout(r, 60));

          try {
            const result = await syncRegularPaymentToGoogleCalendar(
              token!,
              selectedCalId || 'primary',
              {
                id: reg.id,
                name: reg.name,
                category: reg.category,
                payee: reg.payee,
                amount: reg.amount,
                currency: profile?.currency || 'USD',
                nextPaymentDate: reg.nextPaymentDate,
                isAutoPayment: reg.isAutoPayment,
                bankOrCard: reg.bankOrCard,
                accountOrSubscriberNo: reg.accountOrSubscriberNo,
                note: reg.note
              },
              reg.calendarEventId
            );

            const updated = {
              ...reg,
              calendarEventId: result.eventId,
              calendarSyncedAt: new Date().toISOString()
            };

            if (onUpdateRegularPayment) onUpdateRegularPayment(updated);
            if (user) {
              setDoc(doc(db, 'regularPayments', reg.id), updated, { merge: true }).catch(() => {});
            }

            successCount++;
          } catch (err: any) {
            failCount++;
            errorList.push(`${reg.name}: ${err?.message || 'Error'}`);
          }
        }

        setIsSyncing(false);
        setSyncProgress(null);
        setLastErrors(errorList);

        if (failCount === 0) {
          setSyncStatusMessage({
            type: 'success',
            text: `✓ ${successCount} ${language === 'tr' ? 'adet düzenli ödeme takvime eklendi!' : 'regular payments synced to calendar!'}`
          });
        } else {
          setSyncStatusMessage({
            type: 'error',
            text: `${successCount} ${language === 'tr' ? 'başarılı' : 'succeeded'}, ${failCount} ${language === 'tr' ? 'hata' : 'failed'}`
          });
        }
      }
    });
  };

  const handleDisconnect = async () => {
    onConfirmAction({
      title: t('disconnectCalendarConfirmTitle'),
      message: t('disconnectCalendarConfirmMsg'),
      confirmText: t('disconnectCalendar'),
      variant: 'danger',
      onConfirm: async () => {
        setAccessToken(null);
        setCachedAccessToken(null);
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            'calendarSettings.enabled': false
          });
        }
        setSyncStatusMessage({
          type: 'info',
          text: t('disconnectCalendarSuccess')
        });
      }
    });
  };

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const activeSubs = subscriptions.filter((s: any) => s.status === 'active');
  const activeSubsCount = activeSubs.length;
  const syncedSubsCount = activeSubs.filter((s: any) => Boolean(s.calendarEventId)).length;
  const unsyncedSubsCount = Math.max(0, activeSubsCount - syncedSubsCount);
  const allSubsSynced = activeSubsCount > 0 && syncedSubsCount >= activeSubsCount;

  const activeInstallments = (installments || []).filter(i => i.status === 'active');
  const activeInstallmentsCount = activeInstallments.length;
  const syncedInstallmentsCount = activeInstallments.filter(i => Boolean(i.calendarEventId)).length;
  const unsyncedInstsCount = Math.max(0, activeInstallmentsCount - syncedInstallmentsCount);
  const allInstallmentsSynced = activeInstallmentsCount > 0 && syncedInstallmentsCount >= activeInstallmentsCount;

  const activeRegularPayments = (regularPayments || []).filter(r => r.status === 'active');
  const activeRegularPaymentsCount = activeRegularPayments.length;
  const syncedRegularPaymentsCount = activeRegularPayments.filter(r => Boolean(r.calendarEventId)).length;
  const unsyncedRegularPaymentsCount = Math.max(0, activeRegularPaymentsCount - syncedRegularPaymentsCount);
  const allRegularPaymentsSynced = activeRegularPaymentsCount > 0 && syncedRegularPaymentsCount >= activeRegularPaymentsCount;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-xs font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {t('googleCalendarIntegration')}
                </h2>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-bold text-[10px] rounded-md">
                  {t('gmailAndCalendar')}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('googleCalendarDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Status Message */}
          <AnimatePresence>
            {syncStatusMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5",
                  syncStatusMessage.type === 'success' && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40",
                  syncStatusMessage.type === 'error' && "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40",
                  syncStatusMessage.type === 'info' && "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                )}
              >
                {syncStatusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                {syncStatusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                {syncStatusMessage.type === 'info' && <CalendarCheck2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                <div className="flex-1">{syncStatusMessage.text}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Information Notice */}
          {!accessToken && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-2xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-extrabold">{t('noEmailConfirmationNeeded')}</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  {t('googleAuthNotice')}
                </p>
              </div>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs",
                accessToken ? "bg-emerald-500" : "bg-amber-500"
              )}>
                {accessToken ? <Check className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {t('googleAccount')}
                </p>
                <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                  {user?.email || t('notLoggedIn')}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  {t('syncStatusLabel')} {accessToken ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('calendarAccessActive')}</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{t('connectionNotEstablished')}</span>
                  )}
                </p>
              </div>
            </div>

            {!accessToken ? (
              <div className="flex flex-col sm:flex-row gap-2">
                {popupBlocked && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{t('openInNewTab')}</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>{t('connectGoogleCalendar')}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              >
                {t('disconnectCalendar')}
              </button>
            )}
          </div>

          {/* Configuration Area (when connected) */}
          {accessToken && (
            <div className="space-y-4">
              {/* Calendar Selector Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{t('whichCalendarToAdd')}</span>
                  {isLoadingCals && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
                </label>
                <div className="relative">
                  <select
                    value={selectedCalId}
                    onChange={(e) => handleSaveSettings(e.target.value, autoSync)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {calendars.length === 0 ? (
                      <option value="primary">{t('primaryGmailCalendar')}</option>
                    ) : (
                      calendars.map(cal => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary} {cal.primary ? `(${t('primaryGmailCalendar')})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {t('recurringEventsNote')}
                </p>
              </div>

              {/* Auto-Sync Toggle */}
              <div className="p-4 bg-gray-50/70 dark:bg-gray-850/60 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">
                    {t('autoSyncLabel')}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('autoSyncDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSettings(selectedCalId, !autoSync)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none",
                    autoSync ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-1 ml-1",
                      autoSync ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* 1-Day Alarm & Reminder Information Card */}
              <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-2.5">
                <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {t('autoReminderSettings')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900/60 rounded-xl border border-blue-100/60 dark:border-blue-900/30">
                    <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{t('calendarPhoneAlarm')}</p>
                      <p className="text-[10px] text-gray-500">{t('calendarPhoneAlarmDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900/60 rounded-xl border border-blue-100/60 dark:border-blue-900/30">
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{t('gmailEmailAlarm')}</p>
                      <p className="text-[10px] text-gray-500">{t('gmailEmailAlarmDesc')}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  {t('rruleNote')}
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setSyncTab('subscriptions')}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    syncTab === 'subscriptions'
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  )}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t('subscriptions')} ({activeSubsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncTab('regularPayments')}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    syncTab === 'regularPayments'
                      ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  )}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{t('regularPaymentsTitle', 'Düzenli')} ({activeRegularPaymentsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncTab('installments')}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    syncTab === 'installments'
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  )}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{t('installments')} ({activeInstallmentsCount})</span>
                </button>
              </div>

              {/* Sync Statistics */}
              <div className="flex items-center justify-between text-xs px-1 text-gray-600 dark:text-gray-400 font-bold">
                <span>{t('syncStatusLabel')}</span>
                {syncTab === 'subscriptions' ? (
                  <span className={cn(
                    "font-bold",
                    allSubsSynced ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                  )}>
                    {syncedSubsCount} / {activeSubsCount} {t('activeSubsInCalendar')}
                  </span>
                ) : syncTab === 'regularPayments' ? (
                  <span className={cn(
                    "font-bold",
                    allRegularPaymentsSynced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    {syncedRegularPaymentsCount} / {activeRegularPaymentsCount} {language === 'tr' ? 'takvimde senkronize' : 'synced in calendar'}
                  </span>
                ) : (
                  <span className={cn(
                    "font-bold",
                    allInstallmentsSynced ? "text-emerald-600 dark:text-emerald-400" : "text-purple-600 dark:text-purple-400"
                  )}>
                    {syncedInstallmentsCount} / {activeInstallmentsCount} {t('activeInstsInCalendar')}
                  </span>
                )}
              </div>

              {/* Info Note for installments */}
              {syncTab === 'installments' && (
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl text-xs text-purple-900 dark:text-purple-200 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    {t('installmentCalendarInfoTitle')}
                  </p>
                  <p className="text-[11px] leading-relaxed text-purple-700 dark:text-purple-300/80">
                    {t('installmentCalendarInfoDesc')}
                  </p>
                </div>
              )}

              {/* Info Note for regular payments */}
              {syncTab === 'regularPayments' && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === 'tr' ? 'Kira, Fatura ve Sabit Düzenli Ödemeler' : 'Rent, Bills and Regular Payments'}</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80">
                    {language === 'tr' ? 'Ödeme günü gelmeden 1 gün önce Google Takvim üzerinden otomatik hatırlatma bildirimi gönderilir.' : 'A reminder will be sent via Google Calendar 1 day before the due date.'}
                  </p>
                </div>
              )}

              {/* Live Sync Progress Bar */}
              {syncProgress && (
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-blue-900 dark:text-blue-200">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      {t('syncingProgress')}: <strong>{syncProgress.subName}</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-blue-200/60 dark:bg-blue-900/60 rounded-md text-[11px]">
                      {syncProgress.current} / {syncProgress.total} (%{Math.round((syncProgress.current / syncProgress.total) * 100)})
                    </span>
                  </div>
                  <div className="w-full bg-blue-200/70 dark:bg-blue-900/60 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Details if any */}
              {lastErrors.length > 0 && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl space-y-1.5 text-xs text-rose-800 dark:text-rose-200">
                  <p className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-100">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    {t('errorDetails')} ({lastErrors.length}):
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-700 dark:text-rose-300 max-h-32 overflow-y-auto">
                    {lastErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 pt-1">
                    {t('expiredSessionTip')}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                {syncTab === 'subscriptions' ? (
                  <button
                    type="button"
                    onClick={handleSyncAllActive}
                    disabled={isSyncing || activeSubsCount === 0}
                    className={cn(
                      "flex-1 py-3.5 px-4 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer",
                      allSubsSynced 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25" 
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                    )}
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : allSubsSynced ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>
                      {isSyncing
                        ? `${t('syncingProgress')} (${syncProgress ? `${syncProgress.current}/${syncProgress.total}` : t('pleaseWait')})...`
                        : allSubsSynced
                          ? `${t('allSubsSyncedSuccess')} (${syncedSubsCount}/${activeSubsCount}) • ${t('resyncAllSubs')}`
                          : unsyncedSubsCount > 0 && syncedSubsCount > 0
                            ? `${t('addRemainingSubsToCalendar')} (${unsyncedSubsCount})`
                            : `${t('addAllSubsToCalendar')} (${activeSubsCount})`}
                    </span>
                  </button>
                ) : syncTab === 'regularPayments' ? (
                  <button
                    type="button"
                    onClick={handleSyncAllActiveRegularPayments}
                    disabled={isSyncing || activeRegularPaymentsCount === 0}
                    className={cn(
                      "flex-1 py-3.5 px-4 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer",
                      allRegularPaymentsSynced 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25" 
                        : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/25"
                    )}
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : allRegularPaymentsSynced ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <Receipt className="w-4 h-4" />
                    )}
                    <span>
                      {isSyncing
                        ? `${t('syncingProgress')} (${syncProgress ? `${syncProgress.current}/${syncProgress.total}` : t('pleaseWait')})...`
                        : allRegularPaymentsSynced
                          ? `${language === 'tr' ? 'Tüm Düzenli Ödemeler Takvimde' : 'All Regular Payments Synced'} (${syncedRegularPaymentsCount}/${activeRegularPaymentsCount})`
                          : unsyncedRegularPaymentsCount > 0 && syncedRegularPaymentsCount > 0
                            ? `${language === 'tr' ? 'Kalanları Takvime Ekle' : 'Add Remaining to Calendar'} (${unsyncedRegularPaymentsCount})`
                            : `${language === 'tr' ? 'Tüm Düzenli Ödemeleri Takvime Ekle' : 'Add All to Calendar'} (${activeRegularPaymentsCount})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSyncAllInstallments}
                    disabled={isSyncing || activeInstallmentsCount === 0}
                    className={cn(
                      "flex-1 py-3.5 px-4 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer",
                      allInstallmentsSynced 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25" 
                        : "bg-purple-600 hover:bg-purple-700 shadow-purple-500/25"
                    )}
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : allInstallmentsSynced ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <ShoppingBag className="w-4 h-4" />
                    )}
                    <span>
                      {isSyncing
                        ? `${t('syncingInstallmentsProgress')} (${syncProgress ? `${syncProgress.current}/${syncProgress.total}` : t('pleaseWait')})...`
                        : allInstallmentsSynced
                          ? `${t('allInstsSyncedSuccess')} (${syncedInstallmentsCount}/${activeInstallmentsCount}) • ${t('resyncAllInsts')}`
                          : unsyncedInstsCount > 0 && syncedInstallmentsCount > 0
                            ? `${t('addRemainingInstsToCalendar')} (${unsyncedInstsCount})`
                            : `${t('addAllInstsToCalendar')} (${activeInstallmentsCount})`}
                    </span>
                  </button>
                )}

                {isSyncing && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbortSyncRequested(true);
                      setIsSyncing(false);
                      setSyncProgress(null);
                      setSyncStatusMessage({
                        type: 'info',
                        text: t('syncStopped')
                      });
                    }}
                    className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-2xl font-bold text-xs transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/40"
                  >
                    {t('stopSync')}
                  </button>
                )}
              </div>

              {/* Items List based on Active Tab */}
              {syncTab === 'subscriptions' ? (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span>{t('subCalendarStatusHeader')}</span>
                    <span className="text-[11px] text-gray-400 font-normal">{t('canAddIndividually')}</span>
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {activeSubs.map(sub => {
                      const isPaidThisMonth = Boolean(
                        (payments && payments.some(p => p.subscriptionId === sub.id && p.date && p.date.startsWith(currentMonthStr))) ||
                        sub.lastPaidMonth === currentMonthStr
                      );
                      const isSubDueOrPast = sub.nextPaymentDate && sub.nextPaymentDate <= todayStr;
                      const isSubAutoPaid = Boolean(sub.isAutoPayment && (isSubDueOrPast || isPaidThisMonth));
                      const isSubPaid = isPaidThisMonth || isSubAutoPaid;

                      return (
                        <div 
                          key={sub.id}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-gray-900 dark:text-white truncate">{sub.name}</span>
                              <span className="text-[11px] font-semibold text-gray-500">${sub.amount}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">
                              {t('nextPaymentDate')}: {sub.nextPaymentDate?.split('T')[0] || '-'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isSubPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-bold text-[10px] flex items-center gap-1 shadow-xs" title={isSubAutoPaid ? t('autoPaidGreen') : t('paidThisMonthGreen')}>
                                <Check className="w-3 h-3 text-white" /> {isSubAutoPaid ? t('autoPaidGreen') : t('paidThisMonthGreen')}
                              </span>
                            ) : sub.calendarEventId ? (
                              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 rounded-md font-bold text-[10px] flex items-center gap-1">
                                <Check className="w-3 h-3 text-blue-600" /> {t('onCalendarBadge')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-md font-bold text-[10px]">
                                {t('notAddedBadge')}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSyncSingle(sub)}
                              disabled={singleSyncingId === sub.id || isSyncing}
                              className="px-2.5 py-1 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-[11px] border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              {singleSyncingId === sub.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Calendar className="w-3 h-3 text-blue-500" />
                              )}
                              <span>{sub.calendarEventId ? t('updateSingle') : t('addSingle')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : syncTab === 'regularPayments' ? (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span>{language === 'tr' ? 'Düzenli Ödemeler Takvim Durumu' : 'Regular Payments Calendar Status'}</span>
                    <span className="text-[11px] text-gray-400 font-normal">{t('canAddIndividually')}</span>
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {activeRegularPayments.map((reg: any) => {
                      const isRegDueOrPast = reg.nextPaymentDate && reg.nextPaymentDate <= todayStr;
                      const isPaidThisMonth = Boolean(
                        (reg.paidMonths && reg.paidMonths.includes(currentMonthStr)) ||
                        reg.lastPaidMonth === currentMonthStr
                      );
                      const isAutoPaidDue = Boolean(reg.isAutoPayment && (isRegDueOrPast || isPaidThisMonth));
                      const isRegPaid = isPaidThisMonth || isAutoPaidDue;

                      return (
                        <div 
                          key={reg.id}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-gray-900 dark:text-white truncate">{reg.name}</span>
                              <span className="text-[11px] font-semibold text-gray-500">${reg.amount}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">
                              {reg.payee ? `${reg.payee} • ` : ''}{reg.nextPaymentDate}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isRegPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-bold text-[10px] flex items-center gap-1 shadow-xs" title={isAutoPaidDue ? t('autoPaidGreen') : t('paidThisMonthGreen')}>
                                <Check className="w-3 h-3 text-white" /> {isAutoPaidDue ? t('autoPaidGreen') : t('paidThisMonthGreen')}
                              </span>
                            ) : reg.calendarEventId ? (
                              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-md font-bold text-[10px] flex items-center gap-1">
                                <Check className="w-3 h-3 text-amber-600" /> {t('onCalendarBadge')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md font-bold text-[10px]">
                                {t('notAddedBadge')}
                              </span>
                            )}
                            {onPayRegularPayment && !isRegPaid && (
                              <button
                                type="button"
                                onClick={() => onPayRegularPayment(reg.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg font-bold text-[10px] border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1 cursor-pointer"
                                title="Bu ayı ödendi olarak işaretle"
                              >
                                <Check className="w-3 h-3" />
                                <span>{language === 'tr' ? 'Öde' : 'Pay'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSyncSingleRegularPayment(reg)}
                              disabled={singleSyncingId === reg.id || isSyncing}
                              className="px-2.5 py-1 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-[11px] border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              {singleSyncingId === reg.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Calendar className="w-3 h-3 text-amber-500" />
                              )}
                              <span>{reg.calendarEventId ? t('updateSingle') : t('addSingle')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span>{t('instCalendarStatusHeader')}</span>
                    <span className="text-[11px] text-gray-400 font-normal">{t('canAddIndividually')}</span>
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {activeInstallments.map((inst: any) => {
                      const curNum = Math.min(inst.totalInstallments, (inst.paidInstallments || 0) + 1);
                      const remCount = Math.max(0, inst.totalInstallments - (inst.paidInstallments || 0));
                      const isInstDueOrPast = inst.nextPaymentDate && inst.nextPaymentDate <= todayStr;
                      const isPaidThisMonth = inst.lastPaidMonth === currentMonthStr;
                      const isAutoPaidDue = Boolean(inst.isAutoPayment && (isInstDueOrPast || isPaidThisMonth));
                      const isCompleted = (inst.paidInstallments || 0) >= inst.totalInstallments;
                      const isInstPaid = isPaidThisMonth || isAutoPaidDue || isCompleted;

                      return (
                        <div 
                          key={inst.id}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-gray-900 dark:text-white truncate">{inst.name}</span>
                              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded-md">
                                {curNum}. / {inst.totalInstallments}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-500">${inst.monthlyAmount}/{language === 'tr' ? 'ay' : 'mo'}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">
                              {inst.store} • {inst.nextPaymentDate} ({remCount} {t('months')})
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isInstPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-bold text-[10px] flex items-center gap-1 shadow-xs" title={isCompleted ? 'Tamamlandı' : isAutoPaidDue ? t('autoPaidGreen') : t('paidThisMonthGreen')}>
                                <Check className="w-3 h-3 text-white" /> {isCompleted ? (language === 'tr' ? 'Tamamlandı' : 'Completed') : isAutoPaidDue ? t('autoPaidGreen') : t('paidThisMonthGreen')}
                              </span>
                            ) : inst.calendarEventId ? (
                              <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50 rounded-md font-bold text-[10px] flex items-center gap-1">
                                <Check className="w-3 h-3 text-purple-600" /> {t('onCalendarBadge')} ({inst.calendarEventIds?.length || remCount} {t('months')})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-md font-bold text-[10px]">
                                {t('notAddedBadge')}
                              </span>
                            )}
                            {onPayInstallment && !isInstPaid && (
                              <button
                                type="button"
                                onClick={() => onPayInstallment(inst.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg font-bold text-[10px] border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1 cursor-pointer"
                                title="Bu ayın taksitini ödendi işaretle"
                              >
                                <Check className="w-3 h-3" />
                                <span>{language === 'tr' ? 'Öde' : 'Pay'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSyncSingleInstallment(inst)}
                              disabled={singleSyncingId === inst.id || isSyncing}
                              className="px-2.5 py-1 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-[11px] border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              {singleSyncingId === inst.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Calendar className="w-3 h-3 text-purple-500" />
                              )}
                              <span>{inst.calendarEventId ? t('updateSingle') : t('addSingle')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-850/60 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('openGoogleCalendar')}</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
          >
            {t('doneBtn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
