import React, { useState, useContext } from 'react';
import { motion } from 'motion/react';
import { parseISO, format } from 'date-fns';
import { Calendar, XCircle, CheckCircle2, AlertCircle, Sparkles, Zap, Trash2, Tag } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Payment, Subscription, OperationType, FirestoreErrorInfo } from '../types';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedNote } from '../utils/itemTranslator';
import { ICON_MAP, formatCurrency } from '../constants';
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

export const MonthDetailModal = ({
  isOpen,
  onClose,
  monthKey,
  allPayments,
  subscriptions,
  onConfirmAction
}: {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string | null;
  allPayments: Payment[];
  subscriptions: Subscription[];
  onConfirmAction: (options: { title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'info' }) => void;
}) => {
  const { profile } = useContext(AuthContext);
  const { t, language } = useTranslation();
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null);

  if (!isOpen || !monthKey) return null;

  const monthPayments = allPayments.filter(p => {
    if (!p.date) return false;
    try {
      const d = parseISO(p.date);
      return format(d, 'yyyy-MM') === monthKey;
    } catch {
      return false;
    }
  }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  let monthLabel = monthKey;
  try {
    monthLabel = format(parseISO(`${monthKey}-01`), 'MMMM yyyy');
  } catch {
    // fallback
  }

  const duplicateIds = new Set<string>();
  const seenPayments: { [key: string]: string } = {};
  let duplicateCount = 0;
  let duplicateExcessAmount = 0;

  monthPayments.forEach(p => {
    const key = (p.type === 'topup')
      ? `topup_${p.subscriptionId}_${p.date}_${p.amount}_${p.note || ''}`
      : `regular_${p.subscriptionId}`;
    if (seenPayments[key]) {
      duplicateIds.add(p.id);
      duplicateCount++;
      duplicateExcessAmount += p.amount;
    } else {
      seenPayments[key] = p.id;
    }
  });

  const monthTotal = monthPayments.reduce((acc, p) => acc + p.amount, 0);

  const handleCleanDuplicates = () => {
    if (duplicateIds.size === 0) return;
    onConfirmAction({
      title: t('cleanDuplicatesTitle', 'Clean Duplicate Records'),
      message: t('cleanDuplicatesConfirm', '{count} duplicate payment records ({amount}) will be deleted. Only 1 valid record per subscription will be kept. Do you confirm?')
        .replace('{count}', String(duplicateCount))
        .replace('{amount}', formatCurrency(duplicateExcessAmount, profile?.currency)),
      onConfirm: async () => {
        setIsCleaning(true);
        try {
          let count = 0;
          for (const pid of duplicateIds) {
            const payment = monthPayments.find(p => p.id === pid);
            if (payment) {
              await deleteDoc(doc(db, 'subscriptions', payment.subscriptionId, 'payments', pid));
              count++;
            }
          }
          setCleanSuccess(t('cleanDuplicatesSuccess', '{count} duplicate payments cleaned successfully!').replace('{count}', String(count)));
          setTimeout(() => setCleanSuccess(null), 4000);
        } catch (error) {
          console.error('Failed to clean duplicates:', error);
        } finally {
          setIsCleaning(false);
        }
      }
    });
  };

  const handleDeleteSingle = (payment: Payment) => {
    const sub = subscriptions.find(s => s.id === payment.subscriptionId);
    onConfirmAction({
      title: t('deletePaymentTitle', 'Delete Payment Record'),
      message: t('deletePaymentConfirmMessage', 'Are you sure you want to delete this payment of {amount} for {sub}?')
        .replace('{amount}', formatCurrency(payment.amount, profile?.currency))
        .replace('{sub}', sub?.name || t('subscription', 'Subscription')),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'subscriptions', payment.subscriptionId, 'payments', payment.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `subscriptions/${payment.subscriptionId}/payments`);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {monthLabel} - {t('monthDetailTitle', 'Payment & Spending Breakdown')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('monthDetailSubtitle', 'Listing {count} payments registered this month').replace('{count}', String(monthPayments.length))}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {cleanSuccess && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            {cleanSuccess}
          </div>
        )}

        {/* Duplicate Warning & One-Click Cleanup */}
        {duplicateCount > 0 && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {t('duplicatesFoundCount', '{count} duplicate records detected!').replace('{count}', String(duplicateCount))}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('duplicateExplanation', 'Due to auto-renewal sync, some subscriptions were recorded multiple times.')} {formatCurrency(duplicateExcessAmount, profile?.currency)}.
                </p>
              </div>
            </div>
            <button
              onClick={handleCleanDuplicates}
              disabled={isCleaning}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isCleaning ? t('cleaning', 'Cleaning...') : t('cleanDuplicates', 'Clean Duplicate Records')}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {monthPayments.length > 0 ? (
            monthPayments.map((p) => {
              const sub = subscriptions.find(s => s.id === p.subscriptionId);
              const Icon = sub ? (ICON_MAP[sub.icon] || Tag) : Tag;
              const isDuplicate = duplicateIds.has(p.id);
              const isTopUp = p.type === 'topup';

              return (
                <div 
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-2xl border transition-all group",
                    isDuplicate 
                      ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 ring-1 ring-amber-400/30" 
                      : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                      isDuplicate 
                        ? "bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                        : isTopUp 
                          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {sub?.name || t('deletedSubscription', 'Deleted Subscription')}
                        </span>
                        {isDuplicate && (
                          <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 text-[10px] font-extrabold rounded-md flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {t('duplicate', 'Duplicate')}
                          </span>
                        )}
                        {isTopUp && !isDuplicate && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold rounded-md flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" />
                            {t('extraUsage', 'Extra Usage')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span>{format(parseISO(p.date), 'dd MMMM yyyy')}</span>
                        {p.note && (
                          <>
                            <span>•</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{getLocalizedNote(p.note, language)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-gray-900 dark:text-white">
                      {formatCurrency(p.amount, profile?.currency)}
                    </span>
                    <button
                      onClick={() => handleDeleteSingle(p)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                      title={t('deleteThisPayment', 'Delete this payment')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
              {t('noPaymentsForMonth', 'No recorded payments for this month.')}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">{t('thisMonthTotal', 'Total This Month')}</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {formatCurrency(monthTotal, profile?.currency)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold rounded-xl transition-all cursor-pointer"
          >
            {t('close', 'Close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
