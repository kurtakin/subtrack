/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Home,
  Zap,
  Droplets,
  Flame,
  Smartphone,
  Building,
  User,
  Shield,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  Check,
  RefreshCw,
  Hash
} from 'lucide-react';
import { RegularPayment, RegularPaymentCategory } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { translateTitle, getLocalizedNote } from '../utils/itemTranslator';

interface AddEditRegularPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paymentData: Omit<RegularPayment, 'id' | 'uid'> & { id?: string; syncToCalendar?: boolean }) => void;
  payment?: RegularPayment | null;
  currencyCode?: string;
}

export const REGULAR_PAYMENT_CATEGORIES: {
  key: RegularPaymentCategory;
  labelEn: string;
  labelTr: string;
  icon: any;
  defaultNameEn: string;
  defaultNameTr: string;
  defaultAmountType: 'fixed' | 'variable';
  defaultFrequency: 'monthly' | 'irregular';
  color: string;
}[] = [
  { key: 'rent', labelEn: 'Rent', labelTr: 'Kira', icon: Home, defaultNameEn: 'Home Rent', defaultNameTr: 'Ev Kirası', defaultAmountType: 'fixed', defaultFrequency: 'monthly', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  { key: 'electricity', labelEn: 'Electricity', labelTr: 'Elektrik', icon: Zap, defaultNameEn: 'Electricity Bill', defaultNameTr: 'Elektrik Faturası', defaultAmountType: 'variable', defaultFrequency: 'monthly', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200' },
  { key: 'gas', labelEn: 'Natural Gas', labelTr: 'Doğalgaz', icon: Flame, defaultNameEn: 'Natural Gas & Heating', defaultNameTr: 'Doğalgaz & Isınma', defaultAmountType: 'variable', defaultFrequency: 'monthly', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
  { key: 'water', labelEn: 'Water', labelTr: 'Su', icon: Droplets, defaultNameEn: 'Water Bill', defaultNameTr: 'Su Faturası', defaultAmountType: 'variable', defaultFrequency: 'monthly', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200' },
  { key: 'phone_internet', labelEn: 'Phone & Net', labelTr: 'Telefon & Net', icon: Smartphone, defaultNameEn: 'Home Internet & Mobile Phone', defaultNameTr: 'İnternet & Telefon', defaultAmountType: 'fixed', defaultFrequency: 'monthly', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
  { key: 'dues', labelEn: 'Condo Fee', labelTr: 'Aidat', icon: Building, defaultNameEn: 'Building & Condo Fee', defaultNameTr: 'Apartman Aidatı', defaultAmountType: 'fixed', defaultFrequency: 'monthly', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { key: 'person', labelEn: 'To Person', labelTr: 'Kişiye Ödeme', icon: User, defaultNameEn: 'Personal Support / Loan', defaultNameTr: 'Kişisel Destek / Borç', defaultAmountType: 'fixed', defaultFrequency: 'monthly', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  { key: 'institution', labelEn: 'To Institution', labelTr: 'Kuruma Ödeme', icon: Building, defaultNameEn: 'Official / Institutional Payment', defaultNameTr: 'Resmi / Kurumsal Ödeme', defaultAmountType: 'fixed', defaultFrequency: 'monthly', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { key: 'insurance', labelEn: 'Insurance', labelTr: 'Sigorta & Kasko', icon: Shield, defaultNameEn: 'Insurance Premium', defaultNameTr: 'Sigorta Primi', defaultAmountType: 'fixed', defaultFrequency: 'monthly', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
  { key: 'other', labelEn: 'Other Bill', labelTr: 'Diğer Ödeme', icon: CreditCard, defaultNameEn: 'Monthly Regular Payment', defaultNameTr: 'Aylık Ödeme', defaultAmountType: 'fixed', defaultFrequency: 'monthly', color: 'text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200' },
];

export const AddEditRegularPaymentModal: React.FC<AddEditRegularPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  payment,
  currencyCode = 'USD'
}) => {
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<RegularPaymentCategory>('rent');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [amountType, setAmountType] = useState<'fixed' | 'variable'>('fixed');
  const [frequency, setFrequency] = useState<'monthly' | 'irregular' | 'bimonthly' | 'quarterly' | 'annual'>('monthly');
  const [dueDay, setDueDay] = useState<number>(1);
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [isAutoPayment, setIsAutoPayment] = useState<boolean>(false);
  const [bankOrCard, setBankOrCard] = useState('');
  const [accountOrSubscriberNo, setAccountOrSubscriberNo] = useState('');
  const [note, setNote] = useState('');
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(true);

  useEffect(() => {
    if (payment) {
      setName(translateTitle(payment.name, language));
      setCategory(payment.category || 'rent');
      setPayee(payment.payee || '');
      setAmount(payment.amount);
      setAmountType(payment.amountType || 'fixed');
      setFrequency(payment.frequency || 'monthly');
      setDueDay(payment.dueDay || 1);
      setNextPaymentDate(payment.nextPaymentDate?.split('T')[0] || '');
      setIsAutoPayment(!!payment.isAutoPayment);
      setBankOrCard(payment.bankOrCard || '');
      setAccountOrSubscriberNo(payment.accountOrSubscriberNo || '');
      setNote(getLocalizedNote(payment.note, language));
      setSyncToCalendar(!!payment.calendarEventId);
    } else {
      setName(language === 'tr' ? 'Ev Kirası' : 'Home Rent');
      setCategory('rent');
      setPayee('');
      setAmount('');
      setAmountType('fixed');
      setFrequency('monthly');
      setDueDay(1);
      const today = new Date().toISOString().split('T')[0];
      setNextPaymentDate(today);
      setIsAutoPayment(false);
      setBankOrCard('');
      setAccountOrSubscriberNo('');
      setNote('');
      setSyncToCalendar(true);
    }
  }, [payment, isOpen, language]);

  const handleSelectCategory = (cat: typeof REGULAR_PAYMENT_CATEGORIES[0]) => {
    setCategory(cat.key);
    const catDefaultName = language === 'tr' ? cat.defaultNameTr : cat.defaultNameEn;
    const allDefaults = REGULAR_PAYMENT_CATEGORIES.flatMap(c => [c.defaultNameEn, c.defaultNameTr]);
    if (!payment && (!name || allDefaults.includes(name))) {
      setName(catDefaultName);
    }
    if (!payment) {
      setAmountType(cat.defaultAmountType);
      setFrequency(cat.defaultFrequency);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...(payment ? { id: payment.id } : {}),
      name: name.trim(),
      category,
      payee: payee.trim(),
      amount: Number(amount) || 0,
      amountType,
      frequency,
      dueDay: Number(dueDay) || 1,
      nextPaymentDate: nextPaymentDate || new Date().toISOString().split('T')[0],
      status: payment?.status || 'active',
      isAutoPayment,
      bankOrCard: bankOrCard.trim(),
      accountOrSubscriberNo: accountOrSubscriberNo.trim(),
      note: note.trim(),
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
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {payment ? t('regularPaymentModalTitleEdit') : t('regularPaymentModalTitleNew')}
              </h2>
              <p className="text-xs text-gray-500">
                {t('regularPaymentSubtitleModal')}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Category Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('category')} *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {REGULAR_PAYMENT_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.key;
                const label = language === 'tr' ? cat.labelTr : cat.labelEn;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/20 text-amber-900 dark:text-amber-200 font-black shadow-xs'
                        : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[11px] leading-tight line-clamp-1">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Name & Payee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('paymentTitleLabel')} *
              </label>
              <input
                type="text"
                required
                placeholder="Rent, Electricity, Water..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('payeeLabel')}
              </label>
              <input
                type="text"
                placeholder="Landlord, Utility Co..."
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Amount & Amount Type (Fixed vs Variable) */}
          <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span>{t('amount')} ({currencyCode}) *</span>
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
                    className="w-full pl-8 pr-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-extrabold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('expenseStructure')}
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setAmountType('fixed')}
                    className={`py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer ${
                      amountType === 'fixed'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {t('fixedRent')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountType('variable')}
                    className={`py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer ${
                      amountType === 'variable'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {t('variableUtility')}
                  </button>
                </div>
              </div>
            </div>

            {/* Frequency: Düzenli vs Düzensiz */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('billingCycle')}
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer ${
                    frequency === 'monthly'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {t('regularMonthly')}
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('irregular')}
                  className={`py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer ${
                    frequency === 'irregular'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {t('irregularOnBill')}
                </button>
              </div>
            </div>
          </div>

          {/* Dates & Due Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {t('dueDate')} *
              </label>
              <input
                type="date"
                required
                value={nextPaymentDate}
                onChange={(e) => {
                  setNextPaymentDate(e.target.value);
                  try {
                    const day = new Date(e.target.value).getDate();
                    if (!isNaN(day)) setDueDay(day);
                  } catch {}
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('dueDayLabel')}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
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
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>✋</span> {t('manualPayment')}
                  </span>
                  {!isAutoPayment && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
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

          {/* Bank/Card & Account/Subscriber/IBAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                {t('bankOrCardLabel')}
              </label>
              <input
                type="text"
                placeholder="Visa, Mastercard, Bank..."
                value={bankOrCard}
                onChange={(e) => setBankOrCard(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                {t('subscriberOrAccountNo')}
              </label>
              <input
                type="text"
                placeholder="IBAN / Account..."
                value={accountOrSubscriberNo}
                onChange={(e) => setAccountOrSubscriberNo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
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

          {/* Google Calendar Sync */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/40 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
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
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
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
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer shadow-md shadow-amber-500/20"
            >
              {payment ? t('savePaymentChanges') : t('saveNewPayment')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
