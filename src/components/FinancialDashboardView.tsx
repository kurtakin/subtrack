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
  onGoToIncomeSources?: () => void;
  onGoToSavingsFunds?: () => void;
  onGoToTaxCenter?: () => void;
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
  onOpenExportModal,
  onGoToIncomeSources,
  onGoToSavingsFunds,
  onGoToTaxCenter
}) => {
  const { t, language } = useTranslation();
  const currentRegion = getTaxRegion(taxProfile.country, language);

  // Month Selection & View Mode State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [distributionScope, setDistributionScope] = useState<'expenses' | 'all'>('expenses');

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

  // Chart: Expense Breakdown Distribution (Aligned with ViewMode and Scope)
  const expenseDistributionData = useMemo(() => {
    const mult = viewMode === 'annual' ? 12 : 1;
    const items = [
      { name: t('regularPaymentsTitle'), value: Number((monthlyRegularPaymentsExpense * mult).toFixed(2)), color: '#f59e0b' },
      { name: t('installmentPurchases'), value: Number((monthlyInstallmentsExpense * mult).toFixed(2)), color: '#a855f7' },
      { name: t('allSubscriptions'), value: Number((monthlySubscriptionsExpense * mult).toFixed(2)), color: '#3b82f6' }
    ];

    if (distributionScope === 'all') {
      items.push({
        name: t('monthlySavingsContribution'),
        value: Number((totalMonthlySavings * mult).toFixed(2)),
        color: '#10b981'
      });
    }

    return items.filter(item => item.value > 0);
  }, [monthlyRegularPaymentsExpense, monthlyInstallmentsExpense, monthlySubscriptionsExpense, totalMonthlySavings, viewMode, distributionScope, t]);

  const expenseDistributionTotal = useMemo(() => {
    const mult = viewMode === 'annual' ? 12 : 1;
    if (distributionScope === 'all') {
      return (totalMonthlyLivingExpense + totalMonthlySavings) * mult;
    }
    return totalMonthlyLivingExpense * mult;
  }, [totalMonthlyLivingExpense, totalMonthlySavings, viewMode, distributionScope]);

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

  // Chart: 12-Month Projected Annual Net Budget Balance
  const annualMonthlyProjectionData = useMemo(() => {
    const monthNamesTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const names = language === 'tr' ? monthNamesTr : monthNamesEn;
    const currentYear = new Date().getFullYear();

    return names.map((name, idx) => {
      const monthNum = idx + 1;
      const monthKey = `${currentYear}-${String(monthNum).padStart(2, '0')}`;

      let incomeVal = incomes.reduce((acc, inc) => {
        if (inc.status !== 'active') return acc;
        if (inc.frequency === 'annual') {
          if (inc.annualPayoutMonth === monthNum) return acc + inc.amount;
          if (!inc.annualPayoutMonth) return acc + (inc.amount / 12);
          return acc;
        }
        if (inc.frequency === 'irregular') {
          if (inc.targetMonth === monthKey) return acc + inc.amount;
          return acc;
        }
        if (inc.frequency === 'biweekly') {
          return acc + (inc.amount * 26 / 12);
        }
        return acc + inc.amount;
      }, 0);

      const expenseVal = totalMonthlyLivingExpense;
      const savingsVal = totalMonthlySavings;
      const taxBonus = (monthNum === 4 || monthNum === 5) ? (expectedTaxRefund / 2) : 0;
      const netVal = Number(((incomeVal + taxBonus) - expenseVal - savingsVal).toFixed(2));

      return {
        month: name,
        Gelir: Number(incomeVal.toFixed(2)),
        Gider: Number(expenseVal.toFixed(2)),
        Net: netVal
      };
    });
  }, [incomes, totalMonthlyLivingExpense, totalMonthlySavings, expectedTaxRefund, language]);

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

      {/* 2. Top Metric Cards: Gelir vs Gider vs Net Birikim */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      </div>

      {/* 3. Visual Financial Flow Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Monthly Gider Dağılımı (Pie Chart) */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                {distributionScope === 'expenses' ? (language === 'tr' ? 'Aylık Gider Dağılımı' : 'Monthly Expense Breakdown') : t('expenseAndSavingsDistribution')}
              </h2>
              <p className="text-[11px] text-gray-500">
                {distributionScope === 'expenses'
                  ? (viewMode === 'monthly' ? `${t('monthlyTotalExpenses')}: ${formatCurrency(totalMonthlyLivingExpense, currencyCode)}` : `${t('annualTotalExpenses')}: ${formatCurrency(annualTotalExpenses, currencyCode)}`)
                  : (language === 'tr' ? 'Tüm Giderler ve Aylık Birikim Hedefleri' : 'All Expenses and Savings Targets')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-gray-900 dark:text-white block">
                {formatCurrency(expenseDistributionTotal, currencyCode)}{viewMode === 'monthly' ? t('perMonth', '/mo') : (language === 'tr' ? '/yıl' : '/yr')}
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                {distributionScope === 'expenses' ? t('expensesOnly') : t('expensesAndSavings')}
              </span>
            </div>
          </div>

          {/* Scope Selector: Sadece Giderler vs Giderler + Birikim */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setDistributionScope('expenses')}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center",
                distributionScope === 'expenses'
                  ? "bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 font-extrabold shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              {t('expensesOnly')}
            </button>
            <button
              type="button"
              onClick={() => setDistributionScope('all')}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center",
                distributionScope === 'all'
                  ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              {t('expensesAndSavings')}
            </button>
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

          {/* Interactive 12-Month Projected Annual Net Budget Balance Chart */}
          <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {language === 'tr' ? '12 Aylık Net Bütçe Dengesi Grafiği' : '12-Month Net Budget Balance Chart'}
              </span>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {language === 'tr' ? 'Gelir' : 'Income'}
                </span>
                <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  {language === 'tr' ? 'Gider' : 'Expenses'}
                </span>
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  {language === 'tr' ? 'Net Bütçe' : 'Net Budget'}
                </span>
              </div>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualMonthlyProjectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#1f2937' : '#f1f5f9'} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                    tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} 
                  />
                  <ReTooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as any;
                      return (
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 text-xs space-y-1 min-w-[160px]">
                          <p className="font-extrabold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-1">{label}</p>
                          <div className="flex justify-between font-bold text-emerald-600">
                            <span>{language === 'tr' ? 'Gelir:' : 'Income:'}</span>
                            <span>+{formatCurrency(item.Gelir, currencyCode)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-rose-500">
                            <span>{language === 'tr' ? 'Gider:' : 'Expense:'}</span>
                            <span>-{formatCurrency(item.Gider, currencyCode)}</span>
                          </div>
                          <div className="flex justify-between font-black border-t border-gray-100 dark:border-gray-800 pt-1 text-blue-600">
                            <span>{language === 'tr' ? 'Net Bütçe:' : 'Net Budget:'}</span>
                            <span>{item.Net >= 0 ? '+' : ''}{formatCurrency(item.Net, currencyCode)}</span>
                          </div>
                        </div>
                      );
                    }} 
                  />
                  <Bar dataKey="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="Gider" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="Net" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Quick Access to Financial Hub & Category Views */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              {language === 'tr' ? 'Finansal Yönetim & Sayfalara Hızlı Erişim' : 'Financial Hub & Quick Page Access'}
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-medium hidden sm:inline">
            {language === 'tr' ? 'Tüm finansal kategorilerinize tek tıkla ulaşın' : 'Access and manage all financial categories in 1-click'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Income Sources */}
          <button
            type="button"
            onClick={onGoToIncomeSources}
            className="p-4 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 font-black">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">{t('monthlyIncomeSources')}</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold">
                  +{formatCurrency(selectedMonthIncome, currencyCode)}{t('perMonth', '/mo')} • {incomes.length} {language === 'tr' ? 'kaynak' : 'sources'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors shrink-0" />
          </button>

          {/* Savings & Target Funds */}
          <button
            type="button"
            onClick={onGoToSavingsFunds}
            className="p-4 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 rounded-2xl border border-blue-200/70 dark:border-blue-800/50 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 font-black">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">{t('savingsTargets')}</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 font-extrabold">
                  {formatCurrency(totalMonthlySavings, currencyCode)}{t('perMonth', '/mo')} • {savings.length} {language === 'tr' ? 'hedef fon' : 'funds'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </button>

          {/* Regular Payments */}
          <button
            type="button"
            onClick={onGoToRegularPayments}
            className="p-4 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 rounded-2xl border border-amber-200/70 dark:border-amber-800/50 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-black">
                <Home className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">{t('regularPaymentsTitle')}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-extrabold">
                  {formatCurrency(monthlyRegularPaymentsExpense, currencyCode)}{t('perMonth', '/mo')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors shrink-0" />
          </button>

          {/* Installments */}
          <button
            type="button"
            onClick={onGoToInstallments}
            className="p-4 bg-purple-50/50 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 rounded-2xl border border-purple-200/70 dark:border-purple-800/50 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 font-black">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">{t('installmentPurchases')}</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-400 font-extrabold">
                  {formatCurrency(monthlyInstallmentsExpense, currencyCode)}{t('perMonth', '/mo')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors shrink-0" />
          </button>

          {/* Subscriptions */}
          <button
            type="button"
            onClick={onGoToSubscriptions}
            className="p-4 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 rounded-2xl border border-blue-200/70 dark:border-blue-800/50 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 font-black">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">{t('allSubscriptions')}</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 font-extrabold">
                  {formatCurrency(monthlySubscriptionsExpense, currencyCode)}{t('perMonth', '/mo')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </button>

          {/* Tax Center */}
          <button
            type="button"
            onClick={onGoToTaxCenter}
            className="p-4 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-2xl border border-indigo-200/70 dark:border-indigo-800/50 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 font-black">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">{language === 'tr' ? 'Vergi Yönetimi & İade' : 'Tax Center & Refund'}</p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-extrabold">
                  +{formatCurrency(expectedTaxRefund, currencyCode)} {language === 'tr' ? 'iade' : 'refund'} • {currentRegion.flag}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
