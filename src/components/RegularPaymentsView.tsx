/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Zap,
  Droplets,
  Flame,
  Smartphone,
  Building,
  User,
  Shield,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Filter,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  RotateCcw,
  Tag,
  DollarSign,
  ArrowUpDown,
  Hash,
  Upload,
  Download,
  History,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { RegularPayment, RegularPaymentCategory } from '../types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useTranslation } from '../context/LanguageContext';
import { translateTitle, getLocalizedNote } from '../utils/itemTranslator';
import { cn } from '../lib/utils';

interface RegularPaymentsViewProps {
  payments: RegularPayment[];
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
  onOpenAddModal: () => void;
  onEditPayment: (payment: RegularPayment) => void;
  onDeletePayment: (id: string) => void;
  onPayPayment: (id: string) => void;
  onUndoPayment: (id: string) => void;
  onSetAutoPayment?: (id: string, isAuto: boolean) => void;
  onToggleAutoPayment?: (id: string) => void;
  onSyncToCalendar?: (payment: RegularPayment) => void;
  syncingCalendarId?: string | null;
  payingPaymentId?: string | null;
  onOpenCalendarModal?: () => void;
  onOpenImportModal?: () => void;
  onOpenExportModal?: () => void;
}

const CATEGORY_CONFIG: Record<RegularPaymentCategory, { labelKey: 'rent' | 'electricity' | 'water' | 'gas' | 'phoneInternet' | 'dues' | 'person' | 'institution' | 'insurance' | 'other'; icon: any; color: string; badgeBg: string }> = {
  rent: { labelKey: 'rent', icon: Home, color: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' },
  electricity: { labelKey: 'electricity', icon: Zap, color: 'text-yellow-600 dark:text-yellow-400', badgeBg: 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200' },
  water: { labelKey: 'water', icon: Droplets, color: 'text-cyan-600 dark:text-cyan-400', badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200' },
  gas: { labelKey: 'gas', icon: Flame, color: 'text-orange-600 dark:text-orange-400', badgeBg: 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200' },
  phone_internet: { labelKey: 'phoneInternet', icon: Smartphone, color: 'text-indigo-600 dark:text-indigo-400', badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200' },
  dues: { labelKey: 'dues', icon: Building, color: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' },
  person: { labelKey: 'person', icon: User, color: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200' },
  institution: { labelKey: 'institution', icon: Building, color: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200' },
  insurance: { labelKey: 'insurance', icon: Shield, color: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200' },
  other: { labelKey: 'other', icon: CreditCard, color: 'text-gray-600 dark:text-gray-400', badgeBg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300' }
};

export const RegularPaymentsView: React.FC<RegularPaymentsViewProps> = ({
  payments,
  currencyCode = 'USD',
  formatCurrency,
  onOpenAddModal,
  onEditPayment,
  onDeletePayment,
  onPayPayment,
  onUndoPayment,
  onSetAutoPayment,
  onToggleAutoPayment,
  onSyncToCalendar,
  syncingCalendarId,
  payingPaymentId,
  onOpenCalendarModal,
  onOpenImportModal,
  onOpenExportModal
}) => {
  const { t, language } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  const selectedDate = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1);
  }, [selectedMonth]);

  const selectedMonthName = useMemo(() => {
    try {
      const locale = language === 'tr' ? 'tr-TR' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : language === 'it' ? 'it-IT' : 'en-US';
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedDate);
    } catch {
      return selectedMonth;
    }
  }, [selectedDate, language, selectedMonth]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  const isPaymentPaidInSelectedMonth = (p: RegularPayment, mKey: string = selectedMonth) => {
    if (p.paidMonths && p.paidMonths.includes(mKey)) return true;
    if (p.paymentHistory && p.paymentHistory.some(h => h.month === mKey)) return true;
    if (p.lastPaidMonth === mKey) return true;
    return false;
  };

  // Stats Calculations for the Selected Month
  const stats = useMemo(() => {
    const active = payments.filter(p => p.status === 'active');
    const getMonthlyEquivalent = (curr: RegularPayment) => {
      if (curr.frequency === 'quarterly') return (curr.amount || 0) / 3;
      if (curr.frequency === 'annual') return (curr.amount || 0) / 12;
      if (curr.frequency === 'bimonthly') return (curr.amount || 0) / 2;
      return curr.amount || 0;
    };

    const totalMonthlyCommitment = active.reduce((acc, curr) => acc + getMonthlyEquivalent(curr), 0);

    const paidThisMonthList = active.filter(p => isPaymentPaidInSelectedMonth(p, selectedMonth));
    const paidThisMonthTotal = paidThisMonthList.reduce((acc, curr) => acc + getMonthlyEquivalent(curr), 0);

    const pendingThisMonthList = active.filter(p => !isPaymentPaidInSelectedMonth(p, selectedMonth));
    const pendingThisMonthTotal = pendingThisMonthList.reduce((acc, curr) => acc + getMonthlyEquivalent(curr), 0);

    const fixedCount = active.filter(p => p.amountType === 'fixed').length;
    const variableCount = active.filter(p => p.amountType === 'variable').length;

    return {
      totalCount: active.length,
      totalMonthlyCommitment,
      paidThisMonthCount: paidThisMonthList.length,
      paidThisMonthTotal,
      pendingThisMonthCount: pendingThisMonthList.length,
      pendingThisMonthTotal,
      fixedCount,
      variableCount
    };
  }, [payments, selectedMonth]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPayee = p.payee?.toLowerCase().includes(q);
        const matchesSubscriber = p.accountOrSubscriberNo?.toLowerCase().includes(q);
        const matchesNote = p.note?.toLowerCase().includes(q);
        if (!matchesName && !matchesPayee && !matchesSubscriber && !matchesNote) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      // Frequency filter
      if (frequencyFilter !== 'all' && p.frequency !== frequencyFilter) {
        return false;
      }

      // Status filter for selected month
      const isPaid = isPaymentPaidInSelectedMonth(p, selectedMonth);
      if (statusFilter === 'paid' && !isPaid) return false;
      if (statusFilter === 'pending' && isPaid) return false;

      return true;
    });
  }, [payments, searchTerm, categoryFilter, frequencyFilter, statusFilter, selectedMonth]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/20 rounded-3xl border border-amber-200/50 dark:border-amber-800/40">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  {t('regularPaymentsTitle')}
                </h1>
                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold">
                  {stats.totalCount} {t('regularPayments')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {t('regularPaymentsSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
              title={t('export')}
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span>{t('export')}</span>
            </button>
          )}

          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
              title={t('import')}
            >
              <Upload className="w-4 h-4 text-amber-600" />
              <span>{t('import')}</span>
            </button>
          )}

          {onOpenCalendarModal && (
            <button
              type="button"
              onClick={onOpenCalendarModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
              title={t('syncWithGoogleCalendar', 'Add payments to your Google / Gmail Calendar')}
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>{t('syncCalendar')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-amber-500/30 cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t('newRegularPayment')}</span>
          </button>
        </div>
      </div>

      {/* Month Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer border border-gray-200/60 dark:border-gray-700"
            title="Önceki Ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700">
            <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-extrabold text-gray-900 dark:text-white capitalize">
              {selectedMonthName}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer border border-gray-200/60 dark:border-gray-700"
            title="Sonraki Ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <span>{language === 'tr' ? 'Seçili Ay' : 'Selected'}:</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 font-extrabold">
            {formatCurrency(stats.paidThisMonthTotal, currencyCode)} {t('paidThisMonth').toLowerCase()}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 font-extrabold">
            {formatCurrency(stats.pendingThisMonthTotal, currencyCode)} {t('pending').toLowerCase()}
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{t('monthlyTotalExpense')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(stats.totalMonthlyCommitment, currencyCode)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
            <span>{stats.totalCount} {t('registeredPaymentsList').toLowerCase()}</span>
          </div>
        </div>

        {/* Paid This Month */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{t('paidThisMonth')} ({selectedMonthName})</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.paidThisMonthTotal, currencyCode)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
            <span>{stats.paidThisMonthCount} {t('completed').toLowerCase()}</span>
          </div>
        </div>

        {/* Pending This Month */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{t('pendingThisMonth')}</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
            {formatCurrency(stats.pendingThisMonthTotal, currencyCode)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
            <span>{stats.pendingThisMonthCount} {t('pending').toLowerCase()}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{t('expenseStructure')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs text-gray-400 font-semibold">{t('fixedRent')}</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{stats.fixedCount}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-semibold">{t('variableUtility')}</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{stats.variableCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchRegularPaymentsPlaceholder', 'Search payment, payee, or account no...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Status Filter */}
            <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t('all')}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t('pending')}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t('paid')}
              </button>
            </div>

            {/* Frequency Filter */}
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="all">{t('all')}</option>
              <option value="monthly">{t('regularMonthly')}</option>
              <option value="irregular">{t('irregularOnBill')}</option>
              <option value="bimonthly">{t('periodic')}</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
              categoryFilter === 'all'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-200/70 dark:border-gray-700 hover:bg-gray-100'
            }`}
          >
            {t('all')} ({payments.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([catKey, conf]) => {
            const count = payments.filter(p => p.category === catKey).length;
            if (count === 0 && categoryFilter !== catKey) return null;
            const Icon = conf.icon;
            const isSelected = categoryFilter === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setCategoryFilter(isSelected ? 'all' : catKey)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-200/70 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t(conf.labelKey)}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Header: Title & Quick Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
            <Home className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{t('registeredBillsAndPayments', 'Registered Payments and Bills')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold">
              {filteredPayments.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('regularPaymentsSubtitle', 'Track due dates and manage your recurring bills and payments.')}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t('addNewPayment', '+ Add New Payment')}</span>
        </button>
      </div>

      {/* Cards Grid */}
      {filteredPayments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPayments.map((payment) => {
            const isPaidInSelected = isPaymentPaidInSelectedMonth(payment, selectedMonth);
            const todayStr = new Date().toISOString().split('T')[0];
            const isDueOrPast = Boolean(payment.nextPaymentDate && payment.nextPaymentDate <= todayStr);
            const isAutoPaidDue = Boolean(payment.isAutoPayment && isDueOrPast);
            const isCardGreen = isPaidInSelected || isAutoPaidDue || Boolean(payment.isAutoPayment);
            const catConfig = CATEGORY_CONFIG[payment.category] || CATEGORY_CONFIG.other;
            const CatIcon = catConfig.icon;

            let daysRemaining: number | null = null;
            if (payment.nextPaymentDate) {
              try {
                daysRemaining = differenceInDays(parseISO(payment.nextPaymentDate), new Date());
              } catch {}
            }

            return (
              <motion.div
                key={payment.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-5 rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs",
                  isCardGreen
                    ? "bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-gray-900 dark:to-emerald-950/15 border-emerald-300 dark:border-emerald-700/80 shadow-emerald-500/10 hover:border-emerald-400"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-900/40"
                )}
              >
                {/* Top Section */}
                <div className="space-y-4">
                  {/* Header: Icon, Name, Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${catConfig.badgeBg}`}>
                        <CatIcon className={`w-5 h-5 ${catConfig.color}`} />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-gray-900 dark:text-white leading-tight">
                          {translateTitle(payment.name, language)}
                        </h3>
                        {payment.payee && (
                          <p className="text-xs text-gray-500 font-semibold mt-0.5">
                            {payment.payee}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(payment.amount, currencyCode)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {payment.amountType === 'fixed' ? t('fixedAmount') : t('utilityBillAmount')}
                      </p>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${catConfig.badgeBg}`}>
                      <CatIcon className="w-2.5 h-2.5" />
                      <span>{t(catConfig.labelKey)}</span>
                    </span>

                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-semibold rounded-lg">
                      {payment.frequency === 'monthly' ? t('regularMonthly') : payment.frequency === 'irregular' ? t('irregularOnBill') : t('periodic')}
                    </span>

                    {/* Mode Tag */}
                    {payment.isAutoPayment ? (
                      <button
                        type="button"
                        onClick={() => onSetAutoPayment ? onSetAutoPayment(payment.id, false) : onToggleAutoPayment?.(payment.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                        title={t('autoPayment')}
                      >
                        <RefreshCw className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                        <span>{t('autoPayment')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSetAutoPayment ? onSetAutoPayment(payment.id, true) : onToggleAutoPayment?.(payment.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                        title={t('manualPayment')}
                      >
                        <span>✋ {t('manualPayment')}</span>
                      </button>
                    )}

                    {isCardGreen ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-lg shadow-xs" title={isAutoPaidDue ? t('autoPaidGreen', 'Otomatik Ödendi') : t('calendarGreenPaid', 'Ödendi')}>
                        <Check className="w-2.5 h-2.5 text-white" />
                        <span>{isPaidInSelected ? t('paidThisMonthLabel', 'Ödendi') : t('autoPaidGreen', 'Otomatik Ödendi')}</span>
                        {payment.calendarEventId && <Calendar className="w-2.5 h-2.5 text-emerald-200 ml-0.5" />}
                      </span>
                    ) : payment.calendarEventId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <Calendar className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{t('onCalendar')}</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Payment Info Card */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/60 space-y-2 text-xs">
                    {/* Due Date & Countdown */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {t('dueDate')}: {payment.nextPaymentDate}
                        {payment.dueDay ? ` (${t('dayOfMonth').replace('{day}', String(payment.dueDay))})` : ''}
                      </span>
                      {isCardGreen ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isPaidInSelected ? `${selectedMonthName}: ${t('paid', 'Ödendi')}` : t('autoPaidCheck', 'Otomatik Ödendi')}
                        </span>
                      ) : daysRemaining !== null ? (
                        <span className={`font-extrabold ${daysRemaining <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {daysRemaining < 0
                            ? t('overdueBill')
                            : daysRemaining === 0
                            ? t('dueTodayBill')
                            : `${daysRemaining} ${t('daysRemainingBill')}`}
                        </span>
                      ) : null}
                    </div>

                    {/* Account / Subscriber / Card details */}
                    {(payment.accountOrSubscriberNo || payment.bankOrCard) && (
                      <div className="pt-1.5 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between text-[11px] text-gray-500 gap-2 flex-wrap">
                        {payment.accountOrSubscriberNo && (
                          <span className="font-mono bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                            {payment.accountOrSubscriberNo}
                          </span>
                        )}
                        {payment.bankOrCard && (
                          <span className="font-semibold text-gray-600 dark:text-gray-300">
                            💳 {payment.bankOrCard}
                          </span>
                        )}
                      </div>
                    )}

                    {payment.note && (
                      <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200/40 dark:border-gray-700/40">
                        📝 {getLocalizedNote(payment.note, language)}
                      </p>
                    )}
                  </div>

                  {/* Monthly Payment Breakdown Trigger Bar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id);
                    }}
                    className={cn(
                      "w-full mt-1 mb-2.5 py-1.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer border",
                      expandedPaymentId === payment.id
                        ? "bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 shadow-xs"
                        : "bg-gray-50 hover:bg-amber-50/60 dark:bg-gray-800/40 dark:hover:bg-amber-950/30 text-gray-600 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-300 border-gray-100 dark:border-gray-800"
                    )}
                    title={t('monthlyPaymentBreakdown', 'Aylık Fatura & Ödeme Geçmişi')}
                  >
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t('monthlyPaymentBreakdown', 'Aylık Fatura & Ödeme Geçmişi')}</span>
                      <span className="px-1.5 py-0.2 bg-amber-100/80 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-md text-[10px] font-black">
                        {(payment.paidMonths?.length || (payment.lastPaidMonth ? 1 : 0))} {t('months', 'ay')}
                      </span>
                    </span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="font-semibold text-gray-400 dark:text-gray-500">
                        {expandedPaymentId === payment.id ? t('close') : t('view')}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", expandedPaymentId === payment.id && "rotate-180 text-amber-600")} />
                    </div>
                  </button>

                  {/* Expanded Monthly History Drawer */}
                  <AnimatePresence>
                    {expandedPaymentId === payment.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-2 p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs mb-2"
                      >
                        <p className="font-extrabold text-[11px] text-gray-700 dark:text-gray-300 flex items-center justify-between">
                          <span>{t('monthlyPaymentHistory', 'Aylara Göre Ödeme Kayıtları')}</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {payment.amountType === 'fixed' ? t('fixedAmount') : t('utilityBillAmount')}
                          </span>
                        </p>

                        {/* Recent months status list */}
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {(() => {
                            const now = new Date();
                            const pastMonthsList = [];
                            for (let i = 0; i < 6; i++) {
                              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                              const mKey = format(d, 'yyyy-MM');
                              const isPaid = (payment.paidMonths && payment.paidMonths.includes(mKey)) || payment.lastPaidMonth === mKey;
                              const historyRecord = payment.paymentHistory?.find(h => h.month === mKey);
                              pastMonthsList.push({
                                monthKey: mKey,
                                isPaid,
                                historyRecord,
                                label: format(d, 'MMMM yyyy')
                              });
                            }

                            return pastMonthsList.map(item => (
                              <div
                                key={item.monthKey}
                                className={cn(
                                  "p-2 rounded-xl flex items-center justify-between text-[11px] border",
                                  item.isPaid
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                                    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                                )}
                              >
                                <div className="flex items-center gap-1.5 font-bold">
                                  {item.isPaid ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  )}
                                  <span className="capitalize">{item.label}</span>
                                </div>
                                <div className="font-extrabold text-right">
                                  {item.isPaid ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(item.historyRecord?.amount || payment.amount, currencyCode)} ({t('paid', 'Ödendi')})
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">
                                      {formatCurrency(0, currencyCode)} ({t('pending', 'Bekliyor')})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3.5 mt-3 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                  {/* Row 1: Left tool icons & Right Mode Selector */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditPayment(payment)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePayment(payment.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {payment.lastPaidDate && (
                        <button
                          type="button"
                          onClick={() => onUndoPayment(payment.id)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                          title={t('undo')}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {onSyncToCalendar && (
                        <button
                          type="button"
                          onClick={() => onSyncToCalendar(payment)}
                          disabled={syncingCalendarId === payment.id}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            payment.calendarEventId
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          }`}
                          title={t('addToCalendar')}
                        >
                          {syncingCalendarId === payment.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                          ) : (
                            <Calendar className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Mode Selector: ✋ Manuel vs 🔄 Otomatik */}
                    <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => onSetAutoPayment ? onSetAutoPayment(payment.id, false) : onToggleAutoPayment?.(payment.id)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          !payment.isAutoPayment
                            ? 'bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title={t('manualPayment')}
                      >
                        <span>✋ {t('manualPayment')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetAutoPayment ? onSetAutoPayment(payment.id, true) : onToggleAutoPayment?.(payment.id)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          payment.isAutoPayment
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title={t('autoPayment')}
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{t('autoPayment')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Full-width prominent Payment Action Button */}
                  {isCardGreen ? (
                    <button
                      type="button"
                      onClick={() => onPayPayment(payment.id)}
                      disabled={payingPaymentId === payment.id}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer ring-2 ring-emerald-400/30"
                    >
                      {payingPaymentId === payment.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Check className="w-4 h-4 text-white" />
                      )}
                      <span>
                        {payingPaymentId === payment.id
                          ? '...'
                          : `${isPaidInSelected ? `${selectedMonthName} ${t('paidThisMonth')}` : t('autoPaidGreen')} ✓`}
                      </span>
                    </button>
                  ) : payment.isAutoPayment ? (
                    <button
                      type="button"
                      onClick={() => onPayPayment(payment.id)}
                      disabled={payingPaymentId === payment.id}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 ring-2 ring-blue-400/20"
                    >
                      {payingPaymentId === payment.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>
                        {payingPaymentId === payment.id
                          ? '...'
                          : `${selectedMonthName} ${t('markAsAutoPaid')}`}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPayPayment(payment.id)}
                      disabled={payingPaymentId === payment.id}
                      className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                    >
                      {payingPaymentId === payment.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>
                        {payingPaymentId === payment.id
                          ? '...'
                          : `${selectedMonthName} ${t('payBill', 'Öde')}`}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Home className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? t('all')
                : t('registeredPaymentsList')}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {t('regularPaymentsSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newRegularPayment')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
