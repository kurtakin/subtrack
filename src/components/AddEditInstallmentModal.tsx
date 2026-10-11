/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Store, Calendar, CreditCard, Tag, DollarSign, FileText, Check, RefreshCw } from 'lucide-react';
import { Installment } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface AddEditInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (installmentData: Omit<Installment, 'id' | 'uid'> & { id?: string; syncToCalendar?: boolean }) => void;
  installment?: Installment | null;
  currencyCode?: string;
}

const CATEGORIES = [
  'Elektronik',
  'Ev Eşyası & Beyaz Eşya',
  'Mobilya & Dekorasyon',
  'Giyim & Moda',
  'Sağlık & Medikal',
  'Tatil & Seyahat',
  'Otomotiv & Yedek Parça',
  'Eğitim & Kurs',
  'Diğer'
];

export const AddEditInstallmentModal: React.FC<AddEditInstallmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  installment,
  currencyCode = 'USD'
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [monthlyAmount, setMonthlyAmount] = useState<number | ''>('');
  const [totalInstallments, setTotalInstallments] = useState<number>(12);
  const [paidInstallments, setPaidInstallments] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [category, setCategory] = useState('Elektronik');
  const [bankOrCard, setBankOrCard] = useState('');
  const [note, setNote] = useState('');
  const [calcMode, setCalcMode] = useState<'fromTotal' | 'fromMonthly'>('fromTotal');
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(true);
  const [isAutoPayment, setIsAutoPayment] = useState<boolean>(false);

  useEffect(() => {
    if (installment) {
      setName(installment.name);
      setStore(installment.store || '');
      setTotalAmount(installment.totalAmount);
      setMonthlyAmount(installment.monthlyAmount);
      setTotalInstallments(installment.totalInstallments);
      setPaidInstallments(installment.paidInstallments || 0);
      setStartDate(installment.startDate?.split('T')[0] || '');
      setNextPaymentDate(installment.nextPaymentDate?.split('T')[0] || '');
      setCategory(installment.category || 'Elektronik');
      setBankOrCard(installment.bankOrCard || '');
      setNote(installment.note || '');
      setSyncToCalendar(!!installment.calendarEventId);
      setIsAutoPayment(!!installment.isAutoPayment);
    } else {
      setName('');
      setStore('');
      setTotalAmount('');
      setMonthlyAmount('');
      setTotalInstallments(12);
      setPaidInstallments(0);
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setNextPaymentDate(today);
      setCategory('Elektronik');
      setBankOrCard('');
      setNote('');
      setSyncToCalendar(true);
      setIsAutoPayment(false);
    }
  }, [installment, isOpen]);

  // Recalculate monthly amount if totalAmount or totalInstallments changes
  const handleTotalAmountChange = (val: number | '') => {
    setTotalAmount(val);
    if (val !== '' && totalInstallments > 0) {
      const calcMonthly = Number((val / totalInstallments).toFixed(2));
      setMonthlyAmount(calcMonthly);
    }
  };

  const handleMonthlyAmountChange = (val: number | '') => {
    setMonthlyAmount(val);
    if (val !== '' && totalInstallments > 0) {
      const calcTotal = Number((val * totalInstallments).toFixed(2));
      setTotalAmount(calcTotal);
    }
  };

  const handleTotalInstallmentsChange = (count: number) => {
    setTotalInstallments(count);
    if (calcMode === 'fromTotal' && totalAmount !== '') {
      setMonthlyAmount(Number((totalAmount / count).toFixed(2)));
    } else if (calcMode === 'fromMonthly' && monthlyAmount !== '') {
      setTotalAmount(Number((monthlyAmount * count).toFixed(2)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tAmt = Number(totalAmount) || 0;
    const mAmt = Number(monthlyAmount) || (totalInstallments > 0 ? tAmt / totalInstallments : 0);
    const pInst = Number(paidInstallments) || 0;
    const remInst = Math.max(0, totalInstallments - pInst);

    onSave({
      ...(installment ? { id: installment.id } : {}),
      name: name.trim(),
      store: store.trim() || 'Genel Mağaza',
      totalAmount: tAmt,
      monthlyAmount: Number(mAmt.toFixed(2)),
      totalInstallments: Number(totalInstallments),
      paidInstallments: pInst,
      remainingInstallments: remInst,
      startDate: startDate || new Date().toISOString().split('T')[0],
      nextPaymentDate: nextPaymentDate || new Date().toISOString().split('T')[0],
      category,
      bankOrCard: bankOrCard.trim(),
      status: pInst >= totalInstallments ? 'completed' : 'active',
      note: note.trim(),
      isAutoPayment,
      syncToCalendar
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {installment ? t('editInstallment') : t('addInstallmentModalTitle')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('addFirstInstallmentPrompt')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
              {t('productOrService')} *
            </label>
            <input
              type="text"
              required
              placeholder="iPhone 16 Pro, MacBook, Television..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Store / Seller */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-indigo-500" />
              {t('storeOrSeller')} *
            </label>
            <input
              type="text"
              required
              placeholder="Apple Store, Amazon, Best Buy, MediaMarkt..."
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Installment count & amounts */}
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                {t('installmentCalcTitle')}
              </span>
              <div className="flex text-[11px] font-bold bg-white dark:bg-gray-800 rounded-lg p-0.5 border border-purple-200/60 dark:border-purple-800/40">
                <button
                  type="button"
                  onClick={() => setCalcMode('fromTotal')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${calcMode === 'fromTotal' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                >
                  {t('calcFromTotal')}
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('fromMonthly')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${calcMode === 'fromMonthly' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                >
                  {t('calcFromMonthly')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Total Amount */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  {t('totalProductAmount')} ({currencyCode})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="2400"
                    value={totalAmount}
                    onChange={(e) => handleTotalAmountChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-purple-200/80 dark:border-purple-800/50 rounded-xl text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Monthly Amount */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  {t('monthlyInstallmentAmount')} ({currencyCode})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="100"
                    value={monthlyAmount}
                    onChange={(e) => handleMonthlyAmountChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-purple-200/80 dark:border-purple-800/50 rounded-xl text-sm font-black text-purple-700 dark:text-purple-300 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Installment Selection buttons */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1.5">
                {t('totalInstallmentCount')} ({totalInstallments} {t('months')})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[3, 6, 9, 12, 18, 24, 36, 48].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleTotalInstallmentsChange(num)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      totalInstallments === num
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                  >
                    {num} {t('installments')}
                  </button>
                ))}
              </div>
            </div>

            {/* Paid Installments Counter */}
            <div className="pt-1 flex items-center justify-between text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">{t('paidInstallmentsCount')}:</label>
                <p className="text-[10px] text-gray-500">{t('remainingInstallmentsCount')}: {Math.max(0, totalInstallments - Number(paidInstallments))}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={totalInstallments}
                  value={paidInstallments}
                  onChange={(e) => setPaidInstallments(Math.min(totalInstallments, Math.max(0, Number(e.target.value))))}
                  className="w-20 px-3 py-1.5 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-sm text-gray-900 dark:text-white"
                />
                <span className="text-xs font-bold text-gray-400">/ {totalInstallments}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                {t('firstInstallmentDate')}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                {t('nextInstallmentDateLabel')} *
              </label>
              <input
                type="date"
                required
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Category & Card/Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                {t('category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                {t('bankOrCardLabel')}
              </label>
              <input
                type="text"
                placeholder="Visa, Mastercard, Bank..."
                value={bankOrCard}
                onChange={(e) => setBankOrCard(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              {t('note')} ({t('optional')})
            </label>
            <input
              type="text"
              placeholder="..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          {/* Payment Method / Mode: Manual vs Auto-Payment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                {t('expenseStructure')} *
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsAutoPayment(false)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  !isAutoPayment
                    ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 ring-2 ring-purple-400/20 shadow-xs'
                    : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>✋</span> {t('manualPayment')}
                  </span>
                  {!isAutoPayment && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  {t('manualPayExplanation')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsAutoPayment(true)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isAutoPayment
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400/20 shadow-xs'
                    : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> {t('autoPayment')}
                  </span>
                  {isAutoPayment && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  {t('autoPayExplanation')}
                </p>
              </button>
            </div>
          </div>

          {/* Calendar Auto-Sync Option */}
          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/25 border border-purple-100 dark:border-purple-900/40 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {t('addToCalendar')}
                </p>
                <p className="text-[10px] text-gray-500">
                  {t('calendarAlarmNote')}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={syncToCalendar}
                onChange={(e) => setSyncToCalendar(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-purple-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{installment ? t('saveInstallmentChanges') : t('saveNewInstallment')}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
