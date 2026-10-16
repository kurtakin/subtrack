/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Building,
  Gift,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  Search,
  Sparkles,
  ShieldCheck,
  Percent,
  Layers,
  ChevronRight,
  Landmark,
  Store
} from 'lucide-react';
import { IncomeItem, TaxProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { translateTitle } from '../utils/itemTranslator';
import { cn } from '../lib/utils';
import { getTaxRegion } from '../constants/taxRegions';

interface MonthlyIncomeSourcesViewProps {
  incomes: IncomeItem[];
  taxProfile: TaxProfile;
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
  onOpenAddIncomeModal: () => void;
  onEditIncome: (inc: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
  onQuickAddCategory?: (category: IncomeItem['category']) => void;
  onOpenTaxSettingsModal?: () => void;
}

export const MonthlyIncomeSourcesView: React.FC<MonthlyIncomeSourcesViewProps> = ({
  incomes,
  taxProfile,
  currencyCode = 'USD',
  formatCurrency,
  onOpenAddIncomeModal,
  onEditIncome,
  onDeleteIncome,
  onQuickAddCategory,
  onOpenTaxSettingsModal
}) => {
  const { t, language } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');

  const currentRegion = getTaxRegion(taxProfile?.country || 'CA', language);

  // Month breakdown calculations
  const calcIncomeForMonth = (mKey: string) => {
    const [, mStr] = mKey.split('-');
    const monthNum = parseInt(mStr, 10) || 1;
    return incomes.reduce((sum, inc) => {
      if (inc.status === 'paused') return sum;
      if (inc.frequency === 'biweekly') {
        return sum + (inc.amount * 26) / 12;
      }
      if (inc.frequency === 'annual') {
        if (inc.annualPayoutMonth) {
          return sum + (inc.annualPayoutMonth === monthNum ? inc.amount : 0);
        }
        return sum + inc.amount / 12;
      }
      if (inc.frequency === 'irregular') {
        if (inc.targetMonth) {
          return sum + (inc.targetMonth === mKey ? inc.amount : 0);
        }
        return sum;
      }
      return sum + inc.amount;
    }, 0);
  };

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // 12-Month distribution data
  const annualMonths = useMemo(() => {
    const monthNamesTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const names = language === 'tr' ? monthNamesTr : monthNamesEn;

    return Array.from({ length: 12 }, (_, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      const mKey = `${currentYear}-${mStr}`;
      const amount = calcIncomeForMonth(mKey);
      return {
        key: mKey,
        label: names[i],
        monthNum: i + 1,
        amount,
        isSelected: mKey === selectedMonth
      };
    });
  }, [incomes, currentYear, selectedMonth, language]);

  const activeIncomes = useMemo(() => incomes.filter(i => i.status !== 'paused'), [incomes]);

  // Selected month calculations
  const thisMonthGross = useMemo(() => calcIncomeForMonth(selectedMonth), [incomes, selectedMonth]);

  // Annual Gross Projected
  const annualGrossProjected = useMemo(() => {
    return annualMonths.reduce((acc, m) => acc + m.amount, 0);
  }, [annualMonths]);

  // Estimated Tax & Net
  const monthlyTaxRateEstimate = 0.22;
  const estimatedMonthlyTax = thisMonthGross * monthlyTaxRateEstimate;
  const estimatedNetIncome = Math.max(0, thisMonthGross - estimatedMonthlyTax);

  // Guaranteed (regular) vs Variable income
  const guaranteedMonthly = useMemo(() => {
    return activeIncomes
      .filter(i => i.isRegular && i.frequency === 'monthly')
      .reduce((sum, i) => sum + i.amount, 0);
  }, [activeIncomes]);

  const variableMonthly = Math.max(0, thisMonthGross - guaranteedMonthly);

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter(inc => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = inc.name.toLowerCase().includes(q);
        const matchNote = (inc.note || '').toLowerCase().includes(q);
        if (!matchName && !matchNote) return false;
      }
      if (categoryFilter !== 'all' && inc.category !== categoryFilter) {
        return false;
      }
      if (frequencyFilter !== 'all' && inc.frequency !== frequencyFilter) {
        return false;
      }
      return true;
    });
  }, [incomes, searchQuery, categoryFilter, frequencyFilter]);

  // Category Icon & Color mapping
  const getCategoryMeta = (cat: IncomeItem['category']) => {
    switch (cat) {
      case 'salary':
        return {
          icon: Briefcase,
          label: language === 'tr' ? 'Maaş / Ana Gelir' : 'Salary / Main Income',
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'freelance':
        return {
          icon: TrendingUp,
          label: language === 'tr' ? 'Freelance & Danışmanlık' : 'Freelance & Consulting',
          badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'investment':
        return {
          icon: DollarSign,
          label: language === 'tr' ? 'Yatırım & Temettü' : 'Dividends & Yield',
          badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'rental':
        return {
          icon: Building,
          label: language === 'tr' ? 'Kira Geliri' : 'Rental Income',
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'bonus':
        return {
          icon: Gift,
          label: language === 'tr' ? 'Prim & İkramiye' : 'Bonus & Incentive',
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'business':
        return {
          icon: Landmark,
          label: language === 'tr' ? 'Şirket Hasılatı' : 'Business Revenue',
          badgeClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
        };
      case 'commercial':
        return {
          icon: Store,
          label: language === 'tr' ? 'Commercial / Kendi İşi & Ticari' : 'Commercial / Self-Employed',
          badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
        };
      default:
        return {
          icon: HelpCircle,
          label: language === 'tr' ? 'Ek / Diğer Kazanç' : 'Other Income',
          badgeClass: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/15">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold mb-2">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Gelir Portföyü & Kazanç Yönetimi' : 'Income Portfolio & Cash Flow'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('monthlyIncomeSources')}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl font-medium">
            {language === 'tr'
              ? 'Maaş, serbest çalışma, temettü, kira ve yeni kazançlarınızı tek merkezden yönetin. Tüm ek gelir kaynaklarını kolayca ekleyin.'
              : 'Track salary, freelancing, dividends, rental income, and new side hustles in one place. Add any income source easily.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenTaxSettingsModal && (
            <button
              type="button"
              onClick={onOpenTaxSettingsModal}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-md flex items-center gap-1.5 cursor-pointer"
              title={language === 'tr' ? 'Vergi Ayarları' : 'Tax Settings'}
            >
              <Percent className="w-4 h-4" />
              <span>{language === 'tr' ? 'Vergi Profili' : 'Tax Profile'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddIncomeModal}
            className="px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black transition-all shadow-lg shadow-black/10 flex items-center gap-2 cursor-pointer ring-2 ring-white/50"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'tr' ? 'Gelir Ekle' : 'Add Income'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Monthly Income */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Aylık Brüt Gelir' : 'Gross Monthly Income'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(thisMonthGross, currencyCode)}
          </div>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 font-semibold">
            <span>{activeIncomes.length} {language === 'tr' ? 'aktif gelir kaynağı' : 'active sources'}</span>
          </p>
        </div>

        {/* Card 2: Estimated Net Monthly Income */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Tahmini Net Gelir' : 'Est. Net Income'}</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(estimatedNetIncome, currencyCode)}
          </div>
          <p className="text-[11px] text-gray-500 font-semibold">
            %{Math.round(monthlyTaxRateEstimate * 100)} {language === 'tr' ? 'tahmini vergi payı düşülmüş' : 'after estimated tax'}
          </p>
        </div>

        {/* Card 3: Guaranteed vs Variable */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Garantili / Değişken' : 'Guaranteed / Variable'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {thisMonthGross > 0 ? Math.round((guaranteedMonthly / thisMonthGross) * 100) : 0}%
          </div>
          <p className="text-[11px] text-gray-500 font-semibold truncate">
            {formatCurrency(guaranteedMonthly, currencyCode)} {language === 'tr' ? 'sabit garantili' : 'guaranteed'}
          </p>
        </div>

        {/* Card 4: Annual Projected */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Yıllık Projeksiyon' : 'Annual Projected'}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(annualGrossProjected, currencyCode)}
          </div>
          <p className="text-[11px] text-gray-500 font-semibold">
            {currentYear} {language === 'tr' ? 'toplam brüt gelir beklentisi' : 'total expected gross'}
          </p>
        </div>
      </div>

      {/* 12-Month Simulator Strip */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              {language === 'tr' ? '12 Aylık Nakit Akışı & Ay Seçimi' : '12-Month Cashflow Simulator'}
            </h3>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {selectedMonth} ({formatCurrency(thisMonthGross, currencyCode)})
          </span>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {annualMonths.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedMonth(m.key)}
              className={cn(
                "py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all cursor-pointer border",
                m.isSelected
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 font-black scale-102"
                  : "bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-800 hover:border-emerald-200"
              )}
            >
              <span className="text-[11px] uppercase font-bold">{m.label}</span>
              <span className={cn(
                "text-[10px] mt-0.5 truncate max-w-full font-extrabold",
                m.isSelected ? "text-white" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {m.amount > 0 ? formatCurrency(m.amount, currencyCode).replace(/\.\d+/, '') : '-'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add Specific Category Suggestions (Gerekirse bu sayfaya baska kazanclar eklenebilir) */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-blue-950/20 rounded-2xl border border-emerald-100/80 dark:border-emerald-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                {language === 'tr' ? 'Yeni Kazanç veya Ek Gelir Ekleyin' : 'Add New Earnings or Side Hustles'}
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {language === 'tr'
                  ? 'Farklı kazanç türleri için hızlıca yeni gelir kaynağı oluşturabilirsiniz:'
                  : 'Quick shortcuts to add new income streams:'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onOpenAddIncomeModal}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'tr' ? '+ Maaş / Ana Gelir' : '+ Salary'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddIncomeModal}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100/50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'tr' ? '+ Freelance & Danışmanlık' : '+ Freelance'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddIncomeModal}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 hover:bg-purple-100/50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <DollarSign className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'tr' ? '+ Yatırım & Temettü' : '+ Dividend / Yield'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddIncomeModal}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-amber-100/50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Building className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'tr' ? '+ Kira Geliri' : '+ Rental'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'tr' ? 'Gelir kaynağı veya not ara...' : 'Search income sources...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs focus:ring-2 focus:ring-emerald-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <option value="all">{language === 'tr' ? 'Tüm Kategoriler' : 'All Categories'}</option>
            <option value="salary">{language === 'tr' ? 'Maaş / Ana Gelir' : 'Salary'}</option>
            <option value="commercial">{language === 'tr' ? 'Commercial / Kendi İşi & Ticari' : 'Commercial'}</option>
            <option value="freelance">{language === 'tr' ? 'Freelance & Danışmanlık' : 'Freelance'}</option>
            <option value="investment">{language === 'tr' ? 'Yatırım & Temettü' : 'Investment'}</option>
            <option value="rental">{language === 'tr' ? 'Kira Geliri' : 'Rental'}</option>
            <option value="bonus">{language === 'tr' ? 'Prim & İkramiye' : 'Bonus'}</option>
            <option value="business">{language === 'tr' ? 'Şirket Hasılatı' : 'Business'}</option>
            <option value="other">{language === 'tr' ? 'Diğer Gelir' : 'Other'}</option>
          </select>

          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <option value="all">{language === 'tr' ? 'Tüm Sıklıklar' : 'All Frequencies'}</option>
            <option value="monthly">{language === 'tr' ? 'Aylık Düzenli' : 'Monthly'}</option>
            <option value="biweekly">{language === 'tr' ? '2 Haftada Bir' : 'Biweekly'}</option>
            <option value="annual">{language === 'tr' ? 'Yıllık' : 'Annual'}</option>
            <option value="irregular">{language === 'tr' ? 'Dönemsel / Tek Seferlik' : 'Irregular'}</option>
          </select>
        </div>
      </div>

      {/* Income List Grid */}
      <div className="space-y-3">
        {filteredIncomes.length > 0 ? (
          filteredIncomes.map((inc) => {
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

            const meta = getCategoryMeta(inc.category);
            const IconComponent = meta.icon;

            return (
              <motion.div
                key={inc.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                    meta.badgeClass
                  )}>
                    <IconComponent className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                        {translateTitle(inc.name, language)}
                      </h3>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                        meta.badgeClass
                      )}>
                        {meta.label}
                      </span>
                      {inc.isRegular ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {language === 'tr' ? 'Garantili' : 'Guaranteed'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {language === 'tr' ? 'Değişken' : 'Variable'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {inc.frequency === 'biweekly'
                          ? (language === 'tr' ? '2 Haftada Bir (Yılda 26 Ödeme)' : 'Every 2 Weeks (26 paychecks/yr)')
                          : inc.frequency === 'annual'
                          ? (inc.annualPayoutMonth
                            ? `${language === 'tr' ? 'Yılda 1 Kez' : 'Annual'} (${inc.annualPayoutMonth}. ${language === 'tr' ? 'Ay' : 'Month'})`
                            : (language === 'tr' ? 'Yıllık Eşit Dağıtımlı' : 'Annual Evenly Distributed'))
                          : inc.frequency === 'irregular'
                          ? `${language === 'tr' ? 'Dönemsel' : 'Irregular'} (${inc.targetMonth || '-'})`
                          : (language === 'tr' ? 'Aylık Düzenli' : 'Monthly Regular')}
                      </span>
                      {inc.receivedDay && (
                        <span>• {t('dayOfMonth').replace('{day}', String(inc.receivedDay))}</span>
                      )}
                      {inc.note && (
                        <span className="italic truncate max-w-xs">• {inc.note}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amounts & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(thisMonthAmount, currencyCode)}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      {inc.frequency === 'annual' && inc.annualPayoutMonth
                        ? (inc.annualPayoutMonth === monthNum
                          ? (language === 'tr' ? `${selectedMonth}: Ödeme Ayı` : 'Payout Month')
                          : (language === 'tr' ? `${selectedMonth}: Bu Ay Ödeme Yok` : 'No Payout This Month'))
                        : (language === 'tr' ? `${selectedMonth} ayı payı` : `${selectedMonth} share`)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditIncome(inc)}
                      className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      title={t('edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIncome(inc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
              {searchQuery || categoryFilter !== 'all' || frequencyFilter !== 'all'
                ? (language === 'tr' ? 'Aramanıza uygun gelir kaynağı bulunamadı.' : 'No income sources match your filters.')
                : (language === 'tr' ? 'Henüz kayıtlı gelir kaynağınız bulunmuyor.' : 'No income sources recorded yet.')}
            </h4>
            <p className="text-xs text-gray-500 mt-1 mb-5">
              {language === 'tr'
                ? 'Maaşınızı, freelance işlerinizi, kira veya temettü gelirlerinizi ekleyerek başlayın.'
                : 'Start by adding your salary, freelance projects, rental or investment incomes.'}
            </p>
            <button
              type="button"
              onClick={onOpenAddIncomeModal}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'tr' ? 'Gelir Ekle' : 'Add Income'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
