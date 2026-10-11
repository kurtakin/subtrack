/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Store,
  Calendar,
  CreditCard,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  RotateCcw,
  Sparkles,
  PieChart,
  Tag,
  RefreshCw,
  Check,
  Upload,
  Download
} from 'lucide-react';
import { Installment } from '../types';
import { differenceInDays, parseISO, format } from 'date-fns';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedCategoryName } from '../utils/categoryTranslator';
import { getLocalizedNote, translateTitle } from '../utils/itemTranslator';

interface InstallmentsViewProps {
  installments: Installment[];
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
  onOpenAddModal: () => void;
  onEditInstallment: (inst: Installment) => void;
  onDeleteInstallment: (id: string) => void;
  onPayInstallment: (id: string) => void;
  onUndoPayment: (id: string) => void;
  onOpenCalendarModal?: () => void;
  onSyncInstallmentToCalendar?: (inst: Installment) => void;
  syncingCalendarId?: string | null;
  payingInstallmentId?: string | null;
  onSetAutoPayment?: (id: string, isAuto: boolean) => void;
  onToggleAutoPayment?: (id: string) => void;
  onOpenImportModal?: () => void;
  onOpenExportModal?: () => void;
}

export const InstallmentsView: React.FC<InstallmentsViewProps> = ({
  installments,
  currencyCode = 'USD',
  formatCurrency,
  onOpenAddModal,
  onEditInstallment,
  onDeleteInstallment,
  onPayInstallment,
  onUndoPayment,
  onOpenCalendarModal,
  onSyncInstallmentToCalendar,
  syncingCalendarId,
  payingInstallmentId,
  onSetAutoPayment,
  onToggleAutoPayment,
  onOpenImportModal,
  onOpenExportModal
}) => {
  const { t, language } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Stats Calculations
  const stats = useMemo(() => {
    const active = installments.filter(i => i.status === 'active');
    const completed = installments.filter(i => i.status === 'completed');

    const totalRemainingDebt = active.reduce((acc, curr) => {
      const rem = Math.max(0, curr.totalInstallments - curr.paidInstallments);
      return acc + (rem * (curr.monthlyAmount || 0));
    }, 0);

    const thisMonthPayment = active.reduce((acc, curr) => acc + (curr.monthlyAmount || 0), 0);

    const totalAlreadyPaid = installments.reduce((acc, curr) => {
      return acc + (curr.paidInstallments * (curr.monthlyAmount || 0));
    }, 0);

    const overallTotalValue = installments.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    return {
      activeCount: active.length,
      completedCount: completed.length,
      totalRemainingDebt,
      thisMonthPayment,
      totalAlreadyPaid,
      overallTotalValue
    };
  }, [installments]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(installments.map(i => i.category).filter(Boolean));
    return Array.from(cats);
  }, [installments]);

  // Filtered List
  const filteredInstallments = useMemo(() => {
    return installments.filter(inst => {
      // Status filter
      if (statusFilter === 'active' && inst.status !== 'active') return false;
      if (statusFilter === 'completed' && inst.status !== 'completed') return false;

      // Category filter
      if (categoryFilter !== 'all' && inst.category !== categoryFilter) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = inst.name.toLowerCase().includes(query);
        const matchStore = (inst.store || '').toLowerCase().includes(query);
        const matchBank = (inst.bankOrCard || '').toLowerCase().includes(query);
        if (!matchName && !matchStore && !matchBank) return false;
      }

      return true;
    });
  }, [installments, statusFilter, categoryFilter, searchTerm]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {t('installmentPurchases')}
            </h1>
            <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold">
              {stats.activeCount} {t('activeDebts')}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('installmentPurchases')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
              title={t('export')}
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>{t('export')}</span>
            </button>
          )}

          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
              title={t('import')}
            >
              <Upload className="w-4 h-4 text-purple-600" />
              <span>{t('import')}</span>
            </button>
          )}

          {onOpenCalendarModal && (
            <button
              type="button"
              onClick={onOpenCalendarModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
              title="Google Takvim ile senkronize et"
            >
              <Calendar className="w-4 h-4" />
              <span>{t('syncCalendar')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-purple-500/25 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newInstallment')}</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Kalan Toplam Borç */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('remainingTotalDebt')}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(stats.totalRemainingDebt, currencyCode)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-semibold">
            {stats.activeCount} {t('active').toLowerCase()}
          </p>
        </div>

        {/* Card 2: Bu Ay Ödenecek Taksit */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('monthlyInstallmentTotal')}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {formatCurrency(stats.thisMonthPayment, currencyCode)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-semibold">
            {t('monthlyInstallmentTotal')}
          </p>
        </div>

        {/* Card 3: Şimdiye Kadar Ödenen */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('alreadyPaid')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.totalAlreadyPaid, currencyCode)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-semibold">
            {stats.completedCount} {t('completed').toLowerCase()}
          </p>
        </div>

        {/* Card 4: Toplam Ürün Değeri */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('totalPurchaseValue')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(stats.overallTotalValue, currencyCode)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-semibold">
            {installments.length} {t('installmentPurchases', 'installment purchases')}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Status filter tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold w-full md:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('active')} ({stats.activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('completed')} ({stats.completedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('all')} ({installments.length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Category dropdown */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{t('all')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{getLocalizedCategoryName(cat, t)}</option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Installment Cards Grid */}
      {filteredInstallments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInstallments.map((inst) => {
            const paid = inst.paidInstallments || 0;
            const total = inst.totalInstallments || 1;
            const remaining = Math.max(0, total - paid);
            const totalPaidAmt = Number((paid * (inst.monthlyAmount || 0)).toFixed(2));
            const totalRemainingAmt = Number((remaining * (inst.monthlyAmount || 0)).toFixed(2));
            const progressPercent = Math.min(100, Math.round((paid / total) * 100));
            const isCompleted = inst.status === 'completed' || paid >= total;
            const currentMonthStr = format(new Date(), 'yyyy-MM');
            const isPaidThisMonth = inst.lastPaidMonth === currentMonthStr;

            let daysRemaining: number | null = null;
            if (inst.nextPaymentDate && !isCompleted) {
              try {
                daysRemaining = differenceInDays(parseISO(inst.nextPaymentDate), new Date());
              } catch {}
            }

            return (
              <motion.div
                key={inst.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between overflow-hidden ${
                  isCompleted
                    ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm hover:border-purple-200 dark:hover:border-purple-900/40'
                }`}
              >
                {/* Top Section */}
                <div className="space-y-4">
                  {/* Header: Name, Store, Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-base text-gray-900 dark:text-white">
                          {translateTitle(inst.name, language)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inst.store && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold rounded-lg border border-purple-100 dark:border-purple-900/40">
                            <Store className="w-3 h-3" />
                            {inst.store}
                          </span>
                        )}
                        {inst.category && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-semibold rounded-lg">
                            {getLocalizedCategoryName(inst.category, t)}
                          </span>
                        )}
                        {inst.bankOrCard && (
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded-lg border border-blue-100 dark:border-blue-900/30">
                            {inst.bankOrCard}
                          </span>
                        )}
                        {/* Auto-Payment vs Manual Mode Badge with 1-click toggle */}
                        {inst.isAutoPayment ? (
                          <button
                            type="button"
                            onClick={() => onSetAutoPayment ? onSetAutoPayment(inst.id, false) : onToggleAutoPayment?.(inst.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-200/80 transition-colors cursor-pointer"
                            title={t('autoPayment')}
                          >
                            <RefreshCw className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                            <span>{t('autoPayment')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSetAutoPayment ? onSetAutoPayment(inst.id, true) : onToggleAutoPayment?.(inst.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                            title={t('manualPayment')}
                          >
                            <span>✋ {t('manualPayment')}</span>
                          </button>
                        )}
                        {inst.calendarEventId && (
                          (isPaidThisMonth || (inst.isAutoPayment && inst.nextPaymentDate && inst.nextPaymentDate <= new Date().toISOString().split('T')[0])) ? (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-xs"
                              title={inst.isAutoPayment ? t('autoPaidGreen') : t('calendarGreenPaid')}
                            >
                              <Check className="w-3 h-3 text-white" />
                              <span>{inst.isAutoPayment ? t('autoPaidGreen') : t('calendarGreenPaid')}</span>
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-900/40"
                              title={`${t('onCalendar')} (${inst.calendarEventIds?.length || remaining} ${t('months')})`}
                            >
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              <span>{t('calendarMonthsCount')} ({inst.calendarEventIds?.length || remaining} {t('months')})</span>
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 text-right">
                      {isCompleted ? (
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('completed')}
                        </span>
                      ) : (
                        <div>
                          <p className="text-xl font-black text-purple-600 dark:text-purple-400">
                            {formatCurrency(inst.monthlyAmount, currencyCode)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{t('monthlyInstallment')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Card (Requested fields: kaç taksit olduğu, kaç taksit kaldığı, totalde ne ödendiği, ne kadar kaldığı) */}
                  <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2.5">
                    {/* Installment count & progress */}
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-900 dark:text-white">
                        <strong className="text-purple-600 dark:text-purple-400 text-sm">{paid}</strong> / {total} {t('installmentPaidRatio')}
                      </span>
                      <span className="text-purple-600 dark:text-purple-400">
                        %{progressPercent}
                      </span>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Financial details: Ödenen vs Kalan Borç */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-400 font-bold block">{t('paidAmount')}</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(totalPaidAmt, currencyCode)}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-semibold">({paid} {t('months')})</span>
                      </div>

                      <div className="p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-400 font-bold block">{t('remainingDebt')}</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                          {formatCurrency(totalRemainingAmt, currencyCode)}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-semibold">({remaining} {t('installmentsRemainingText')})</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Dates & Note */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                    {!isCompleted ? (
                      isPaidThisMonth ? (
                        <span className="font-extrabold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t('paidThisMonthCheck')}</span>
                          <span className="text-[11px] font-normal text-gray-400">({t('nextInstallmentPayment')}: {inst.nextPaymentDate})</span>
                        </span>
                      ) : (
                        <span className="font-bold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                          <Calendar className="w-3.5 h-3.5" />
                          {t('nextInstallmentPayment')}: {inst.nextPaymentDate}
                          {daysRemaining !== null && (
                            <span className="text-[11px] font-normal text-gray-400">
                              ({daysRemaining < 0 ? t('overdue') : `${daysRemaining} ${t('days')}`})
                            </span>
                          )}
                        </span>
                      )
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('allInstallmentsPaid')}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {t('totalLabel')}: {formatCurrency(inst.totalAmount, currencyCode)}
                    </span>
                  </div>

                  {inst.note && (
                    <p className="text-xs text-gray-500 italic bg-gray-50/70 dark:bg-gray-800/20 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800/40">
                      📝 {getLocalizedNote(inst.note, language)}
                    </p>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3.5 mt-3 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                  {/* Row 1: Left tool icons & Right Mode Selector */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditInstallment(inst)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer"
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteInstallment(inst.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {paid > 0 && (
                        <button
                          type="button"
                          onClick={() => onUndoPayment(inst.id)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                          title={t('undo')}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {onSyncInstallmentToCalendar && !isCompleted && (
                        <button
                          type="button"
                          onClick={() => onSyncInstallmentToCalendar(inst)}
                          disabled={syncingCalendarId === inst.id}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            inst.calendarEventId
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                          }`}
                          title={t('addToCalendar')}
                        >
                          {syncingCalendarId === inst.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                          ) : (
                            <Calendar className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Mode Selector: ✋ Manuel vs 🔄 Otomatik */}
                    {!isCompleted && (
                      <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700 text-xs shrink-0">
                        <button
                          type="button"
                          onClick={() => onSetAutoPayment ? onSetAutoPayment(inst.id, false) : onToggleAutoPayment?.(inst.id)}
                          className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            !inst.isAutoPayment
                              ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                          title={t('manualPayment')}
                        >
                          <span>✋ {t('manualPayment')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetAutoPayment ? onSetAutoPayment(inst.id, true) : onToggleAutoPayment?.(inst.id)}
                          className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            inst.isAutoPayment
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                          title={t('autoPayment')}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{t('autoPayment')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Full-width prominent Payment Action Button */}
                  {!isCompleted ? (
                    isPaidThisMonth ? (
                      <button
                        type="button"
                        onClick={() => onPayInstallment(inst.id)}
                        disabled={payingInstallmentId === inst.id}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer ring-2 ring-emerald-400/30"
                      >
                        {payingInstallmentId === inst.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Check className="w-4 h-4 text-white" />
                        )}
                        <span>
                          {payingInstallmentId === inst.id
                            ? '...'
                            : `${t('paidThisMonthCheck')} (+1)`}
                        </span>
                      </button>
                    ) : inst.isAutoPayment ? (
                      <button
                        type="button"
                        onClick={() => onPayInstallment(inst.id)}
                        disabled={payingInstallmentId === inst.id}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 ring-2 ring-blue-400/20"
                      >
                        {payingInstallmentId === inst.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span>
                          {payingInstallmentId === inst.id
                            ? '...'
                            : t('markAsAutoPaid')}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPayInstallment(inst.id)}
                        disabled={payingInstallmentId === inst.id}
                        className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        {payingInstallmentId === inst.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>
                          {payingInstallmentId === inst.id
                            ? '...'
                            : t('payThisMonthInstallment')}
                        </span>
                      </button>
                    )
                  ) : (
                    <div className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{t('debtCleared')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? t('noInstallmentsFound')
                : t('noInstallmentsRegisteredYet')}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {searchTerm || categoryFilter !== 'all'
                ? t('clearSearchFilters')
                : t('addFirstInstallmentPrompt')}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-purple-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addFirstInstallment')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
