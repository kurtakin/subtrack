/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Landmark,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Briefcase,
  Home,
  CreditCard,
  ShoppingBag,
  Percent,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  FileText,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Layers,
  Info,
  Upload,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  IncomeItem,
  SavingsTarget,
  TaxProfile,
  Subscription,
  Installment,
  RegularPayment
} from '../types';
import { getTaxRegion } from '../constants/taxRegions';
import { useTranslation } from '../context/LanguageContext';
import { translateTitle, getLocalizedNote } from '../utils/itemTranslator';
import { cn } from '../lib/utils';

interface FinancialDashboardViewProps {
  incomes: IncomeItem[];
  savings: SavingsTarget[];
  taxProfile: TaxProfile;
  subscriptions: Subscription[];
  installments: Installment[];
  regularPayments: RegularPayment[];
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
  onOpenAddIncomeModal: () => void;
  onEditIncome: (inc: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
  onOpenAddSavingsModal: () => void;
  onEditSavings: (sav: SavingsTarget) => void;
  onDeleteSavings: (id: string) => void;
  onOpenTaxSettingsModal: () => void;
  onGoToSubscriptions: () => void;
  onGoToInstallments: () => void;
  onGoToRegularPayments: () => void;
  onOpenImportModal?: () => void;
  onOpenExportModal?: () => void;
}

export const FinancialDashboardView: React.FC<FinancialDashboardViewProps> = ({
  incomes,
  savings,
  taxProfile,
  subscriptions,
  installments,
  regularPayments,
  currencyCode = 'USD',
  formatCurrency,
  onOpenAddIncomeModal,
  onEditIncome,
  onDeleteIncome,
  onOpenAddSavingsModal,
  onEditSavings,
  onDeleteSavings,
  onOpenTaxSettingsModal,
  onGoToSubscriptions,
  onGoToInstallments,
  onGoToRegularPayments,
  onOpenImportModal,
  onOpenExportModal
}) => {
  const { t, language } = useTranslation();
  const currentRegion = getTaxRegion(taxProfile.country, language);

  // Month Selection & View Mode State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');

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
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  // --- Calculations ---
  // Helper: Calculate exact income for any given month (YYYY-MM)
  const calcIncomeForMonth = (mKey: string) => {
    const [, mStr] = mKey.split('-');
    const monthNum = parseInt(mStr, 10) || 1;

    return incomes
      .filter(i => i.status === 'active')
      .reduce((acc, curr) => {
        // If income is target-specific to a specific month (e.g. irregular / one-off)
        if (curr.targetMonth) {
          return curr.targetMonth === mKey ? acc + curr.amount : acc;
        }
        if (curr.frequency === 'biweekly') {
          return acc + (curr.amount * 26) / 12;
        }
        if (curr.frequency === 'annual') {
          // If specific payout month is chosen, it is received in that month
          if (curr.annualPayoutMonth) {
            return curr.annualPayoutMonth === monthNum ? acc + curr.amount : acc;
          }
          // Otherwise evenly distributed across 12 months
          return acc + curr.amount / 12;
        }
        if (curr.frequency === 'irregular') {
          return curr.targetMonth === mKey ? acc + curr.amount : (curr.targetMonth ? acc : acc + curr.amount);
        }
        return acc + curr.amount;
      }, 0);
  };

  // 1. Dynamic Monthly Income for Selected Month
  const selectedMonthIncome = useMemo(() => {
    return calcIncomeForMonth(selectedMonth);
  }, [incomes, selectedMonth]);

  const totalMonthlyIncome = selectedMonthIncome;

  // 12-Month Year Projections (Sum of each month for the selected year)
  const annualTotalIncome = useMemo(() => {
    const [yearStr] = selectedMonth.split('-');
    const y = parseInt(yearStr, 10) || new Date().getFullYear();
    let sum = 0;
    for (let m = 1; m <= 12; m++) {
      const mKey = `${y}-${String(m).padStart(2, '0')}`;
      sum += calcIncomeForMonth(mKey);
    }
    return sum;
  }, [incomes, selectedMonth]);

  // 12-Month Overview array for visual selector
  const yearMonthlyIncomes = useMemo(() => {
    const [yearStr] = selectedMonth.split('-');
    const y = parseInt(yearStr, 10) || new Date().getFullYear();
    const months = [];
    const monthLabelsTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const monthLabelsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 1; m <= 12; m++) {
      const mKey = `${y}-${String(m).padStart(2, '0')}`;
      const amount = calcIncomeForMonth(mKey);
      months.push({
        monthKey: mKey,
        monthNum: m,
        label: language === 'tr' ? monthLabelsTr[m - 1] : monthLabelsEn[m - 1],
        amount,
        isSelected: mKey === selectedMonth
      });
    }
    return months;
  }, [incomes, selectedMonth, language]);

