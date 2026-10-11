import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Zap, Calendar, XCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subscription, OperationType, FirestoreErrorInfo } from '../types';
import { AuthContext } from '../context/AuthContext';
import { getCurrencySymbol, formatCurrency } from '../constants';
import { cn } from '../lib/utils';

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

export const QuickAddPaymentModal = ({
  isOpen,
  onClose,
  initialSub,
  subscriptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialSub: Subscription | null;
  subscriptions: Subscription[];
}) => {
  const { user, profile } = useContext(AuthContext);
  const currencySymbol = getCurrencySymbol(profile?.currency);
  const [selectedSubId, setSelectedSubId] = useState(initialSub?.id || subscriptions[0]?.id || '');
  const [paymentType, setPaymentType] = useState<'topup' | 'regular'>('topup');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSub) {
      setSelectedSubId(initialSub.id);
    } else if (subscriptions.length > 0 && (!selectedSubId || !subscriptions.some(s => s.id === selectedSubId))) {
      setSelectedSubId(subscriptions[0].id);
    }
  }, [initialSub, subscriptions, selectedSubId]);

  const QUICK_NOTES = [
    'Limit Aşımı',
    'Ek Kredi / Token',
    'Ekstra Kullanım',
    'Kota Dolumu',
    'Kredi Kartı Ek Çekimi'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSubId || !amount) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'subscriptions', selectedSubId, 'payments'), {
        uid: user.uid,
        subscriptionId: selectedSubId,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        status: 'paid',
        type: paymentType,
        note: note.trim() || (paymentType === 'topup' ? 'Ek Limit / Harcama' : 'Plan Ödemesi')
      });
      setAmount('');
      setNote('');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subscriptions/${selectedSubId}/payments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ek Ödeme / Harcama Ekle</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Limit bittiğinde yapılan ek çekimleri kaydedin</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Abonelik Seçin</label>
            <select
              value={selectedSubId}
              onChange={e => setSelectedSubId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
            >
              {subscriptions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatCurrency(s.amount, profile?.currency)}) {s.pricingType === 'usage_based' ? '• Kullandıkça' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Ödeme Türü</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('topup')}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                  paymentType === 'topup'
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Ek Limit / Çekim
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('regular')}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
                  paymentType === 'regular'
                    ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                Plan Yenilemesi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Çekilen Tutar ({currencySymbol})
              </label>
              <input 
                required
                type="number" 
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-extrabold focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="10.00"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                İşlem Tarihi
              </label>
              <input 
                required
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Açıklama / Sebep (Opsiyonel)
            </label>
            <input 
              type="text" 
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Örn: 200k ekstra token, Limit dolumu"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_NOTES.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setNote(chip)}
                  className="text-[11px] font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !amount}
              className="flex-1 py-3 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-200 dark:shadow-none cursor-pointer"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
