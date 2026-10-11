/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  PiggyBank,
  Shield,
  Home,
  Palmtree,
  Car,
  TrendingUp,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { SavingsTarget } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { translateTitle } from '../utils/itemTranslator';

interface AddEditSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savingsData: Omit<SavingsTarget, 'id' | 'uid'> & { id?: string }) => void;
  savings?: SavingsTarget | null;
  currencyCode?: string;
}

const SAVINGS_CATEGORIES: {
  key: SavingsTarget['category'];
  labelEn: string;
  labelTr: string;
  icon: any;
  color: string;
}[] = [
  { key: 'emergency', labelEn: 'Emergency Fund', labelTr: 'Acil Durum Fonu', icon: Shield, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
  { key: 'house', labelEn: 'House & Realty', labelTr: 'Ev / Gayrimenkul', icon: Home, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  { key: 'vacation', labelEn: 'Vacation & Travel', labelTr: 'Tatil & Seyahat', icon: Palmtree, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200' },
  { key: 'retirement', labelEn: 'Retirement Fund', labelTr: 'Emeklilik & Gelecek', icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  { key: 'vehicle', labelEn: 'Car / Vehicle', labelTr: 'Araba / Taşıt', icon: Car, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { key: 'investment', labelEn: 'Investment Capital', labelTr: 'Yatırım Sermayesi', icon: PiggyBank, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { key: 'other', labelEn: 'Other Goal', labelTr: 'Diğer Hedef', icon: HelpCircle, color: 'text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200' },
];

export const AddEditSavingsModal: React.FC<AddEditSavingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  savings,
  currencyCode = 'USD'
}) => {
  const { t, language } = useTranslation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SavingsTarget['category']>('emergency');
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [currentAmount, setCurrentAmount] = useState<number | ''>('');
  const [monthlyContribution, setMonthlyContribution] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (savings) {
      setTitle(translateTitle(savings.title, language));
      setCategory(savings.category || 'emergency');
      setTargetAmount(savings.targetAmount);
      setCurrentAmount(savings.currentAmount);
      setMonthlyContribution(savings.monthlyContribution);
      setDeadline(savings.deadline || '');
    } else {
      setTitle('');
      setCategory('emergency');
      setTargetAmount('');
      setCurrentAmount(0);
      setMonthlyContribution('');
      setDeadline('');
    }
  }, [savings, isOpen, language]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetAmount === '' || Number(targetAmount) <= 0) return;

    onSave({
      ...(savings ? { id: savings.id } : {}),
      title: title.trim(),
      category,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      monthlyContribution: Number(monthlyContribution) || 0,
      deadline: deadline || undefined
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
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  {savings ? t('edit') : t('addSavingsTarget')}
                </h2>
                <p className="text-xs text-gray-500">
                  {t('savingsTargets')}
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
                {SAVINGS_CATEGORIES.map((cat) => {
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
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-200 font-black shadow-xs'
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
                placeholder="Emergency Fund, Vacation, Car Fund..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Target and current amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('targetAmount')} ({currencyCode}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="20000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-extrabold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('currentAmount')} ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Monthly Contribution and Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('monthlyContribution')} ({currencyCode}/{t('months')}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="500"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-extrabold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('nextDate')} ({t('optional')})
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/25 cursor-pointer"
              >
                {savings ? t('update') : t('add')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
