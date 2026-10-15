/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Tag,
  Zap,
  Calendar,
  Clock,
  XCircle,
  Settings,
  Trash2,
  ChevronDown,
  History,
  CheckCircle2,
  Check,
  ArrowUpRight
} from 'lucide-react';
import { Subscription, Payment } from '../types';
import { AuthContext } from '../context/AuthContext';
import { ICON_MAP, formatCurrency } from '../constants';
import { cn } from '../lib/utils';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedCategoryName } from '../utils/categoryTranslator';

const formatDateLocalized = (dateStr: string, lang: string) => {
  try {
    const d = parseISO(dateStr);
    const locale = lang === 'tr' ? 'tr-TR' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : 'en-US';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return dateStr;
  }
};

const formatMonthYearLocalized = (dateStr: string, lang: string) => {
  try {
    const d = parseISO(dateStr);
    const locale = lang === 'tr' ? 'tr-TR' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
  } catch {
    return dateStr;
  }
};

export const SubscriptionCard: React.FC<{ 
  sub: Subscription;
  payments?: Payment[];
  onEdit: (s: Subscription) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleStatus: (sub: Subscription) => void | Promise<void>;
  onViewHistory: (sub: Subscription) => void;
  onAddTopUp: (sub: Subscription) => void;
  onSyncCalendar?: (sub: Subscription) => void;
  currentMonthTopUpsTotal?: number;
}> = ({
  sub,
  payments = [],
  onEdit,
  onDelete,
  onToggleStatus,
  onViewHistory,
  onAddTopUp,
  onSyncCalendar,
  currentMonthTopUpsTotal = 0
}) => {
  const { profile } = useContext(AuthContext);
  const { t, language } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const isUsageBased = sub.pricingType === 'usage_based';
  const isHybrid = sub.pricingType === 'hybrid';
  const daysRemaining = differenceInDays(parseISO(sub.nextPaymentDate), new Date());
  const IconComponent = ICON_MAP[sub.icon] || Tag;
  const isActive = sub.status === 'active';

  // Sort payments descending by date
  const subPayments = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments]);

  const currentMonthStr = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const isPaidThisMonth = useMemo(() => {
    return Boolean(
      subPayments.some(p => p.date && p.date.startsWith(currentMonthStr) && p.status === 'paid') ||
      sub.lastPaidMonth === currentMonthStr
    );
  }, [subPayments, sub.lastPaidMonth, currentMonthStr]);

  const isAuto = Boolean(sub.isAutoPayment);
  const isSubDueOrPast = Boolean(sub.nextPaymentDate && sub.nextPaymentDate.slice(0, 10) <= todayStr);
  const isSubAutoPaid = isAuto;
  const isSubPaid = isPaidThisMonth || isAuto;
  const isGreenCard = isSubPaid || isAuto;
  const isOverdue = !isUsageBased && daysRemaining < 0 && !isSubPaid;

  const totalPaid = useMemo(() => {
    return subPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [subPayments]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group p-4 rounded-2xl border transition-all flex flex-col justify-between",
        isGreenCard
          ? "bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 dark:from-emerald-950/35 dark:via-gray-900 dark:to-emerald-950/20 border-emerald-300 dark:border-emerald-700/80 shadow-md shadow-emerald-500/10 hover:border-emerald-400 dark:hover:border-emerald-600"
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl hover:shadow-blue-50/50 dark:hover:shadow-blue-900/10",
        !isActive && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div>
        {/* Clickable Header Area (Clicking expands monthly payments) */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer"
          title={t('monthlyPaymentBreakdown')}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                isGreenCard
                  ? "bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                  : isActive
                  ? "bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400"
              )}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={cn("font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors", !isActive && "line-through")}>
                    {sub.name}
                  </h3>
                  {isUsageBased && (
                    <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold rounded-md uppercase tracking-tight flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      {t('usageBased')}
                    </span>
                  )}
                  {isHybrid && (
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold rounded-md uppercase tracking-tight flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      {t('hybrid')}
                    </span>
                  )}
                  {isAuto ? (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-800 shadow-2xs"
                      title={language === 'tr' ? 'Otomatik Ödeme Aktif (Google Takvimde Yeşil)' : 'Auto-Pay Active (Green in Google Calendar)'}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'tr' ? 'Otomatik Ödeme' : 'Auto-Pay'}</span>
                    </span>
                  ) : isSubPaid ? (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-800 shadow-2xs"
                      title={language === 'tr' ? 'Bu Ay Ödendi (Google Takvimde Yeşil)' : 'Paid This Month (Green in Google Calendar)'}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'tr' ? 'Ödendi' : 'Paid'}</span>
                    </span>
                  ) : null}
                </div>
                {(() => {
                  const localizedCat = getLocalizedCategoryName(sub.category, t);
                  const displayCat = language === 'en' 
                    ? localizedCat.toUpperCase().replace(/İ/g, 'I').replace(/ı/g, 'i') 
                    : localizedCat;
                  return (
                    <p 
                      lang={language}
                      className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold"
                    >
                      {displayCat}
                    </p>
                  );
                })()}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(sub.amount, profile?.currency)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {isUsageBased ? t('estimatedMonthly', 'Est. Monthly') : sub.billingCycle === 'monthly' ? t('everyMonth', 'Monthly') : t('everyYear', 'Yearly')}
              </p>
            </div>
          </div>

          {/* Current Month Top-up / Extra Usage summary if exists */}
          {currentMonthTopUpsTotal > 0 && (
            <div className="mb-3 px-3 py-1.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl flex items-center justify-between text-xs">
              <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {t('thisMonthTopUp')}
              </span>
              <span className="font-extrabold text-amber-900 dark:text-amber-200">
                +{formatCurrency(currentMonthTopUpsTotal, profile?.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Clickable Monthly Payment Accordion Trigger Bar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            "w-full mt-1 mb-2.5 py-1.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer border",
            isExpanded
              ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 shadow-xs"
              : "bg-gray-50 hover:bg-blue-50/60 dark:bg-gray-800/40 dark:hover:bg-blue-950/30 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 border-gray-100 dark:border-gray-800"
          )}
          title={t('monthlyPaymentBreakdown')}
        >
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('monthlyPaymentBreakdown')}</span>
            <span className="px-1.5 py-0.2 bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-black">
              {subPayments.length} {t('months')}
            </span>
          </span>
          <div className="flex items-center gap-1 text-[11px]">
            <span className="font-semibold text-gray-400 dark:text-gray-500">
              {isExpanded ? t('close') : t('view')}
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180 text-blue-600")} />
          </div>
        </button>

        {/* Expandable Monthly Payment Breakdown Accordion */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mb-3 p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-2.5">
                {/* Accordion Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-blue-100/80 dark:border-blue-900/40">
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {t('paymentBreakdown')} ({subPayments.length})
                  </span>
                  <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">
                    {t('totalLabel')}: {formatCurrency(totalPaid, profile?.currency)}
                  </span>
                </div>

                {/* List of Monthly Payments */}
                {subPayments.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {subPayments.map((payment) => {
                      const isTopUp = payment.type === 'topup';
                      return (
                        <div
                          key={payment.id}
                          className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-blue-100/60 dark:border-gray-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-gray-900 dark:text-white">
                                {formatMonthYearLocalized(payment.date, language)}
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded-md",
                                isTopUp
                                  ? "bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              )}>
                                {isTopUp ? t('topUp') : t('renewal')}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {formatDateLocalized(payment.date, language)}
                              {payment.note && ` • ${payment.note}`}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-gray-900 dark:text-white block">
                              {formatCurrency(payment.amount, profile?.currency)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {t('paidStatus')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg text-center text-xs text-gray-400 italic">
                    {t('noPaymentHistoryYet')}
                  </div>
                )}

                {/* Footer link to full modal */}
                <div className="pt-1 flex items-center justify-between border-t border-blue-100/80 dark:border-blue-900/40">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTopUp(sub);
                    }}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>{t('addPaymentBtn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewHistory(sub);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{t('viewAllReceipts')}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {isActive ? (
            isUsageBased ? (
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {t('limitDepletedCharge')}
              </span>
            ) : (
              <>
                <Calendar className={cn("w-4 h-4", isOverdue ? "text-red-500" : "text-gray-400")} />
                <span className={cn(
                  "font-medium text-xs",
                  isOverdue ? "text-red-600" : "text-gray-600 dark:text-gray-300"
                )}>
                  {isOverdue ? t('overdue') : `${t('nextDate')}: ${formatDateLocalized(sub.nextPaymentDate, language)}`}
                </span>
                {daysRemaining >= 0 && daysRemaining <= 7 && (
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold rounded-full uppercase">
                    {t('approaching')}
                  </span>
                )}
                {sub.isAutoPayment && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {t('autoShort')}
                  </span>
                )}
                {isSubPaid && (
                  <span 
                    className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-full flex items-center gap-1 border border-emerald-200/80 dark:border-emerald-800/60"
                    title={isSubAutoPaid ? (t('autoPaidGreen') || 'Otomatik Ödendi') : (t('paidThisMonthGreen') || 'Bu Ay Ödendi')}
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    <span>{isSubAutoPaid ? (t('autoPaidCheck') || 'Otomatik Ödendi ✓') : (t('paidThisMonthLabel') || 'Bu Ay Ödendi')}</span>
                  </span>
                )}
                {sub.calendarEventId && (
                  <span 
                    className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-full flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40"
                    title={t('onCalendar')}
                  >
                    <Calendar className="w-2.5 h-2.5 text-emerald-600" />
                    <span>{t('onCalendar')}</span>
                  </span>
                )}
              </>
            )
          ) : (
            <span className="text-gray-400 font-medium italic flex items-center gap-1 text-xs">
              <XCircle className="w-4 h-4" />
              {t('cancelled')}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Add Top-up / Extra Charge button */}
          {isActive && (
            <button
              onClick={() => onAddTopUp(sub)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg transition-colors border border-amber-200/50 dark:border-amber-800/40 cursor-pointer"
              title={t('extraSpending')}
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{t('extraShort')}</span>
            </button>
          )}

          <button 
            onClick={() => onToggleStatus(sub)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer",
              isActive ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
            )}
            title={isActive ? t('cancelled') : t('active')}
          >
            <span
              className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                isActive ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>

          <div className="flex items-center gap-1 opacity-90 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
            {isActive && onSyncCalendar && (
              <button 
                type="button"
                onClick={() => onSyncCalendar(sub)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  sub.calendarEventId 
                    ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" 
                    : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                )}
                title={t('addToCalendar')}
                aria-label={t('addToCalendar')}
              >
                <Calendar className="w-4 h-4" />
              </button>
            )}

            <button 
              type="button"
              onClick={() => onViewHistory(sub)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
              title={t('paymentBreakdown')}
              aria-label={t('paymentBreakdown')}
            >
              <Clock className="w-4 h-4" />
            </button>

            <button 
              type="button"
              onClick={() => onEdit(sub)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
              title={t('edit')}
              aria-label={t('edit')}
            >
              <Settings className="w-4 h-4" />
            </button>

            <button 
              type="button"
              onClick={() => onDelete(sub.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