  // 2. Monthly Expenses Breakdowns
  const monthlySubscriptionsExpense = useMemo(() => {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((acc, curr) => {
        return acc + (curr.billingCycle === 'yearly' ? curr.amount / 12 : curr.amount);
      }, 0);
  }, [subscriptions]);

  const monthlyInstallmentsExpense = useMemo(() => {
    return installments
      .filter(i => i.status === 'active')
      .reduce((acc, curr) => acc + (curr.monthlyAmount || 0), 0);
  }, [installments]);

  const monthlyRegularPaymentsExpense = useMemo(() => {
    return regularPayments
      .filter(p => p.status === 'active')
      .reduce((acc, curr) => {
        if (curr.frequency === 'quarterly') return acc + (curr.amount / 3);
        if (curr.frequency === 'annual') return acc + (curr.amount / 12);
        return acc + curr.amount;
      }, 0);
  }, [regularPayments]);

  const totalMonthlyLivingExpense = useMemo(() => {
    return monthlySubscriptionsExpense + monthlyInstallmentsExpense + monthlyRegularPaymentsExpense;
  }, [monthlySubscriptionsExpense, monthlyInstallmentsExpense, monthlyRegularPaymentsExpense]);

  // 3. Monthly Savings Contribution
  const totalMonthlySavings = useMemo(() => {
    return savings.reduce((acc, curr) => acc + (curr.monthlyContribution || 0), 0);
  }, [savings]);

  // 4. Net Monthly Balance & Savings Rate
  const netMonthlyFreeCashFlow = useMemo(() => {
    return totalMonthlyIncome - totalMonthlyLivingExpense - totalMonthlySavings;
  }, [totalMonthlyIncome, totalMonthlyLivingExpense, totalMonthlySavings]);

  const savingsRatePercent = useMemo(() => {
    if (totalMonthlyIncome <= 0) return 0;
    return Math.min(100, Math.max(0, ((totalMonthlySavings + Math.max(0, netMonthlyFreeCashFlow)) / totalMonthlyIncome) * 100));
  }, [totalMonthlyIncome, totalMonthlySavings, netMonthlyFreeCashFlow]);

  // 5. Annual Projections (Net Gelir - Gider + Vergi İadesi)
  const annualTotalExpenses = totalMonthlyLivingExpense * 12;
  const annualTotalSavings = totalMonthlySavings * 12;
  const expectedTaxRefund = taxProfile.expectedAnnualTaxRefund || 0;
  const annualNetSavingsPotential = (annualTotalIncome - annualTotalExpenses) + expectedTaxRefund;

  // Chart: Expense Breakdown Distribution
  const expenseDistributionData = useMemo(() => {
    return [
      { name: t('regularPaymentsTitle'), value: Number(monthlyRegularPaymentsExpense.toFixed(2)), color: '#f59e0b' },
      { name: t('installmentPurchases'), value: Number(monthlyInstallmentsExpense.toFixed(2)), color: '#a855f7' },
      { name: t('allSubscriptions'), value: Number(monthlySubscriptionsExpense.toFixed(2)), color: '#3b82f6' },
      { name: t('monthlySavingsContribution'), value: Number(totalMonthlySavings.toFixed(2)), color: '#10b981' }
    ].filter(item => item.value > 0);
  }, [monthlyRegularPaymentsExpense, monthlyInstallmentsExpense, monthlySubscriptionsExpense, totalMonthlySavings, t]);

