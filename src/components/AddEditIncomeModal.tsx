/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  DollarSign,
  Briefcase,
  TrendingUp,
  Building,
  Calendar,
  Gift,
  HelpCircle,
  FileText,
  Store
} from 'lucide-react';
import { IncomeItem } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { translateTitle, getLocalizedNote } from '../utils/itemTranslator';

interface AddEditIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incomeData: Omit<IncomeItem, 'id' | 'uid'> & { id?: string }) => void;
  income?: IncomeItem | null;
  currencyCode?: string;
}

const INCOME_CATEGORIES: {
  key: IncomeItem['category'];
  labelEn: string;
  labelTr: string;
  icon: any;
  color: string;
}[] = [
  { key: 'salary', labelEn: 'Salary / Main Income', labelTr: 'Maaş / Ana Gelir', icon: Briefcase, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { key: 'commercial', labelEn: 'Commercial / Self-Employed', labelTr: 'Commercial / Kendi İşi & Ticari', icon: Store, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
  { key: 'freelance', labelEn: 'Freelance & Consulting', labelTr: 'Freelance & Danışmanlık', icon: TrendingUp, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { key: 'investment', labelEn: 'Dividends & Yield', labelTr: 'Yatırım & Temettü', icon: DollarSign, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  { key: 'rental', labelEn: 'Rental Income', labelTr: 'Kira Geliri', icon: Building, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  { key: 'business', labelEn: 'Business Revenue', labelTr: 'Şirket Hasılatı', icon: Briefcase, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200' },
  { key: 'bonus', labelEn: 'Bonus & Incentives', labelTr: 'Prim & İkramiye', icon: Gift, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
  { key: 'other', labelEn: 'Other Income', labelTr: 'Diğer Gelir', icon: HelpCircle, color: 'text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200' },
];

export const AddEditIncomeModal: React.FC<AddEditIncomeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  income,
  currencyCode = 'USD'
}) => {
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<IncomeItem['category']>('salary');
  const [amount, setAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState<IncomeItem['frequency']>('monthly');
  const [receivedDay, setReceivedDay] = useState<number>(1);
  const [isRegular, setIsRegular] = useState<boolean>(true);
  const [annualPayoutMonth, setAnnualPayoutMonth] = useState<number>(0); // 0 = distributed across 12 months, 1-12 = specific month
  const [targetMonth, setTargetMonth] = useState<string>(''); // YYYY-MM for irregular income
  const [note, setNote] = useState('');

  useEffect(() => {
    if (income) {
      setName(translateTitle(income.name, language));
      setCategory(income.category || 'salary');
      setAmount(income.amount);
      setFrequency(income.frequency || 'monthly');
      setReceivedDay(income.receivedDay || 1);
      setIsRegular(income.isRegular !== false);
      setAnnualPayoutMonth(income.annualPayoutMonth || 0);
      setTargetMonth(income.targetMonth || '');
      setNote(getLocalizedNote(income.note, language));
    } else {
      setName('');
      setCategory('salary');
      setAmount('');
      setFrequency('monthly');
      setReceivedDay(1);
      setIsRegular(true);
      setAnnualPayoutMonth(0);
      setTargetMonth('');
      setNote('');
    }
  }, [income, isOpen, language]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || amount === '' || Number(amount) <= 0) return;

    onSave({
      ...(income ? { id: income.id } : {}),
      name: name.trim(),
      category,
      amount: Number(amount),
      frequency,
      receivedDay: Number(receivedDay) || 1,
      isRegular,
      annualPayoutMonth: frequency === 'annual' && annualPayoutMonth > 0 ? annualPayoutMonth : undefined,
      targetMonth: frequency === 'irregular' && targetMonth.trim() ? targetMonth.trim() : undefined,
      status: 'active',
      note: note.trim()
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  {income ? t('edit') : t('addIncome')}
                </h2>
                <p className="text-xs text-gray-500">
                  {t('monthlyIncomeSources')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                {t('category')} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INCOME_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.key;
                  const label = language === 'tr' ? cat.labelTr : cat.labelEn;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-black shadow-xs'
                          : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] leading-tight line-clamp-1">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('name')} *
              </label>
              <input
                type="text"
                required
                placeholder="Salary, Freelance, Consulting..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Amount & Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('amount')} ({currencyCode}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('billingCycle')} *
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="monthly">{t('regularMonthly')}</option>
                  <option value="biweekly">{t('biweekly')}</option>
                  <option value="irregular">{t('irregularOnBill')}</option>
                  <option value="annual">{t('yearly')}</option>
                </select>
              </div>
            </div>

            {/* Annual Payout Month (When frequency is annual) */}
            {frequency === 'annual' && (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  {language === 'tr' ? 'Yıllık Gelirin Ödendiği Ay' : 'Annual Payout Month'}
                </label>
                <select
                  value={annualPayoutMonth}
                  onChange={(e) => setAnnualPayoutMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value={0}>{language === 'tr' ? '12 Aya Eşit Dağıt (Aylık Ortalama)' : 'Distribute evenly across 12 months'}</option>
                  <option value={1}>{language === 'tr' ? 'Ocak' : 'January'}</option>
                  <option value={2}>{language === 'tr' ? 'Şubat' : 'February'}</option>
                  <option value={3}>{language === 'tr' ? 'Mart' : 'March'}</option>
                  <option value={4}>{language === 'tr' ? 'Nisan' : 'April'}</option>
                  <option value={5}>{language === 'tr' ? 'Mayıs' : 'May'}</option>
                  <option value={6}>{language === 'tr' ? 'Haziran' : 'June'}</option>
                  <option value={7}>{language === 'tr' ? 'Temmuz' : 'July'}</option>
                  <option value={8}>{language === 'tr' ? 'Ağustos' : 'August'}</option>
                  <option value={9}>{language === 'tr' ? 'Eylül' : 'September'}</option>
                  <option value={10}>{language === 'tr' ? 'Ekim' : 'October'}</option>
                  <option value={11}>{language === 'tr' ? 'Kasım' : 'November'}</option>
                  <option value={12}>{language === 'tr' ? 'Aralık' : 'December'}</option>
                </select>
                <p className="text-[11px] text-gray-500">
                  {language === 'tr' ? 'Belirli bir ay seçerseniz, aylık gelir tablosunda sadece o ayda yansıtılır.' : 'If a specific month is selected, it will reflect in that month on the monthly view.'}
                </p>
              </div>
            )}

            {/* Target Month for Irregular / One-time Income */}
            {frequency === 'irregular' && (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  {language === 'tr' ? 'Geçerli Olduğu Ay (İsteğe Bağlı)' : 'Target Month (Optional)'}
                </label>
                <input
                  type="month"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  placeholder="YYYY-MM"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-gray-500">
                  {language === 'tr' ? 'Belirli bir ay seçilirse, sadece o ayın toplam gelirine dahil edilir.' : 'If specified, only included in that month\'s total income.'}
                </p>
              </div>
            )}

            {/* Day of month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('dueDayLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={receivedDay}
                  onChange={(e) => setReceivedDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRegular}
                    onChange={(e) => setIsRegular(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {t('active')}
                  </span>
                </label>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('note')} ({t('optional')})
              </label>
              <input
                type="text"
                placeholder="..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/25 cursor-pointer"
              >
                {income ? t('save') : t('add')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
