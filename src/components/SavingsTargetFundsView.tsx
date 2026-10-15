/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PiggyBank,
  Target,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Home,
  Palmtree,
  Car,
  TrendingUp,
  HelpCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Search,
  Filter,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { SavingsTarget } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { translateTitle } from '../utils/itemTranslator';
import { cn } from '../lib/utils';

interface SavingsTargetFundsViewProps {
  savings: SavingsTarget[];
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
  onOpenAddSavingsModal: () => void;
  onEditSavings: (sav: SavingsTarget) => void;
  onDeleteSavings: (id: string) => void;
  onUpdateSavingsAmount?: (id: string, newAmount: number) => void;
}

export const SavingsTargetFundsView: React.FC<SavingsTargetFundsViewProps> = ({
  savings,
  currencyCode = 'USD',
  formatCurrency,
  onOpenAddSavingsModal,
  onEditSavings,
  onDeleteSavings,
  onUpdateSavingsAmount
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Quick Deposit State
  const [depositingFundId, setDepositingFundId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');

  // Aggregated KPI Stats
  const totalTarget = useMemo(() => {
    return savings.reduce((acc, s) => acc + (s.targetAmount || 0), 0);
  }, [savings]);

  const totalCurrent = useMemo(() => {
    return savings.reduce((acc, s) => acc + (s.currentAmount || 0), 0);
  }, [savings]);

  const totalMonthlyContribution = useMemo(() => {
    return savings.reduce((acc, s) => acc + (s.monthlyContribution || 0), 0);
  }, [savings]);

  const overallCompletionRate = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;
  const remainingTotal = Math.max(0, totalTarget - totalCurrent);

  // Filtered Savings
  const filteredSavings = useMemo(() => {
    return savings.filter(sav => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!sav.title.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== 'all' && sav.category !== categoryFilter) {
        return false;
      }
      const isCompleted = (sav.currentAmount || 0) >= (sav.targetAmount || 1);
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'in_progress' && isCompleted) return false;
      return true;
    });
  }, [savings, searchQuery, categoryFilter, statusFilter]);

  const getCategoryMeta = (cat: SavingsTarget['category']) => {
    switch (cat) {
      case 'emergency':
        return {
          icon: Shield,
          label: language === 'tr' ? 'Acil Durum Fonu' : 'Emergency Fund',
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'house':
        return {
          icon: Home,
          label: language === 'tr' ? 'Ev / Gayrimenkul' : 'House & Realty',
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'vacation':
        return {
          icon: Palmtree,
          label: language === 'tr' ? 'Tatil & Seyahat' : 'Vacation & Travel',
          badgeClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
        };
      case 'retirement':
        return {
          icon: TrendingUp,
          label: language === 'tr' ? 'Emeklilik & Gelecek' : 'Retirement & Future',
          badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'vehicle':
        return {
          icon: Car,
          label: language === 'tr' ? 'Araba / Taşıt' : 'Vehicle / Car',
          badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'investment':
        return {
          icon: PiggyBank,
          label: language === 'tr' ? 'Yatırım Sermayesi' : 'Investment Capital',
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      default:
        return {
          icon: HelpCircle,
          label: language === 'tr' ? 'Diğer Hedef' : 'Other Goal',
          badgeClass: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
        };
    }
  };

  const handleApplyDeposit = (fund: SavingsTarget) => {
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;
    const updated = (fund.currentAmount || 0) + val;
    if (onUpdateSavingsAmount) {
      onUpdateSavingsAmount(fund.id, updated);
    } else {
      onEditSavings({
        ...fund,
        currentAmount: updated
      });
    }
    setDepositingFundId(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/15">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold mb-2">
            <PiggyBank className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Birikim & Hedef Fonları' : 'Savings & Target Funds'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('savingsTargets')}
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl font-medium">
            {language === 'tr'
              ? 'Acil durum fonu, ev peşinatı, araba, tatil ve özel hedefleriniz için birikim fonları oluşturun ve ilerlemenizi canlı takip edin.'
              : 'Create dedicated target funds for emergencies, down payments, travel, and dream goals with live progress tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenAddSavingsModal}
            className="px-5 py-2.5 bg-white text-blue-800 hover:bg-blue-50 rounded-xl text-xs font-black transition-all shadow-lg shadow-black/10 flex items-center gap-2 cursor-pointer ring-2 ring-white/50"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addSavingsTarget')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Accumulated */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Toplam Biriken' : 'Total Saved'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(totalCurrent, currencyCode)}
          </div>
          <p className="text-[11px] text-gray-500 font-semibold">
            {savings.length} {language === 'tr' ? 'hedef fonunda biriken' : 'total funds combined'}
          </p>
        </div>

        {/* Card 2: Total Target */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Hedeflenen Toplam' : 'Total Goal Target'}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {formatCurrency(totalTarget, currencyCode)}
          </div>
          <p className="text-[11px] text-gray-500 font-semibold">
            {formatCurrency(remainingTotal, currencyCode)} {language === 'tr' ? 'kalan hedef' : 'remaining to goal'}
          </p>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Genel Tamamlanma' : 'Overall Completion'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            %{overallCompletionRate}
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              style={{ width: `${overallCompletionRate}%` }}
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Card 4: Monthly Contribution */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{language === 'tr' ? 'Aylık Birikim Hızı' : 'Monthly Savings Pace'}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(totalMonthlyContribution, currencyCode)}
          </div>
          <p className="text-[11px] text-gray-500 font-semibold">
            {language === 'tr' ? 'aylık hedeflere aktarılan tutar' : 'total monthly contribution'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'tr' ? 'Hedef veya fon adı ara...' : 'Search savings targets...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <option value="all">{language === 'tr' ? 'Tüm Hedef Türleri' : 'All Goal Types'}</option>
            <option value="emergency">{language === 'tr' ? 'Acil Durum Fonu' : 'Emergency Fund'}</option>
            <option value="house">{language === 'tr' ? 'Ev / Gayrimenkul' : 'House & Realty'}</option>
            <option value="vacation">{language === 'tr' ? 'Tatil & Seyahat' : 'Vacation & Travel'}</option>
            <option value="retirement">{language === 'tr' ? 'Emeklilik & Gelecek' : 'Retirement'}</option>
            <option value="vehicle">{language === 'tr' ? 'Araba / Taşıt' : 'Vehicle'}</option>
            <option value="investment">{language === 'tr' ? 'Yatırım Sermayesi' : 'Investment'}</option>
            <option value="other">{language === 'tr' ? 'Diğer Hedef' : 'Other'}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <option value="all">{language === 'tr' ? 'Tüm Durumlar' : 'All Status'}</option>
            <option value="in_progress">{language === 'tr' ? 'Devam Edenler' : 'In Progress'}</option>
            <option value="completed">{language === 'tr' ? 'Tamamlananlar 🎉' : 'Completed 🎉'}</option>
          </select>
        </div>
      </div>

      {/* Savings Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSavings.length > 0 ? (
          filteredSavings.map((sav) => {
            const target = sav.targetAmount || 1;
            const current = sav.currentAmount || 0;
            const percent = Math.min(100, Math.round((current / target) * 100));
            const remaining = Math.max(0, target - current);
            const isCompleted = current >= target;

            // Months remaining based on monthly contribution
            const monthsLeft = sav.monthlyContribution > 0
              ? Math.ceil(remaining / sav.monthlyContribution)
              : null;

            const meta = getCategoryMeta(sav.category);
            const IconComponent = meta.icon;

            return (
              <motion.div
                key={sav.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-5 bg-white dark:bg-gray-900 rounded-3xl border shadow-xs transition-all space-y-4 flex flex-col justify-between",
                  isCompleted
                    ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                    : "border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-900/40"
                )}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border",
                        meta.badgeClass
                      )}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                            {translateTitle(sav.title, language)}
                          </h3>
                          {isCompleted && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md flex items-center gap-1 shadow-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{language === 'tr' ? 'Tamamlandı! 🎉' : 'Completed! 🎉'}</span>
                            </span>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.2 rounded-md border inline-block mt-0.5",
                          meta.badgeClass
                        )}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditSavings(sav)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSavings(sav.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Numbers */}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">
                        {language === 'tr' ? 'Şu Ana Kadar Biriken' : 'Accumulated So Far'}
                      </p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {formatCurrency(current, currencyCode)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">
                        {language === 'tr' ? 'Hedeflenen Tutar' : 'Target Goal'}
                      </p>
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(target, currencyCode)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mt-2">
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${percent}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCompleted
                            ? "bg-emerald-500"
                            : percent > 60
                            ? "bg-blue-600"
                            : "bg-indigo-500"
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                      <span className={cn(
                        "font-extrabold",
                        isCompleted ? "text-emerald-600" : "text-blue-600 dark:text-blue-400"
                      )}>
                        %{percent} {language === 'tr' ? 'tamamlandı' : 'achieved'}
                      </span>
                      <span>
                        {remaining > 0
                          ? `${language === 'tr' ? 'Kalan:' : 'Remaining:'} ${formatCurrency(remaining, currencyCode)}`
                          : (language === 'tr' ? 'Hedefe ulaşıldı!' : 'Goal reached!')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Footer & Quick Deposit */}
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{language === 'tr' ? 'Aylık Katkı:' : 'Monthly:'}</span>
                      <strong className="text-gray-900 dark:text-white font-extrabold">
                        {formatCurrency(sav.monthlyContribution, currencyCode)}/ay
                      </strong>
                    </span>

                    {monthsLeft !== null && remaining > 0 && (
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                        ~{monthsLeft} {language === 'tr' ? 'ay kaldı' : 'mo left'}
                      </span>
                    )}

                    {sav.deadline && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-amber-500" />
                        <span>{sav.deadline}</span>
                      </span>
                    )}
                  </div>

                  {/* Quick Deposit Bar */}
                  {depositingFundId === sav.id ? (
                    <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                      <div className="relative flex-1">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          placeholder={language === 'tr' ? 'Eklenecek tutar...' : 'Deposit amount...'}
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 dark:text-white"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyDeposit(sav)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        {language === 'tr' ? 'Ekle' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDepositingFundId(null);
                          setDepositAmount('');
                        }}
                        className="px-2.5 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold cursor-pointer"
                      >
                        {language === 'tr' ? 'İptal' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDepositingFundId(sav.id);
                        setDepositAmount('');
                      }}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-100 dark:border-blue-900/40"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>{language === 'tr' ? '+ Bu Fona Para Ekle (Birikim Yatır)' : '+ Add Deposit to Fund'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            <PiggyBank className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                ? (language === 'tr' ? 'Aramanıza uygun birikim hedefi bulunamadı.' : 'No target funds match your filters.')
                : (language === 'tr' ? 'Henüz kayıtlı birikim hedefiniz bulunmuyor.' : 'No savings targets created yet.')}
            </h4>
            <p className="text-xs text-gray-500 mt-1 mb-5">
              {language === 'tr'
                ? 'Acil durum fonu, tatil veya ev peşinatı gibi hedefler belirleyerek birikime başlayın.'
                : 'Start saving by setting goals for emergencies, vacations, or home down payments.'}
            </p>
            <button
              type="button"
              onClick={onOpenAddSavingsModal}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addSavingsTarget')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
