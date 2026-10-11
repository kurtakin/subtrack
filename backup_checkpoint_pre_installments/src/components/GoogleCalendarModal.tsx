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
  CalendarCheck2
} from 'lucide-react';
import {
  connectGoogleCalendar,
  fetchGoogleCalendars,
  syncEventToGoogleCalendar,
  getCachedAccessToken,
  setCachedAccessToken,
  GoogleCalendarItem
} from '../services/googleCalendar';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  subscriptions: any[];
  onConfirmAction: (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info';
    confirmText?: string;
  }) => void;
  onUpdateSubscription?: (sub: any) => void;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  subscriptions,
  onConfirmAction,
  onUpdateSubscription
}) => {
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
  const [abortSyncRequested, setAbortSyncRequested] = useState(false);
  const [singleSyncingId, setSingleSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; subName: string } | null>(null);
  const [lastErrors, setLastErrors] = useState<string[]>([]);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

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
      if (err.message?.includes('Oturum süresi') || err.message?.includes('401')) {
        setAccessToken(null);
        setCachedAccessToken(null);
      }
      setSyncStatusMessage({
        type: 'error',
        text: err.message || 'Takvim listesi alınırken hata oluştu.'
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
          'calendarSettings.calendarName': 'Ana Gmail Takvimi',
          'calendarSettings.autoSync': autoSync,
          'calendarSettings.lastConnectedAt': new Date().toISOString()
        });
      }
      setSyncStatusMessage({
        type: 'success',
        text: 'Google Takvim başarıyla bağlandı! Artık abonelikleriniz takviminize eklenebilir.'
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
          text: 'Tarayıcınız Google izin onay penceresini (pop-up) engelledi. E-posta gelmez; lütfen adres çubuğundaki kilit simgesinden açılır pencerelere izin verin veya aşağıdaki butona tıklayarak uygulamayı yeni sekmede açın.'
        });
        return;
      }
      setSyncStatusMessage({
        type: 'error',
        text: err.message || 'Google Takvim bağlantısı sağlanamadı. Lütfen tekrar deneyin.'
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
        'calendarSettings.calendarName': targetCal?.summary || 'Gmail Takvimi',
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

      // Non-blocking firestore sync (never hangs)
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
        text: `"${sub.name}" Google Takvim'e başarıyla eklendi! (1 gün öncesine alarmlı)`
      });
    } catch (err: any) {
      console.error(`Error syncing sub ${sub.name}:`, err);
      setSyncStatusMessage({
        type: 'error',
        text: `"${sub.name}" aktarılamadı: ${err.message}`
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
        text: 'Senkronize edilecek aktif abonelik bulunmuyor.'
      });
      return;
    }

    const selectedCalSummary = calendars.find(c => c.id === selectedCalId)?.summary || 'Seçili Takvim';
    onConfirmAction({
      title: 'Google Takvime Senkronize Et',
      message: `${activeSubs.length} adet aktif aboneliğiniz "${selectedCalSummary}" takviminize 1 gün öncesine alarmlı olarak eklenecek/güncellenecektir. Onaylıyor musunuz?`,
      confirmText: 'Takvime Ekle & Senkronize Et',
      variant: 'info',
      onConfirm: async () => {
        setIsSyncing(true);
        setAbortSyncRequested(false);
        setLastErrors([]);
        setSyncProgress({ current: 0, total: activeSubs.length, subName: 'Başlatılıyor...' });

        let successCount = 0;
        let failCount = 0;
        const errorList: string[] = [];

        for (let i = 0; i < activeSubs.length; i++) {
          const sub = activeSubs[i];
          setSyncProgress({ current: i + 1, total: activeSubs.length, subName: sub.name });
          setSyncStatusMessage({
            type: 'info',
            text: `Takvime aktarılıyor (${i + 1}/${activeSubs.length}): ${sub.name}...`
          });

          // Yield to let React re-render progress smoothly
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

            // Non-blocking firestore sync (never hangs)
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
            errorList.push(`${sub.name}: ${err.message || 'Hata'}`);
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
            text: `Tebrikler! ${successCount} adet aktif aboneliğin tümü Google Takviminize başarıyla aktarıldı (1 gün öncesine alarmlı).`
          });
        } else if (successCount > 0) {
          setSyncStatusMessage({
            type: 'info',
            text: `${successCount} abonelik başarıyla takvime eklendi, ${failCount} tanesinde sorun oluştu.`
          });
        } else {
          setSyncStatusMessage({
            type: 'error',
            text: `Aktarım tamamlanamadı (${failCount} hata). Lütfen Google bağlantısını kontrol edip tekrar deneyin.`
          });
        }
      }
    });
  };

  const handleDisconnect = async () => {
    onConfirmAction({
      title: 'Takvim Bağlantısını Kaldır',
      message: 'Google Takvim bağlantısını kaldırmak istediğinize emin misiniz? Mevcut takvim etkinlikleri silinmez, ancak otomatik senkronizasyon durdurulur.',
      confirmText: 'Bağlantıyı Kes',
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
          text: 'Google Takvim bağlantısı kesildi.'
        });
      }
    });
  };

  if (!isOpen) return null;

  const activeSubsCount = subscriptions.filter(s => s.status === 'active').length;
  const syncedSubsCount = subscriptions.filter(s => s.status === 'active' && s.calendarEventId).length;

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
                  Google Takvim Entegrasyonu
                </h2>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-bold text-[10px] rounded-md">
                  Gmail & Takvim
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Aylık ödemeleri seçtiğiniz Google Takvimine otomatik ekleyin, 1 gün öncesine alarm kurun.
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
                <p className="font-extrabold">E-Posta Onayı Gerekmez</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  Google Takvim bağlantısı için Gmail gelen kutunuza herhangi bir doğrulama e-postası <strong>gönderilmez</strong>. Aşağıdaki <strong>'Google Takvimi Bağla'</strong> butonuna bastığınızda ekranda açılan Google izin penceresini onaylamanız yeterlidir.
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
                  Google Hesabı
                </p>
                <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                  {user?.email || 'Giriş yapılmadı'}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Durum: {accessToken ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Takvim Erişimi Aktif</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Bağlantı Kurulmadı</span>
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
                    <span>Yeni Sekmede Aç</span>
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
                  <span>Google Takvimi Bağla</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              >
                Bağlantıyı Kes
              </button>
            )}
          </div>

          {/* Configuration Area (when connected) */}
          {accessToken && (
            <div className="space-y-4">
              {/* Calendar Selector Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Hangi Takvime Eklensin?</span>
                  {isLoadingCals && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
                </label>
                <div className="relative">
                  <select
                    value={selectedCalId}
                    onChange={(e) => handleSaveSettings(e.target.value, autoSync)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {calendars.length === 0 ? (
                      <option value="primary">Ana Gmail Takvimi (primary)</option>
                    ) : (
                      calendars.map(cal => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary} {cal.primary ? '(Ana Gmail Takvimi)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Seçtiğiniz takvime her ay otomatik yinelenen ödeme etkinlikleri eklenir.
                </p>
              </div>

              {/* Auto-Sync Toggle */}
              <div className="p-4 bg-gray-50/70 dark:bg-gray-850/60 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">
                    Otomatik Senkronizasyon
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Yeni bir abonelik eklediğinizde veya tarihi güncellediğinizde takvime otomatik yansıtılır
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
                  Otomatik 1 Gün Öncesi Alarm Ayarları
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900/60 rounded-xl border border-blue-100/60 dark:border-blue-900/30">
                    <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Takvim & Telefon Alarmı</p>
                      <p className="text-[10px] text-gray-500">1 gün önce (1440 dk) açılır bildirim</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900/60 rounded-xl border border-blue-100/60 dark:border-blue-900/30">
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Gmail E-Posta Alarmı</p>
                      <p className="text-[10px] text-gray-500">1 gün önce e-posta uyarısı</p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  Etkinlikler Google Takvim kuralı (<code className="font-mono text-[10px] bg-blue-100/50 dark:bg-blue-900/40 px-1 py-0.5 rounded">RRULE:FREQ=MONTHLY</code>) ile her ay aynı tarihte otomatik olarak tekrarlanır.
                </p>
              </div>

              {/* Sync Statistics */}
              <div className="flex items-center justify-between text-xs px-1 text-gray-600 dark:text-gray-400 font-bold">
                <span>Senkronizasyon Durumu:</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {syncedSubsCount} / {activeSubsCount} Aktif Abonelik Takvimde
                </span>
              </div>

              {/* Live Sync Progress Bar */}
              {syncProgress && (
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-blue-900 dark:text-blue-200">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Aktarılıyor: <strong>{syncProgress.subName}</strong>
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
                    Karşılaşılan Sorun Detayları ({lastErrors.length}):
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-700 dark:text-rose-300 max-h-32 overflow-y-auto">
                    {lastErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 pt-1">
                    İpucu: Oturum süresi dolmuşsa yukarıdaki 'Bağlantıyı Kes' yapıp tekrar 'Google Takvimi Bağla' butonuna tıklayabilirsiniz.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSyncAllActive}
                  disabled={isSyncing || activeSubsCount === 0}
                  className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {isSyncing
                      ? `Takvime Aktarılıyor (${syncProgress ? `${syncProgress.current}/${syncProgress.total}` : 'Lütfen bekleyin'})...`
                      : `Tüm Aktif Abonelikleri Takvime Ekle (${activeSubsCount})`}
                  </span>
                </button>
                {isSyncing && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbortSyncRequested(true);
                      setIsSyncing(false);
                      setSyncProgress(null);
                      setSyncStatusMessage({
                        type: 'info',
                        text: 'Aktarım işlemi durduruldu.'
                      });
                    }}
                    className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-2xl font-bold text-xs transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/40"
                  >
                    Durdur
                  </button>
                )}
              </div>

              {/* Subscriptions List with Single Sync */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span>Abonelik Bazında Takvim Durumu</span>
                  <span className="text-[11px] text-gray-400 font-normal">Tek tek ekleyebilirsiniz</span>
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {subscriptions.filter(s => s.status === 'active').map(sub => (
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
                          Ödeme: {sub.nextPaymentDate?.split('T')[0] || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sub.calendarEventId ? (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-md font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Takvimde
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-md font-bold text-[10px]">
                            Eklenmedi
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
                          <span>{sub.calendarEventId ? 'Güncelle' : 'Ekle'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
            <span>Google Takvimi Aç</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </motion.div>
    </div>
  );
};
