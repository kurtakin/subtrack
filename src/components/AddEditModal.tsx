import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Wand2, Sparkles, Calendar, Zap, AlertCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subscription, OperationType, FirestoreErrorInfo } from '../types';
import { AuthContext } from '../context/AuthContext';
import { CATEGORIES, ICON_OPTIONS, ICON_MAP, getCurrencySymbol } from '../constants';
import { getLocalizedCategoryName } from '../utils/categoryTranslator';
import {
  syncEventToGoogleCalendar,
  deleteGoogleCalendarEvent,
  getCachedAccessToken
} from '../services/googleCalendar';
import { cn } from '../lib/utils';
import { useTranslation } from '../context/LanguageContext';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const AddEditModal = ({ 
  isOpen, 
  onClose, 
  sub,
  onSave,
  existingSubscriptions = []
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  sub?: Subscription | null,
  onSave?: (sub: Subscription) => void,
  existingSubscriptions?: Subscription[]
}) => {
  const { user, profile } = useContext(AuthContext);
  const { t, language } = useTranslation();
  const currencySymbol = getCurrencySymbol(profile?.currency);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Entertainment',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    nextPaymentDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'active' as 'active' | 'cancelled',
    icon: 'tag',
    pricingType: 'fixed' as 'fixed' | 'usage_based' | 'hybrid'
  });

  useEffect(() => {
    if (sub) {
      setFormData({
        name: sub.name,
        amount: sub.amount.toString(),
        category: sub.category,
        billingCycle: sub.billingCycle,
        nextPaymentDate: sub.nextPaymentDate.split('T')[0],
        status: sub.status,
        icon: sub.icon || 'tag',
        pricingType: sub.pricingType || 'fixed'
      });
      setSyncToCalendar(!!sub.calendarEventId || true);
    } else {
      setFormData({
        name: '',
        amount: '',
        category: 'Entertainment',
        billingCycle: 'monthly',
        nextPaymentDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'active',
        icon: 'tag',
        pricingType: 'fixed'
      });
      setSyncToCalendar(true);
    }
    setDuplicateError(null);
  }, [sub, isOpen]);

  const matchIconHeuristic = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('netflix') || n.includes('disney') || n.includes('hbo') || n.includes('prime video') || n.includes('tv') || n.includes('cinema') || n.includes('blutv') || n.includes('exxen') || n.includes('bein') || n.includes('youtube')) return 'tv';
    if (n.includes('spotify') || n.includes('apple music') || n.includes('deezer') || n.includes('tidal') || n.includes('music')) return 'music';
    if (n.includes('electric') || n.includes('elektrik') || n.includes('su') || n.includes('gaz') || n.includes('utility') || n.includes('enerji')) return 'zap';
    if (n.includes('wifi') || n.includes('internet') || n.includes('turknet') || n.includes('ttnet') || n.includes('superonline')) return 'wifi';
    if (n.includes('turkcell') || n.includes('vodafone') || n.includes('telekom') || n.includes('mobile') || n.includes('gsm') || n.includes('phone')) return 'smartphone';
    if (n.includes('gym') || n.includes('fitness') || n.includes('spor') || n.includes('macfit') || n.includes('dumbbell') || n.includes('goodlife')) return 'dumbbell';
    if (n.includes('coffee') || n.includes('starbucks') || n.includes('food') || n.includes('yemek') || n.includes('getir') || n.includes('trendyol yemek')) return 'coffee';
    if (n.includes('amazon') || n.includes('trendyol') || n.includes('hepsiburada') || n.includes('shop')) return 'shopping-cart';
    if (n.includes('cloud') || n.includes('aws') || n.includes('google cloud') || n.includes('azure') || n.includes('icloud') || n.includes('drive') || n.includes('dropbox') || n.includes('openai') || n.includes('chatgpt') || n.includes('claude') || n.includes('midjourney') || n.includes('github')) return 'cloud';
    if (n.includes('steam') || n.includes('playstation') || n.includes('xbox') || n.includes('game') || n.includes('nintendo') || n.includes('epic')) return 'gamepad2';
    if (n.includes('car') || n.includes('uber') || n.includes('taksi') || n.includes('araba') || n.includes('otopark') || n.includes('akaryakit')) return 'car';
    if (n.includes('rent') || n.includes('kira') || n.includes('home') || n.includes('ev') || n.includes('aidat')) return 'home';
    if (n.includes('health') || n.includes('saglik') || n.includes('sigorta') || n.includes('doktor')) return 'heart';
    if (n.includes('vpn') || n.includes('antivirus') || n.includes('shield') || n.includes('security') || n.includes('1password') || n.includes('bitwarden')) return 'shield';
    if (n.includes('book') || n.includes('audible') || n.includes('kitap') || n.includes('kurs') || n.includes('udemy') || n.includes('coursera')) return 'book';
    if (n.includes('work') || n.includes('slack') || n.includes('zoom') || n.includes('jira') || n.includes('notion') || n.includes('figma')) return 'briefcase';
    return 'tag';
  };

  const handleSuggestIcon = async () => {
    if (!formData.name) return;
    setIsSuggesting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (apiKey) {
        try {
          const prompt = `Given the subscription name "${formData.name}", pick the most appropriate icon ID from this list: ${ICON_OPTIONS.map(o => o.id).join(', ')}. Return ONLY the ID string.`;
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (res.ok) {
            const json = await res.json();
            const suggestedId = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
            if (suggestedId && ICON_MAP[suggestedId]) {
              setFormData(prev => ({ ...prev, icon: suggestedId }));
              return;
            }
          }
        } catch {
          // fallback to heuristic
        }
      }
      
      const heuristicIcon = matchIconHeuristic(formData.name);
      setFormData(prev => ({ ...prev, icon: heuristicIcon }));
    } catch (error) {
      console.error('Failed to suggest icon:', error);
      const fallbackIcon = matchIconHeuristic(formData.name);
      setFormData(prev => ({ ...prev, icon: fallbackIcon }));
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check duplicate subscription in same list/month
    const cleanName = formData.name.trim().toLowerCase();
    const isDuplicate = existingSubscriptions.some(
      s => s.id !== sub?.id && s.name.trim().toLowerCase() === cleanName
    );
    if (isDuplicate) {
      setDuplicateError(
        language === 'tr'
          ? `"${formData.name.trim()}" aboneliği zaten listenizde kayıtlı! Aynı ay ve aynı aboneliğin birden fazla eklenmesine izin verilmemektedir. Ek harcamalar için abonelik kartı üzerindeki "+ Ek Ödeme (Top-up)" seçeneğini kullanabilirsiniz.`
          : `"${formData.name.trim()}" subscription is already in your list! Adding the same subscription multiple times is not permitted. Please use "+ Extra Payment (Top-up)" on the subscription card for additional charges.`
      );
      return;
    }

    setDuplicateError(null);
    const data = {
      uid: user.uid,
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      category: formData.category,
      billingCycle: formData.billingCycle,
      nextPaymentDate: new Date(formData.nextPaymentDate).toISOString(),
      status: formData.status,
      icon: formData.icon,
      pricingType: formData.pricingType
    };

    const subId = sub?.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const existingEventId = sub?.calendarEventId;

    // Immediately call onSave so user never loses their subscription
    if (onSave) {
      onSave({ id: subId, ...data, calendarEventId: existingEventId });
    }

    try {
      // Save/merge to Firestore in background
      setDoc(doc(db, 'subscriptions', subId), { ...data, id: subId }, { merge: true }).catch((err: any) => {
        console.warn('Could not persist subscription to Firestore (working in local cache):', err);
      });

      const token = getCachedAccessToken();
      const calendarId = profile?.calendarSettings?.calendarId || 'primary';

      if (token && subId) {
        if (syncToCalendar && formData.status === 'active') {
          try {
            const calResult = await syncEventToGoogleCalendar(
              token,
              calendarId,
              {
                id: subId,
                name: data.name,
                amount: data.amount,
                currency: profile?.currency || 'CAD',
                category: data.category,
                billingCycle: data.billingCycle,
                nextPaymentDate: data.nextPaymentDate,
                status: data.status,
                isAutoPayment: data.isAutoPayment,
                note: data.note
              },
              existingEventId
            );
            setDoc(doc(db, 'subscriptions', subId), {
              calendarEventId: calResult.eventId,
              calendarSyncedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
            if (onSave) {
              onSave({ id: subId, ...data, calendarEventId: calResult.eventId, calendarSyncedAt: new Date().toISOString() });
            }
          } catch (calErr) {
            console.error('Failed to sync to Google Calendar:', calErr);
          }
        } else if (existingEventId && (!syncToCalendar || formData.status === 'cancelled')) {
          try {
            await deleteGoogleCalendarEvent(token, calendarId, existingEventId);
            setDoc(doc(db, 'subscriptions', subId), {
              calendarEventId: null
            }, { merge: true }).catch(() => {});
          } catch (delErr) {
            console.error('Failed to delete event from calendar:', delErr);
          }
        }
      }
      onClose();
    } catch (error) {
      console.warn('Subscription save background error:', error);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl my-8 border border-gray-100 dark:border-gray-800"
      >
        <h2 className="text-2xl font-bold mb-6 dark:text-white">
          {sub ? t('edit') : t('newSubscription')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('serviceName')}</label>
            <div className="flex gap-2">
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white font-medium"
                placeholder="OpenAI, Midjourney, Claude, Netflix, AWS..."
              />
              <button
                type="button"
                onClick={handleSuggestIcon}
                disabled={isSuggesting || !formData.name}
                className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors cursor-pointer"
                title={t('suggestIcon')}
              >
                {isSuggesting ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Wand2 className="w-5 h-5" /></motion.div>
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {t('pricingModel')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, pricingType: 'fixed' })}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer",
                  formData.pricingType === 'fixed'
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <div className="text-xs uppercase font-extrabold tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {t('fixedPlan')}
                </div>
                <div className="text-[11px] leading-tight opacity-75">{t('fixedPlanDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, pricingType: 'hybrid' })}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer",
                  formData.pricingType === 'hybrid'
                    ? "border-amber-600 bg-amber-50/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <div className="text-xs uppercase font-extrabold tracking-wider mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  {t('hybridPlan')}
                </div>
                <div className="text-[11px] leading-tight opacity-75">{t('hybridPlanDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, pricingType: 'usage_based' })}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer",
                  formData.pricingType === 'usage_based'
                    ? "border-purple-600 bg-purple-50/60 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <div className="text-xs uppercase font-extrabold tracking-wider mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  {t('usageBasedPlan')}
                </div>
                <div className="text-[11px] leading-tight opacity-75">{t('usageBasedPlanDesc')}</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('chooseIcon')}</label>
            <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl max-h-32 overflow-y-auto">
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: opt.id })}
                    className={cn(
                      "p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                      formData.icon === opt.id 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20" 
                        : "text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {formData.pricingType === 'usage_based' ? `${t('averageExpense')} (${currencySymbol})` : `${t('amount')} (${currencySymbol})`}
              </label>
              <input 
                required
                type="number" 
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white font-bold"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('billingCycle')}
              </label>
              <select 
                value={formData.billingCycle}
                onChange={e => setFormData({ ...formData, billingCycle: e.target.value as 'monthly' | 'yearly' })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white cursor-pointer font-medium"
              >
                <option value="monthly">{t('monthly')}</option>
                <option value="yearly">{t('yearly')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('category')}</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white cursor-pointer font-medium"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{getLocalizedCategoryName(c, t)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {formData.pricingType === 'usage_based' ? t('estNextCharge') : t('nextPaymentDate')}
            </label>
            <input 
              required
              type="date" 
              value={formData.nextPaymentDate}
              onChange={e => setFormData({ ...formData, nextPaymentDate: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white font-medium"
            />
            {formData.pricingType === 'usage_based' && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                * {t('usageBasedPlanDesc')}
              </p>
            )}
          </div>

          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {t('addToCalendar')}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t('calendarAlarmNote')}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={syncToCalendar}
              onChange={e => setSyncToCalendar(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {duplicateError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {duplicateError}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/20 cursor-pointer"
            >
              {sub ? t('save') : t('add')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