  // Chart: Monthly Cash Flow (Income vs Expenses vs Savings)
  const cashFlowBarData = useMemo(() => {
    return [
      {
        name: t('monthlyTotalExpenses'),
        Gelir: Number(totalMonthlyIncome.toFixed(2)),
        Giderler: Number(totalMonthlyLivingExpense.toFixed(2)),
        Birikim: Number(totalMonthlySavings.toFixed(2)),
        NetKalan: Number(Math.max(0, netMonthlyFreeCashFlow).toFixed(2))
      }
    ];
  }, [totalMonthlyIncome, totalMonthlyLivingExpense, totalMonthlySavings, netMonthlyFreeCashFlow, t]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 dark:from-emerald-950/30 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-3xl border border-emerald-200/50 dark:border-emerald-800/40">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  {t('financialDashboard')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {currentRegion.flag} {language === 'tr' ? (currentRegion.code === 'CA' ? 'Kanada' : currentRegion.code === 'US' ? 'ABD' : currentRegion.countryName) : (currentRegion.code === 'CA' ? 'Canada' : currentRegion.code === 'US' ? 'USA' : currentRegion.countryName)} {t('taxSeasonReminder')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {t('dashboardSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              title={t('export')}
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{t('export')}</span>
            </button>
          )}

          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              title={t('import')}
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>{t('import')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTaxSettingsModal}
            className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
            title={t('configureTaxRefundGoal', 'Configure tax refund target and country tax calendar')}
          >
            <Landmark className="w-4 h-4 text-indigo-600" />
            <span>{t('taxSettingsAndRefund')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddSavingsModal}
            className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
          >
            <PiggyBank className="w-4 h-4 text-blue-600" />
            <span>{t('addSavingsTarget')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddIncomeModal}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t('addIncome')}</span>
          </button>
        </div>
      </div>

      {/* Month Navigation & View Mode (Monthly vs Annual) Switcher */}
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
            <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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

        {/* View Mode Toggle: Monthly vs Annual */}
        <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === 'monthly'
                ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-extrabold ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('monthlyView', 'Aylık Görünüm')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('annual')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === 'annual'
                ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-extrabold ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t('annualView', 'Yıllık Toplam')}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards: Gelir vs Gider vs Net vs Vergi İadesi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Toplam Gelir (Aylık veya Yıllık) */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              {viewMode === 'monthly' ? `${t('monthlyTotalIncome')} (${selectedMonthName})` : `${t('annualTotalIncome')} (${selectedMonth.split('-')[0]})`}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(viewMode === 'monthly' ? selectedMonthIncome : annualTotalIncome, currencyCode)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold pt-1">
            <span>{incomes.length} {t('monthlyIncomeSources').toLowerCase()}</span>
            <span className="text-emerald-600 font-bold">
              {viewMode === 'monthly' 
                ? `${language === 'tr' ? 'Yıllık Projeksiyon' : 'Annual Projection'}: ${formatCurrency(annualTotalIncome, currencyCode)}` 
                : `${language === 'tr' ? 'Aylık Ortalama' : 'Monthly Avg'}: ${formatCurrency(annualTotalIncome / 12, currencyCode)}`}
            </span>
          </div>
        </div>

        {/* Card 2: Toplam Yaşam Gideri */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              {viewMode === 'monthly' ? `${t('monthlyTotalExpenses')} (${selectedMonthName})` : t('annualTotalExpenses')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(viewMode === 'monthly' ? totalMonthlyLivingExpense : annualTotalExpenses, currencyCode)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold pt-1">
            <span>{t('bills')}, {t('installments')}, {t('subscriptions')}</span>
            <span className="text-rose-600 font-bold">
              {viewMode === 'monthly'
                ? `${t('annualTotalExpenses')}: ${formatCurrency(annualTotalExpenses, currencyCode)}`
                : `${t('monthlyAverage', 'Aylık Ortalama')}: ${formatCurrency(totalMonthlyLivingExpense, currencyCode)}`}
            </span>
          </div>
        </div>

        {/* Card 3: Aylık Birikim & Tasarruf Oranı */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{t('monthlySavingsContribution')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
            {formatCurrency(totalMonthlySavings, currencyCode)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold pt-1">
            <span>{t('savingsRate')}:</span>
            <span className="text-blue-600 font-bold">%{savingsRatePercent.toFixed(1)}</span>
          </div>
        </div>

        {/* Card 4: Beklenen Yıllık Vergi İadesi */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              {t('annualTaxRefund')} ({language === 'tr' ? (currentRegion.code === 'CA' ? 'Kanada' : currentRegion.countryName) : (currentRegion.code === 'CA' ? 'Canada' : currentRegion.code === 'US' ? 'USA' : currentRegion.countryName)})
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
            +{formatCurrency(expectedTaxRefund, currencyCode)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold pt-1">
            <span>{formatCurrency(taxProfile.actualReceivedTaxRefund || 0, currencyCode)}</span>
            <button
              onClick={onOpenTaxSettingsModal}
              className="text-indigo-600 hover:underline font-bold cursor-pointer"
            >
              {t('edit')}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Country Tax Alert & Tax Season Reminder Banner */}
      <div className="p-5 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-purple-950/20 rounded-3xl border border-indigo-200/70 dark:border-indigo-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/25 text-xl">
            {currentRegion.flag}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                {currentRegion.countryName} - {taxProfile.taxYear} {t('taxSeasonReminder')}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-200/70 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
                {t('taxAuthority')}: {currentRegion.taxAuthority}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              <strong>{t('filingDeadline')}:</strong> {currentRegion.filingDeadline} • <strong>{t('refundPeriod')}:</strong> {currentRegion.refundPeriod}
            </p>
            {taxProfile.taxPeriodReminderNote && (
              <p className="text-xs text-indigo-800 dark:text-indigo-300 font-semibold mt-1 bg-white/60 dark:bg-gray-900/60 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                📌 {getLocalizedNote(taxProfile.taxPeriodReminderNote, language)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={onOpenTaxSettingsModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
          >
            {t('taxSettingsAndRefund')}
          </button>
        </div>
      </div>

      {/* 4. Visual Financial Flow Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Monthly Gider Dağılımı (Pie Chart) */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                {t('expenseAndSavingsDistribution')}
              </h2>
              <p className="text-[11px] text-gray-500">{t('dashboardSubtitle')}</p>
            </div>
            <span className="text-xs font-black text-gray-900 dark:text-white">
              {formatCurrency(totalMonthlyLivingExpense + totalMonthlySavings, currencyCode)}{t('perMonth', '/mo')}
            </span>
          </div>

          <div className="h-[220px] w-full">
            {expenseDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={expenseDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val) || 0, currencyCode), t('amount')]}
                  />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                {t('all')}
              </div>
            )}
          </div>

          {/* Quick Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {expenseDistributionData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="truncate">
                  <p className="text-[10px] text-gray-500 truncate">{item.name}</p>
                  <p className="font-extrabold text-[11px] text-gray-900 dark:text-white">{formatCurrency(item.value, currencyCode)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center & Right: Yıllık Net Gelir-Gider Tablosu & Nakit Akışı */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  {t('monthlyCashFlowBalance')}
                </h2>
                <p className="text-[11px] text-gray-500">{language === 'tr' ? '12 Aylık Net Nakit Akışı + Yıllık Vergi İadesi' : '12-Month Net Cash Flow + Annual Tax Refund'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-bold block">{t('netSavingsPotential')}</span>
                <span className={`text-lg font-black ${annualNetSavingsPotential >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {annualNetSavingsPotential >= 0 ? '+' : ''}{formatCurrency(annualNetSavingsPotential, currencyCode)}
                </span>
              </div>
            </div>

            {/* Annual Breakdown Summary Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('annualTotalIncome')}</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{formatCurrency(annualTotalIncome, currencyCode)}</p>
              </div>
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('annualTotalExpenses')}</p>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400">-{formatCurrency(annualTotalExpenses, currencyCode)}</p>
              </div>
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('monthlySavingsContribution')}</p>
                <p className="text-sm font-black text-blue-600 dark:text-blue-400">{formatCurrency(annualTotalSavings, currencyCode)}</p>
              </div>
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('annualTaxRefund')}</p>
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">+{formatCurrency(expectedTaxRefund, currencyCode)}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar of Income Utilization */}
          <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-500">{t('expenseAndSavingsDistribution')}</span>
              <span className="text-gray-900 dark:text-white">
                {t('monthlyTotalExpenses')}: %{totalMonthlyIncome > 0 ? Math.round((totalMonthlyLivingExpense / totalMonthlyIncome) * 100) : 0} • {t('monthlySavingsContribution')}: %{savingsRatePercent.toFixed(0)} • {t('freeCashFlow')}: {formatCurrency(Math.max(0, netMonthlyFreeCashFlow), currencyCode)}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalMonthlyIncome > 0 ? Math.min(100, (totalMonthlyLivingExpense / totalMonthlyIncome) * 100) : 0}%` }}
                className="bg-rose-500 h-full"
                title={t('monthlyTotalExpenses')}
              />
              <div
                style={{ width: `${totalMonthlyIncome > 0 ? Math.min(100, (totalMonthlySavings / totalMonthlyIncome) * 100) : 0}%` }}
                className="bg-blue-500 h-full"
                title={t('monthlySavingsContribution')}
              />
              <div
                style={{ width: `${totalMonthlyIncome > 0 ? Math.min(100, (Math.max(0, netMonthlyFreeCashFlow) / totalMonthlyIncome) * 100) : 0}%` }}
                className="bg-emerald-500 h-full"
                title={t('freeCashFlow')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Incomes List & Savings Targets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Gelir Kaynakları */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <span>{t('monthlyIncomeSources')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold">
                  {incomes.length}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('monthlyTotalIncome')}: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{formatCurrency(selectedMonthIncome, currencyCode)}</strong> ({selectedMonthName})
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddIncomeModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addIncome')}</span>
            </button>
          </div>

          {/* 12-Month Interactive Trend Bar & Month Selector */}
          <div className="p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'tr' ? 'Aylara Göre Değişen Gelir Dağılımı' : 'Monthly Income Distribution'}</span>
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-extrabold">
                {selectedMonthName}: {formatCurrency(selectedMonthIncome, currencyCode)}
              </span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-1">
              {yearMonthlyIncomes.map((m) => (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => setSelectedMonth(m.monthKey)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer border text-[11px]",
                    m.isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 font-black shadow-xs scale-105"
                      : "bg-gray-50 dark:bg-gray-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-800 font-semibold"
                  )}
                  title={`${m.label}: ${formatCurrency(m.amount, currencyCode)}`}
                >
                  <span className="text-[10px] uppercase font-bold">{m.label}</span>
                  <span className={cn("text-[9px] mt-0.5 truncate max-w-full font-extrabold", m.isSelected ? "text-white" : "text-emerald-600 dark:text-emerald-400")}>
                    {m.amount > 0 ? formatCurrency(m.amount, currencyCode).replace(/\.\d+/, '') : '-'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {incomes.length > 0 ? (
              incomes.map((inc) => {
                const [, mStr] = selectedMonth.split('-');
                const monthNum = parseInt(mStr, 10) || 1;
                let thisMonthAmount = inc.amount;
                if (inc.frequency === 'biweekly') {
                  thisMonthAmount = (inc.amount * 26) / 12;
                } else if (inc.frequency === 'annual') {
                  if (inc.annualPayoutMonth) {
                    thisMonthAmount = inc.annualPayoutMonth === monthNum ? inc.amount : 0;
                  } else {
                    thisMonthAmount = inc.amount / 12;
                  }
                } else if (inc.frequency === 'irregular' && inc.targetMonth) {
                  thisMonthAmount = inc.targetMonth === selectedMonth ? inc.amount : 0;
                }

                return (
                  <div
                    key={inc.id}
                    className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{translateTitle(inc.name, language)}</h4>
                        <p className="text-[11px] text-gray-500">
                          {inc.frequency === 'biweekly' 
                            ? t('biweekly', 'Every 2 Weeks') 
                            : inc.frequency === 'annual' 
                            ? (inc.annualPayoutMonth ? `${t('annual', 'Annual')} (${inc.annualPayoutMonth}. ${language === 'tr' ? 'Ay' : 'Month'})` : t('annual', 'Annual'))
                            : inc.frequency === 'irregular' && inc.targetMonth
                            ? `${language === 'tr' ? 'Dönemsel' : 'Irregular'} (${inc.targetMonth})`
                            : t('monthlyRegular', 'Monthly Regular')}
                          {inc.receivedDay ? ` • ${t('dayOfMonth', 'Day {day} of month').replace('{day}', String(inc.receivedDay))}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(thisMonthAmount, currencyCode)}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          {inc.frequency === 'annual' && inc.annualPayoutMonth
                            ? (inc.annualPayoutMonth === monthNum ? (language === 'tr' ? 'Bu Ay Ödenir' : 'Paid This Month') : (language === 'tr' ? 'Bu Ay Yok' : 'None This Month'))
                            : inc.frequency === 'annual'
                            ? (language === 'tr' ? 'Aylık Pay' : 'Monthly Share')
                            : inc.frequency === 'irregular' && inc.targetMonth
                            ? (inc.targetMonth === selectedMonth ? (language === 'tr' ? 'Bu Ay Ödenir' : 'Paid This Month') : (language === 'tr' ? 'Bu Ay Yok' : 'None This Month'))
                            : inc.isRegular ? t('guaranteedIncome', 'Guaranteed Income') : t('variableIncome', 'Variable Income')}
                        </p>
                      </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditIncome(inc)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        title={t('edit', 'Edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteIncome(inc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title={t('delete', 'Delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
            ) : (
              <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-bold">{t('noIncomeSourcesYet', 'No income sources recorded yet.')}</p>
                <button
                  type="button"
                  onClick={onOpenAddIncomeModal}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t('addFirstIncome', 'Add Your First Income')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Para Biriktirme & Tasarruf Hedefleri */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <PiggyBank className="w-5 h-5 text-blue-600" />
                <span>{t('savingsTargets')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-extrabold">
                  {savings.length}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('monthlySavingsContribution')}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddSavingsModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addSavingsTarget')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {savings.length > 0 ? (
              savings.map((sav) => {
                const target = sav.targetAmount || 1;
                const current = sav.currentAmount || 0;
                const percent = Math.min(100, Math.round((current / target) * 100));

                return (
                  <div
                    key={sav.id}
                    className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2.5 hover:border-blue-200 dark:hover:border-blue-900/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{translateTitle(sav.title, language)}</h4>
                          <p className="text-[11px] text-gray-500">
                            {t('monthlySavingsContribution')}: <strong className="text-blue-600">{formatCurrency(sav.monthlyContribution, currencyCode)}{t('perMonth', '/mo')}</strong>
                            {sav.deadline ? ` • ${sav.deadline}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-xs font-black text-gray-900 dark:text-white">
                            {formatCurrency(current, currencyCode)}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-bold">
                            / {formatCurrency(target, currencyCode)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onEditSavings(sav)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title={t('edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSavings(sav.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                        <span>%{percent}</span>
                        <span>{formatCurrency(Math.max(0, target - current), currencyCode)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <PiggyBank className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-bold">{t('noSavingsTargetsYet', 'No savings targets registered yet.')}</p>
                <button
                  type="button"
                  onClick={onOpenAddSavingsModal}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t('addSavingsTarget')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Quick Cross-Links to Gider Sayfaları */}
      <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          {t('quickLinksToExpensePages')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={onGoToRegularPayments}
            className="p-3.5 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-left transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Home className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white">{t('regularPaymentsTitle')}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">{formatCurrency(monthlyRegularPaymentsExpense, currencyCode)}{t('perMonth', '/mo')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={onGoToInstallments}
            className="p-3.5 bg-purple-50/50 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 text-left transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white">{t('installmentPurchases')}</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-400 font-bold">{formatCurrency(monthlyInstallmentsExpense, currencyCode)}{t('perMonth', '/mo')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={onGoToSubscriptions}
            className="p-3.5 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 text-left transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white">{t('allSubscriptions')}</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">{formatCurrency(monthlySubscriptionsExpense, currencyCode)}{t('perMonth', '/mo')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
