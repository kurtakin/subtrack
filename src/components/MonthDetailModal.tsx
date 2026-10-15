import React, { useState, useContext, useMemo } from 'react';
import { motion } from 'motion/react';
import { parseISO, format } from 'date-fns';
import {
  Calendar,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Trash2,
  Tag,
  CreditCard,
  Home,
  ShoppingBag,
  Layers,
  Clock
} from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Payment, Subscription, RegularPayment, Installment, OperationType, FirestoreErrorInfo } from '../types';
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

export interface MonthDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string | null;
  allPayments: Payment[];
  subscriptions: Subscription[];
  regularPayments?: RegularPayment[];
  installments?: Installment[];
  defaultCategory?: 'subscriptions' | 'regular' | 'installments' | 'all';
  onConfirmAction: (options: { title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'info' }) => void;
}

export const MonthDetailModal: React.FC<MonthDetailModalProps> = ({
  isOpen,
  onClose,
  monthKey,
  allPayments,
  subscriptions,
  regularPayments = [],
  installments = [],
  defaultCategory = 'subscriptions',
  onConfirmAction
}) => {
  const { profile } = useContext(AuthContext);
  const { t, language } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<'all' | 'subscriptions' | 'regular' | 'installments'>(defaultCategory);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null);

  // Sync category if defaultCategory changes upon open
  React.useEffect(() => {
    if (isOpen && defaultCategory) {
      setActiveCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  if (!isOpen || !monthKey) return null;

  let monthLabel = monthKey;
  try {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    const locale = language === 'tr' ? 'tr-TR' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : language === 'it' ? 'it-IT' : 'en-US';
    monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
  } catch {}

  // 1. Subscription recorded payments for this month
  const monthPayments = allPayments.filter(p => {
    if (!p.date) return false;
    try {
      const d = parseISO(p.date);
      return format(d, 'yyyy-MM') === monthKey;
    } catch {
      return false;
    }
  }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  // Subscription commitment calculation
  const subsCommitment = subscriptions.reduce((acc, sub) => {
    if (sub.status === 'cancelled') return acc;
    const amount = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
    return acc + amount;
  }, 0);

  const subsPaymentsSum = monthPayments.reduce((acc, p) => acc + p.amount, 0);

  // 2. Regular payments calculation
  const activeRegular = regularPayments.filter(p => p.status === 'active');
  const regularMonthlyEquivalent = (curr: RegularPayment) => {
    if (curr.frequency === 'quarterly') return (curr.amount || 0) / 3;
    if (curr.frequency === 'annual') return (curr.amount || 0) / 12;
    if (curr.frequency === 'bimonthly') return (curr.amount || 0) / 2;
    return curr.amount || 0;
  };
  const regularTotal = activeRegular.reduce((acc, curr) => acc + regularMonthlyEquivalent(curr), 0);

  // 3. Installments calculation
  const activeInstallments = installments.filter(i => i.status === 'active');
  const installmentsTotal = activeInstallments.reduce((acc, curr) => acc + (curr.monthlyAmount || 0), 0);

  // Unified Total
  const totalAll = Number((subsPaymentsSum + regularTotal + installmentsTotal).toFixed(2));

  // Determine current active display total
  const displayTotal = useMemo(() => {
    if (activeCategory === 'subscriptions') return subsPaymentsSum;
    if (activeCategory === 'regular') return regularTotal;
    if (activeCategory === 'installments') return installmentsTotal;
    return totalAll;
  }, [activeCategory, subsPaymentsSum, regularTotal, installmentsTotal, totalAll]);

  // Duplicate detection for subscription payments
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
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white capitalize">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {monthLabel} - {t('monthDetailTitle', 'Payment & Spending Breakdown')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {activeCategory === 'subscriptions' && t('monthDetailSubtitle', 'Listing {count} payments registered this month').replace('{count}', String(monthPayments.length))}
              {activeCategory === 'regular' && `${activeRegular.length} ${t('regularPayments').toLowerCase()}`}
              {activeCategory === 'installments' && `${activeInstallments.length} ${t('installments').toLowerCase()}`}
              {activeCategory === 'all' && `${t('all')}: ${formatCurrency(totalAll, profile?.currency)}`}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Category Switcher Tabs */}
        <div className="px-6 pt-4 bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 text-xs font-bold no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeCategory === 'all'
                  ? "bg-emerald-600 text-white shadow-xs font-black"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200/60 dark:border-gray-700"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('all')} ({formatCurrency(totalAll, profile?.currency)})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('subscriptions')}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeCategory === 'subscriptions'
                  ? "bg-blue-600 text-white shadow-xs font-black"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200/60 dark:border-gray-700"
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t('subscriptions')} ({formatCurrency(subsPaymentsSum, profile?.currency)})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('regular')}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeCategory === 'regular'
                  ? "bg-amber-600 text-white shadow-xs font-black"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200/60 dark:border-gray-700"
              )}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t('regularPayments')} ({formatCurrency(regularTotal, profile?.currency)})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('installments')}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeCategory === 'installments'
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200/60 dark:border-gray-700"
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t('installments')} ({formatCurrency(installmentsTotal, profile?.currency)})</span>
            </button>
          </div>
        </div>

        {cleanSuccess && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            {cleanSuccess}
          </div>
        )}

        {/* Duplicate Warning & One-Click Cleanup (Subscriptions) */}
        {activeCategory === 'subscriptions' && duplicateCount > 0 && (
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
              type="button"
              onClick={handleCleanDuplicates}
              disabled={isCleaning}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isCleaning ? t('cleaning', 'Cleaning...') : t('cleanDuplicates', 'Clean Duplicate Records')}
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* 1. Subscriptions List */}
          {(activeCategory === 'subscriptions' || activeCategory === 'all') && (
            <div className="space-y-2">
              {activeCategory === 'all' && (
                <div className="flex items-center justify-between pt-1 pb-1">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <CreditCard className="w-3.5 h-3.5" />
                    {t('subscriptions')}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    {formatCurrency(subsPaymentsSum, profile?.currency)}
                  </span>
                </div>
              )}
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
                        "flex items-center justify-between p-3 rounded-2xl border transition-all group",
                        isDuplicate 
                          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 ring-1 ring-amber-400/30" 
                          : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xs"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shadow-xs",
                          isDuplicate 
                            ? "bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                            : isTopUp 
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white">
                              {sub?.name || p.subscriptionId}
                            </span>
                            {isTopUp && (
                              <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" />
                                {t('extraUsage')}
                              </span>
                            )}
                            {isDuplicate && (
                              <span className="px-1.5 py-0.2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded-md">
                                {t('duplicate')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {p.date ? format(parseISO(p.date), 'dd MMM yyyy') : ''}
                            {p.note && ` • ${getLocalizedNote(p.note, language)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                          {formatCurrency(p.amount, profile?.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(p)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                          title={t('deleteThisPayment', 'Delete this payment')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl text-center text-xs text-gray-400">
                  {t('noPaymentsForMonth', 'No recorded payments for this month.')}
                </div>
              )}
            </div>
          )}

          {/* 2. Regular Payments List */}
          {(activeCategory === 'regular' || activeCategory === 'all') && (
            <div className="space-y-2 pt-2">
              {activeCategory === 'all' && (
                <div className="flex items-center justify-between pt-2 pb-1 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Home className="w-3.5 h-3.5" />
                    {t('regularPayments')}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    {formatCurrency(regularTotal, profile?.currency)}
                  </span>
                </div>
              )}
              {activeRegular.length > 0 ? (
                activeRegular.map((p) => {
                  const isPaid = (p.paidMonths && p.paidMonths.includes(monthKey)) || (p.lastPaidMonth === monthKey);
                  return (
                    <div 
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                          <Home className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded-md text-[10px] font-bold",
                              isPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            )}>
                              {isPaid ? t('paid') : t('pending')}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {p.payee || t('regularMonthly')} {p.frequency !== 'monthly' && `• ${p.frequency}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                          {formatCurrency(regularMonthlyEquivalent(p), profile?.currency)}
                        </span>
                        {p.frequency !== 'monthly' && (
                          <span className="block text-[10px] text-gray-400">{formatCurrency(p.amount, profile?.currency)} / {p.frequency}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl text-center text-xs text-gray-400">
                  {t('noDataAvailable')}
                </div>
              )}
            </div>
          )}

          {/* 3. Installments List */}
          {(activeCategory === 'installments' || activeCategory === 'all') && (
            <div className="space-y-2 pt-2">
              {activeCategory === 'all' && (
                <div className="flex items-center justify-between pt-2 pb-1 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {t('installments')}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    {formatCurrency(installmentsTotal, profile?.currency)}
                  </span>
                </div>
              )}
              {activeInstallments.length > 0 ? (
                activeInstallments.map((inst) => {
                  const isPaid = inst.lastPaidMonth === monthKey;
                  return (
                    <div 
                      key={inst.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white">{inst.name}</span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded-md text-[10px] font-bold",
                              isPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            )}>
                              {isPaid ? t('paid') : t('pending')}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {inst.paidInstallments} / {inst.totalInstallments} {t('monthlyInstallment').toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white">
                        {formatCurrency(inst.monthlyAmount, profile?.currency)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl text-center text-xs text-gray-400">
                  {t('noDataAvailable')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with accurate matching totals */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-bold">
              {activeCategory === 'subscriptions' && `${t('subscriptions')} ${t('total')}`}
              {activeCategory === 'regular' && `${t('regularPayments')} ${t('total')}`}
              {activeCategory === 'installments' && `${t('installments')} ${t('total')}`}
              {activeCategory === 'all' && `${t('total')} (${t('all')})`}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {formatCurrency(displayTotal, profile?.currency)}
              </span>
              {activeCategory === 'subscriptions' && subsPaymentsSum !== subsCommitment && (
                <span className="text-xs text-gray-500 font-semibold">
                  ({t('plannedBudget')}: {formatCurrency(subsCommitment, profile?.currency)})
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 text-white dark:text-gray-900 text-sm font-bold rounded-xl transition-all cursor-pointer"
          >
            {t('close', 'Close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
