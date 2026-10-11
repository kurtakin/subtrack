import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'motion/react';
import emailjs from '@emailjs/browser';
import { format } from 'date-fns';
import { BellRing, Coins, Globe, Mail, CheckCircle2, AlertCircle, XCircle, Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { CURRENCY_OPTIONS } from '../constants';
import { cn } from '../lib/utils';

export const NotificationSettingsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user, profile } = useContext(AuthContext);
  const [settings, setSettings] = useState({
    browserNotifications: false,
    emailNotifications: false,
    notifyDaysBefore: 3
  });
  const [selectedCurrency, setSelectedCurrency] = useState('CAD');
  const [testStatus, setTestStatus] = useState<{ type: 'browser' | 'email', status: 'loading' | 'success' | 'error', message?: string } | null>(null);

  useEffect(() => {
    if (profile?.notificationSettings) {
      setSettings(profile.notificationSettings);
    }
    if (profile?.currency) {
      setSelectedCurrency(profile.currency);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationSettings: settings,
        currency: selectedCurrency
      });
      if (settings.browserNotifications && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const testBrowserNotification = async () => {
    setTestStatus({ type: 'browser', status: 'loading' });
    try {
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('İzin reddedildi');
        }
      }
      new Notification('SubTrack Bildirimi', {
        body: 'Bu SubTrack uygulamasından gelen bir test bildirimidir!',
        icon: '/favicon.ico'
      });
      setTestStatus({ type: 'browser', status: 'success' });
    } catch (error: any) {
      setTestStatus({ type: 'browser', status: 'error', message: error.message });
    }
  };

  const testEmailNotification = async () => {
    if (!user) return;
    setTestStatus({ type: 'email', status: 'loading' });
    
    if (!import.meta.env.VITE_EMAILJS_SERVICE_ID || 
        !import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 
        !import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
      setTestStatus({ type: 'email', status: 'error', message: '.env dosyasında EmailJS anahtarları tanımlı değil' });
      return;
    }

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_name: user.displayName,
          to_email: user.email,
          sub_name: 'Test Abonelik',
          amount: '9.99',
          due_date: format(new Date(), 'MMM d, yyyy'),
          days_left: settings.notifyDaysBefore
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      setTestStatus({ type: 'email', status: 'success' });
    } catch (error: any) {
      setTestStatus({ type: 'email', status: 'error', message: error.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
          <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
            <BellRing className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Alarm & Bildirim Ayarları
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Tercih Edilen Para Birimi</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tüm abonelik ve harcama tutarları için geçerlidir</p>
              </div>
            </div>
            <select 
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              {CURRENCY_OPTIONS.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} ({curr.symbol}) - {curr.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Tarayıcı Bildirimleri</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tarayıcınızda bildirim alın</p>
                </div>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, browserNotifications: !settings.browserNotifications })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                  settings.browserNotifications ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  settings.browserNotifications ? "left-7" : "left-1"
                )} />
              </button>
            </div>
            {settings.browserNotifications && (
              <button 
                onClick={testBrowserNotification}
                disabled={testStatus?.type === 'browser' && testStatus.status === 'loading'}
                className="w-full py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {testStatus?.type === 'browser' && testStatus.status === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : <Sparkles className="w-4 h-4" />}
                Tarayıcı Bildirimini Test Et
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">E-Posta Bildirimleri</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hatırlatıcıları e-posta ile alın</p>
                </div>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                  settings.emailNotifications ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  settings.emailNotifications ? "left-7" : "left-1"
                )} />
              </button>
            </div>
            {settings.emailNotifications && (
              <button 
                onClick={testEmailNotification}
                disabled={testStatus?.type === 'email' && testStatus.status === 'loading'}
                className="w-full py-2 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {testStatus?.type === 'email' && testStatus.status === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : <Sparkles className="w-4 h-4" />}
                E-Posta Bildirimini Test Et
              </button>
            )}
          </div>

          {testStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-3 rounded-xl text-sm font-medium flex items-center gap-2",
                testStatus.status === 'success' ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : 
                testStatus.status === 'error' ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
              )}
            >
              {testStatus.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                testStatus.status === 'error' ? <AlertCircle className="w-4 h-4" /> : null}
              {testStatus.status === 'success' ? 'Test başarılı!' :
                testStatus.status === 'error' ? `Hata: ${testStatus.message}` : 'Test gönderiliyor...'}
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kaç gün önce haber verilsin?</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="14" 
                value={settings.notifyDaysBefore}
                onChange={(e) => setSettings({ ...settings, notifyDaysBefore: parseInt(e.target.value) })}
                className="flex-1 accent-blue-600"
              />
              <span className="w-12 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 py-1 rounded-lg">
                {settings.notifyDaysBefore}g
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none cursor-pointer"
          >
            Ayarları Kaydet
          </button>
        </div>
      </motion.div>
    </div>
  );
};
