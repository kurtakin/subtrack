/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ShoppingBag, Store, Calendar, CheckCircle2, ChevronRight, Plus, ArrowUpRight, RefreshCw, Check } from 'lucide-react';
import { Installment } from '../types';
import { differenceInDays, parseISO, format } from 'date-fns';
import { useTranslation } from '../context/LanguageContext';

interface UpcomingInstallmentsWidgetProps {
  installments: Installment[];
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
  onPayInstallment: (id: string) => void;
  onOpenAddModal: () => void;
  onGoToInstallmentsTab: () => void;
  onSyncInstallmentToCalendar?: (inst: Installment) => void;
  syncingCalendarId?: string | null;
  payingInstallmentId?: string | null;
  onToggleAutoPayment?: (id: string) => void;
  onSetAutoPayment?: (id: string, isAuto: boolean) => void;
}

export const UpcomingInstallmentsWidget: React.FC<UpcomingInstallmentsWidgetProps> = ({
  installments,
  currencyCode = 'USD',
  formatCurrency,
  onPayInstallment,
  onOpenAddModal,
  onGoToInstallmentsTab,
  onSyncInstallmentToCalendar,
  syncingCalendarId,
  payingInstallmentId,
  onToggleAutoPayment,
  onSetAutoPayment
}) => {
  const { t } = useTranslation();
  const activeInstallments = installments.filter(i => i.status === 'active');
  const thisMonthTotal = activeInstallments.reduce((acc, curr) => acc + (curr.monthlyAmount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span>{t('upcomingInstallmentsTitle')}</span>
        </h2>
        {activeInstallments.length > 0 && (
          <button
            type="button"
            onClick={onGoToInstallmentsTab}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('viewAll')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        {/* Top Summary Banner */}
        {activeInstallments.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-100 dark:border-purple-900/40 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                {t('thisMonthTotalInstallments')}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-400">
                {activeInstallments.length} {t('activeInstallmentsCountText')}
              </p>
            </div>
            <p className="text-base font-black text-purple-700 dark:text-purple-300">
              {formatCurrency(thisMonthTotal, currencyCode)}
            </p>
          </div>
        )}

        {/* Installment Items */}
        {activeInstallments.length > 0 ? (
          <div className="space-y-3">
            {activeInstallments.map((inst) => {
              const paid = inst.paidInstallments || 0;
              const total = inst.totalInstallments || 1;
              const remaining = Math.max(0, total - paid);
              const totalPaidAmt = Number((paid * (inst.monthlyAmount || 0)).toFixed(2));
              const totalRemainingAmt = Number((remaining * (inst.monthlyAmount || 0)).toFixed(2));
              const progressPercent = Math.min(100, Math.round((paid / total) * 100));
              const currentMonthStr = format(new Date(), 'yyyy-MM');
              const isPaidThisMonth = inst.lastPaidMonth === currentMonthStr;

              let daysRemaining: number | null = null;
              if (inst.nextPaymentDate) {
                try {
                  daysRemaining = differenceInDays(parseISO(inst.nextPaymentDate), new Date());
                } catch {}
              }

              return (
                <div
                  key={inst.id}
                  className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/60 hover:border-purple-200 dark:hover:border-purple-900/50 transition-all space-y-2.5"
                >
                  {/* Row 1: Product Name, Store & Monthly Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                          {inst.name}
                        </span>
                        {inst.store && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100/70 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded-md">
                            <Store className="w-3 h-3 text-purple-600" />
                            {inst.store}
                          </span>
                        )}
                        {inst.calendarEventId ? (
                          (isPaidThisMonth || (inst.isAutoPayment && daysRemaining !== null && daysRemaining <= 0)) ? (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md shadow-xs"
                              title={inst.isAutoPayment ? t('autoPaidGreen') : t('calendarGreenPaid')}
                            >
                              <Check className="w-2.5 h-2.5 text-white" />
                              <span>{inst.isAutoPayment ? t('autoPaidGreen') : t('calendarGreenPaid')}</span>
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md"
                              title={`${t('onCalendar')} (${inst.calendarEventIds?.length || remaining} ${t('months')})`}
                            >
                              <Calendar className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{t('calendarMonthsCount')} ({inst.calendarEventIds?.length || remaining} {t('months')})</span>
                            </span>
                          )
                        ) : onSyncInstallmentToCalendar ? (
                          <button
                            type="button"
                            onClick={() => onSyncInstallmentToCalendar(inst)}
                            disabled={syncingCalendarId === inst.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-md border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                            title={t('addToCalendar')}
                          >
                            {syncingCalendarId === inst.id ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin text-purple-600" />
                            ) : (
                              <Calendar className="w-2.5 h-2.5 text-purple-600" />
                            )}
                            <span>{t('addToCalendar')}</span>
                          </button>
                        ) : null}
                        {inst.isAutoPayment ? (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100/80 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-md border border-blue-200 dark:border-blue-900/40"
                            title={t('autoPayment')}
                          >
                            <RefreshCw className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                            <span>{t('autoPayment')}</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-md border border-gray-200 dark:border-gray-700"
                            title={t('manualPayment')}
                          >
                            <span>✋ {t('manual')}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        {(isPaidThisMonth || (inst.isAutoPayment && daysRemaining !== null && daysRemaining <= 0)) ? (
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {inst.isAutoPayment ? t('autoPaidCheck') : t('paidThisMonthCheck')} • {t('nextInstallmentPayment')}: {inst.nextPaymentDate}
                          </span>
                        ) : daysRemaining !== null ? (
                          <span className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-purple-500" />
                            {daysRemaining < 0
                              ? t('overdue')
                              : daysRemaining === 0
                                ? t('dueToday')
                                : `${daysRemaining} ${t('daysRemainingBill')} (${inst.nextPaymentDate})`}
                          </span>
                        ) : null}
                        {inst.bankOrCard && (
                          <span className="text-[10px] bg-gray-200/60 dark:bg-gray-700/60 px-1.5 py-0.5 rounded font-semibold text-gray-600 dark:text-gray-300">
                            {inst.bankOrCard}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-sm text-purple-600 dark:text-purple-400">
                        {formatCurrency(inst.monthlyAmount, currencyCode)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold">{t('monthlyInstallment')}</p>
                    </div>
                  </div>

                  {/* Row 2: Progress & Installment Counts as requested by user */}
                  <div className="space-y-1 bg-white dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <span className="text-purple-600 dark:text-purple-400 font-black">{paid}.</span> / {total} {t('installmentPaidRatio')}
                        <span className="text-[10px] font-semibold text-gray-400">({remaining} {t('installmentsRemainingText')})</span>
                      </span>
                      <span className="text-purple-600 dark:text-purple-400 text-[11px]">
                        %{progressPercent}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Total paid & total remaining as requested by user */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 pt-0.5">
                      <span>
                        {t('paidAmount')}: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaidAmt, currencyCode)}</strong>
                      </span>
                      <span>
                        {t('remainingDebt')}: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(totalRemainingAmt, currencyCode)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Payment Mode Dual Choice & Action Button */}
                  <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Segmented selector between Manuel and Otomatik */}
                      <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px]">
                        <button
                          type="button"
                          onClick={() => onSetAutoPayment ? onSetAutoPayment(inst.id, false) : onToggleAutoPayment?.(inst.id)}
                          className={`px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            !inst.isAutoPayment
                              ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs ring-1 ring-black/5'
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                          title={t('manualPayment')}
                        >
                          <span>✋ {t('manual')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetAutoPayment ? onSetAutoPayment(inst.id, true) : onToggleAutoPayment?.(inst.id)}
                          className={`px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            inst.isAutoPayment
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                          title={t('autoPayment')}
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>{t('autoPayment')}</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-gray-400 italic hidden sm:inline">
                        {t('totalLabel')}: {formatCurrency(inst.totalAmount, currencyCode)}
                      </span>
                    </div>

                    {(isPaidThisMonth || (inst.isAutoPayment && daysRemaining !== null && daysRemaining <= 0)) ? (
                      <button
                        type="button"
                        onClick={() => onPayInstallment(inst.id)}
                        disabled={payingInstallmentId === inst.id}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-xs shadow-emerald-500/25 ring-2 ring-emerald-400/30 shrink-0"
                        title={inst.isAutoPayment ? t('autoPaidCheck') : t('paidThisMonthCheck')}
                      >
                        {payingInstallmentId === inst.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>{payingInstallmentId === inst.id ? t('calendarUpdating') : inst.isAutoPayment ? t('autoPaidCheck') : t('paidThisMonthCheck')}</span>
                      </button>
                    ) : inst.isAutoPayment ? (
                      <button
                        type="button"
                        onClick={() => onPayInstallment(inst.id)}
                        disabled={payingInstallmentId === inst.id}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-blue-500/20 ring-2 ring-blue-400/20 shrink-0"
                        title={t('markAsAutoPaid')}
                      >
                        {payingInstallmentId === inst.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>{payingInstallmentId === inst.id ? t('calendarUpdating') : t('markAsAutoPaid')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPayInstallment(inst.id)}
                        disabled={payingInstallmentId === inst.id}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs shadow-purple-500/20 shrink-0"
                        title={t('payThisMonthInstallment')}
                      >
                        {payingInstallmentId === inst.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>{payingInstallmentId === inst.id ? t('calendarUpdating') : t('payThisMonthPlusOne')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 space-y-2">
            <ShoppingBag className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              {t('noActiveInstallmentsYet')}
            </p>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addFirstInstallment')}</span>
            </button>
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-1 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('newInstallment')}</span>
          </button>
          <button
            type="button"
            onClick={onGoToInstallmentsTab}
            className="text-xs font-bold text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('installmentsPanel')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
