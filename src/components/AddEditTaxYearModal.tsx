/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, DollarSign, Percent, FileText, CheckCircle2 } from 'lucide-react';
import { TaxYearRecord } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface AddEditTaxYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: TaxYearRecord) => void;
  record?: TaxYearRecord | null;
  currencyCode?: string;
}

export const AddEditTaxYearModal: React.FC<AddEditTaxYearModalProps> = ({
  isOpen,
  onClose,
  onSave,
  record,
  currencyCode = 'USD'
}) => {
  const { t, language } = useTranslation();

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [grossIncome, setGrossIncome] = useState<string>('');
  const [deductibleExpenses, setDeductibleExpenses] = useState<string>('');
  const [taxPaid, setTaxPaid] = useState<string>('');
  const [taxRefund, setTaxRefund] = useState<string>('');
  const [status, setStatus] = useState<TaxYearRecord['status']>('pending');
  const [filingDate, setFilingDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (record) {
      setYear(record.year);
      setGrossIncome(record.grossIncome?.toString() || '');
      setDeductibleExpenses(record.deductibleExpenses?.toString() || '');
      setTaxPaid(record.taxPaid?.toString() || '');
      setTaxRefund(record.taxRefund?.toString() || '');
      setStatus(record.status || 'pending');
      setFilingDate(record.filingDate || '');
      setNote(record.note || '');
    } else {
      setYear(new Date().getFullYear());
      setGrossIncome('');
      setDeductibleExpenses('');
      setTaxPaid('');
      setTaxRefund('');
      setStatus('pending');
      setFilingDate('');
      setNote('');
    }
  }, [record, isOpen]);

  if (!isOpen) return null;

  // Auto-calculated fields
  const numGross = Number(grossIncome) || 0;
  const numDeductible = Number(deductibleExpenses) || 0;
  const numTaxPaid = Number(taxPaid) || 0;
  const taxableBase = Math.max(0, numGross - numDeductible);
  const effectiveTaxRate = numGross > 0 ? Number(((numTaxPaid / numGross) * 100).toFixed(1)) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: record ? record.id : `tax_${year}_${Date.now()}`,
      year: Number(year) || new Date().getFullYear(),
      grossIncome: numGross,
      deductibleExpenses: numDeductible,
      taxPaid: numTaxPaid,
      taxRefund: Number(taxRefund) || 0,
      effectiveTaxRate,
      status,
      filingDate: filingDate || undefined,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString()
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
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl border border-gray-100 dark:border-gray-800 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  {record ? `Edit ${record.year} Tax Year Record` : 'Add New Tax Year Record'}
                </h2>
                <p className="text-xs text-gray-500">
                  Gross earnings, tax paid, eligible deductions, and refund amount
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Tax Year
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2035"
                  required
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Filing Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaxYearRecord['status'])}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="pending">Pending / In Preparation</option>
                  <option value="filed">Filed / Submitted</option>
                  <option value="in_review">In Review (Tax Authority)</option>
                  <option value="refund_received">Refund Received / Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Gross Income ({currencyCode})
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={grossIncome}
                    onChange={(e) => setGrossIncome(e.target.value)}
                    placeholder="90000"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Deductions ({currencyCode})
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deductibleExpenses}
                    onChange={(e) => setDeductibleExpenses(e.target.value)}
                    placeholder="10000"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Tax Paid ({currencyCode})
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={taxPaid}
                    onChange={(e) => setTaxPaid(e.target.value)}
                    placeholder="18000"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Tax Refund ({currencyCode})
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxRefund}
                    onChange={(e) => setTaxRefund(e.target.value)}
                    placeholder="2000"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Preview Strip */}
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Taxable Income: </span>
                <span className="font-black text-gray-900 dark:text-white">{currencyCode} {taxableBase.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Effective Rate: </span>
                <span className="font-black text-indigo-700 dark:text-indigo-300">%{effectiveTaxRate}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Filing Date
                </label>
                <input
                  type="date"
                  value={filingDate}
                  onChange={(e) => setFilingDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Note / Tax Return Reference
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="CRA T1 / IRS 1040 / Return Slip"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Record</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
