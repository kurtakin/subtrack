import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import {
  Clock,
  XCircle,
  Plus,
  Zap,
  Calendar,
  CheckCircle2,
  Trash2,
  CreditCard
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subscription, Payment, OperationType, FirestoreErrorInfo } from '../types';
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

export const PaymentHistoryModal = ({ 
  isOpen, 
  onClose, 
  sub, 
  onConfirmAction 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  sub: Subscription | null, 
  onConfirmAction: (options: { title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'info' }) => void 
}) => {
  const { user, profile } = useContext(AuthContext);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'topup'>('all');
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'topup' as 'regular' | 'topup',
    note: ''
  });

  useEffect(() => {
    if (!user || !sub || !isOpen) return;
    const q = query(
      collection(db, 'subscriptions', sub.id, 'payments'),
      where('uid', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      setPayments(p.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `subscriptions/${sub.id}/payments`);
    });
    return () => unsubscribe();
  }, [user, sub, isOpen]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sub || !newPayment.amount) return;
    try {
      await addDoc(collection(db, 'subscriptions', sub.id, 'payments'), {
        uid: user.uid,
        subscriptionId: sub.id,
        amount: parseFloat(newPayment.amount),
        date: new Date(newPayment.date).toISOString(),
        status: 'paid',
        type: newPayment.type,
        note: newPayment.note.trim() || (newPayment.type === 'topup' ? 'Ek Limit / Harcama' : 'Plan Ödemesi')
      });
      setIsAdding(false);
      setNewPayment({ 
        amount: '', 
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'topup',
        note: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subscriptions/${sub.id}/payments`);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!sub) return;
    onConfirmAction({
      title: 'Ödeme Kaydını Sil',
      message: 'Bu ödeme kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'subscriptions', sub.id, 'payments', paymentId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `subscriptions/${sub.id}/payments`);
        }
      }
    });
  };

  const filteredPayments = useMemo(() => {
    if (filterType === 'all') return payments;
    if (filterType === 'topup') return payments.filter(p => p.type === 'topup');
    return payments.filter(p => p.type !== 'topup');
  }, [payments, filterType]);

  const totals = useMemo(() => {
    let regularTotal = 0;
    let topupTotal = 0;
    payments.forEach(p => {
      if (p.type === 'topup') {
        topupTotal += p.amount;
      } else {
        regularTotal += p.amount;
      }
    });
    return {
      all: regularTotal + topupTotal,
      regular: regularTotal,
      topup: topupTotal
    };
  }, [payments]);

  if (!isOpen || !sub) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Ödeme ve Harcama Geçmişi
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{sub.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 pt-4 pb-2 bg-gray-50/50 dark:bg-gray-800/30 flex gap-2 border-b border-gray-100 dark:border-gray-800 text-xs font-bold">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
              filterType === 'all'
                ? "bg-blue-600 text-white"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            Tümü ({payments.length})
          </button>
          <button
            onClick={() => setFilterType('topup')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer",
              filterType === 'topup'
                ? "bg-amber-500 text-white"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            )}
          >
            <Zap className="w-3 h-3" />
            Ek Harcamalar ({payments.filter(p => p.type === 'topup').length})
          </button>
          <button
            onClick={() => setFilterType('regular')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
              filterType === 'regular'
                ? "bg-blue-600 text-white"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            Plan Ödemeleri ({payments.filter(p => p.type !== 'topup').length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isAdding ? (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleAddPayment} 
              className="bg-blue-50/70 dark:bg-blue-900/20 p-5 rounded-2xl space-y-4 border border-blue-100 dark:border-blue-900/30"
            >
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewPayment({ ...newPayment, type: 'topup' })}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    newPayment.type === 'topup'
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Ek Harcama / Limit Dolumu
                </button>
                <button
                  type="button"
                  onClick={() => setNewPayment({ ...newPayment, type: 'regular' })}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    newPayment.type === 'regular'
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Plan / Düzenli Fatura
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Tutar ({getCurrencySymbol(profile?.currency)})</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Tarih</label>
                  <input 
                    required
                    type="date" 
                    value={newPayment.date}
                    onChange={e => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Açıklama / Not (Opsiyonel)
                </label>
                <input 
                  type="text" 
                  value={newPayment.note}
                  onChange={e => setNewPayment({ ...newPayment, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-sm"
                  placeholder={newPayment.type === 'topup' ? "Örn: Limit aşımı, 500k token, API yüklemesi" : "Örn: Aylık yenileme"}
                />
                {newPayment.type === 'topup' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Limit Aşımı', 'API Kredisi', 'Ekstra Kullanım', 'Kota Dolumu'].map(quickChip => (
                      <button
                        key={quickChip}
                        type="button"
                        onClick={() => setNewPayment({ ...newPayment, note: quickChip })}
                        className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:border-amber-400 cursor-pointer"
                      >
                        +{quickChip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit"
                  className={cn(
                    "flex-1 py-2 text-sm text-white font-bold rounded-lg transition-colors shadow-md cursor-pointer",
                    newPayment.type === 'topup' ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none"
                  )}
                >
                  Kaydı Ekle
                </button>
              </div>
            </motion.form>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 font-bold hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5 text-amber-500" />
              <span>Yeni Ödeme / Ek Harcama Kaydı Ekle</span>
            </button>
          )}

          <div className="space-y-3">
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => {
                const isTopUp = payment.type === 'topup';
                return (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl group hover:bg-white dark:hover:bg-gray-800 hover:shadow-md hover:ring-1 hover:ring-gray-100 dark:hover:ring-gray-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        isTopUp 
                          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" 
                          : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      )}>
                        {isTopUp ? <Zap className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount, profile?.currency)}
                          </p>
                          {isTopUp ? (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold rounded-md flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" />
                              Ek Harcama
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-[10px] font-extrabold rounded-md">
                              Plan
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{format(parseISO(payment.date), 'dd MMMM yyyy')}</span>
                          {payment.note && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">{payment.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeletePayment(payment.id)}
                      className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mx-auto mb-4">
                  <CreditCard className="w-8 h-8" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Bu filtrede ödeme kaydı bulunamadı</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Yukarıdaki butonla hızlıca ekleyebilirsiniz</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Sabit Plan Ödemeleri: <strong className="text-gray-700 dark:text-gray-200">{formatCurrency(totals.regular, profile?.currency)}</strong></span>
            <span>Ek Harcamalar / Limit: <strong className="text-amber-600 dark:text-amber-400">{formatCurrency(totals.topup, profile?.currency)}</strong></span>
          </div>
          <div className="flex justify-between items-center text-sm pt-1 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-bold">Toplam Ödenen</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">
              {formatCurrency(totals.all, profile?.currency)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
