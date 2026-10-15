/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Landmark,
  Globe,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import { TaxProfile, CountryTaxRegion } from '../types';
import { getTaxRegion, getAllTaxRegions, normalizeCountryCode } from '../constants/taxRegions';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedNote } from '../utils/itemTranslator';

interface TaxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taxData: TaxProfile) => void;
  taxProfile: TaxProfile;
  currencyCode?: string;
}

export const TaxSettingsModal: React.FC<TaxSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taxProfile,
  currencyCode = 'USD'
}) => {
  const { t, language } = useTranslation();
  const [country, setCountry] = useState<CountryTaxRegion>(() => normalizeCountryCode(taxProfile.country));
  const [taxYear, setTaxYear] = useState<number>(taxProfile.taxYear || 2026);
  const [expectedAnnualTaxRefund, setExpectedAnnualTaxRefund] = useState<number | ''>(taxProfile.expectedAnnualTaxRefund ?? '');
  const [actualReceivedTaxRefund, setActualReceivedTaxRefund] = useState<number | ''>(taxProfile.actualReceivedTaxRefund ?? '');
  const [estimatedAnnualTaxPayable, setEstimatedAnnualTaxPayable] = useState<number | ''>(taxProfile.estimatedAnnualTaxPayable ?? '');
  const [deductibleExpensesEstimate, setDeductibleExpensesEstimate] = useState<number | ''>(taxProfile.deductibleExpensesEstimate ?? '');
  const [taxPeriodReminderNote, setTaxPeriodReminderNote] = useState<string>(() => getLocalizedNote(taxProfile.taxPeriodReminderNote, language));

  useEffect(() => {
    if (taxProfile) {
      setCountry(normalizeCountryCode(taxProfile.country));
      setTaxYear(taxProfile.taxYear || 2026);
      setExpectedAnnualTaxRefund(taxProfile.expectedAnnualTaxRefund ?? '');
      setActualReceivedTaxRefund(taxProfile.actualReceivedTaxRefund ?? '');
      setEstimatedAnnualTaxPayable(taxProfile.estimatedAnnualTaxPayable ?? '');
      setDeductibleExpensesEstimate(taxProfile.deductibleExpensesEstimate ?? '');
      setTaxPeriodReminderNote(getLocalizedNote(taxProfile.taxPeriodReminderNote, language));
    }
  }, [taxProfile, isOpen, language]);

  if (!isOpen) return null;

  const currentRegion = getTaxRegion(country, language);
  const allRegions = getAllTaxRegions(language);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      country,
      taxYear: Number(taxYear) || 2026,
      expectedAnnualTaxRefund: Number(expectedAnnualTaxRefund) || 0,
      actualReceivedTaxRefund: Number(actualReceivedTaxRefund) || 0,
      estimatedAnnualTaxPayable: Number(estimatedAnnualTaxPayable) || 0,
      deductibleExpensesEstimate: Number(deductibleExpensesEstimate) || 0,
      taxPeriodReminderNote: taxPeriodReminderNote.trim(),
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  const getRegionShortLabel = (code: CountryTaxRegion) => {
    switch (code) {
      case 'CA': return t('country_canada', 'Canada');
      case 'US': return t('country_usa', 'USA');
      case 'TR': return t('country_turkey', 'Turkey');
      case 'EU': return t('country_europe', 'Europe');
      case 'UK': return t('country_uk', 'UK');
      default: return t('other', 'Other');
    }
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
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  {t('taxSettingsTitle', 'Annual Tax & Refund Settings')}
                </h2>
                <p className="text-xs text-gray-500">
                  {t('taxSettingsSubtitle', 'Country tax calendar, refund estimation, and deductible expenses')}
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
            {/* Country Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                {t('taxResidenceCountry', 'Tax Residence Country / Region')} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allRegions.map((reg) => {
                  const isSelected = country === reg.code;
                  return (
                    <button
                      key={reg.code}
                      type="button"
                      onClick={() => {
                        setCountry(reg.code);
                        if (!taxPeriodReminderNote || taxPeriodReminderNote.includes('Vergi Beyani') || taxPeriodReminderNote.includes('Vergi Beyanı') || taxPeriodReminderNote.includes('Tax Return') || taxPeriodReminderNote.includes('Vergi Idaresi') || taxPeriodReminderNote.includes('Vergi İdaresi') || taxPeriodReminderNote.includes('Tax Authority') || taxPeriodReminderNote.includes('Son Beyan') || taxPeriodReminderNote.includes('Filing Deadline')) {
                          setTaxPeriodReminderNote(
                            language === 'tr'
                              ? `${reg.countryName} Vergi Idaresi: ${reg.taxAuthority} - Son Beyan: ${reg.filingDeadline}`
                              : `${reg.countryName} Tax Authority: ${reg.taxAuthority} - Filing Deadline: ${reg.filingDeadline}`
                          );
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-700/60 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{reg.flag}</span>
                        <div>
                          <p className={`text-xs font-extrabold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-200'}`}>
                            {getRegionShortLabel(reg.code)}
                          </p>
                          <p className="text-[10px] text-gray-400">{reg.taxAuthority.split(' ')[0]}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Region Details Alert Box */}
            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <span>{currentRegion.flag}</span>
                  <span>{currentRegion.countryName} {t('taxReminder', 'Tax Season Reminder')}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                  {currentRegion.taxAuthority}
                </span>
              </div>
              <p className="text-xs text-indigo-800 dark:text-indigo-300">
                <strong>{t('filingDeadline', 'Filing Deadline')}:</strong> {currentRegion.filingDeadline}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                <strong>{t('refundPeriod', 'Refund Timeline')}:</strong> {currentRegion.refundPeriod}
              </p>
            </div>

            {/* Expected and Actual Tax Refund */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('expectedTaxRefundLabel', 'Expected Annual Tax Refund')} ({currencyCode})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2450.00"
                    value={expectedAnnualTaxRefund}
                    onChange={(e) => setExpectedAnnualTaxRefund(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {t('expectedTaxRefundDesc', 'Estimated amount to be refunded from personal tax return')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('actualTaxRefundLabel', 'Actual Received Refund')} ({currencyCode})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1800.00"
                    value={actualReceivedTaxRefund}
                    onChange={(e) => setActualReceivedTaxRefund(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-extrabold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {t('actualTaxRefundDesc', 'Actual tax refund deposited into your bank account')}
                </p>
              </div>
            </div>

            {/* Deductible Expenses and Tax Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('deductibleExpensesLabel', 'Deductible Expenses / Tax Relief')} ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="3800.00"
                  value={deductibleExpensesEstimate}
                  onChange={(e) => setDeductibleExpensesEstimate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {t('deductibleExpensesDesc', 'RRSP, FHSA, Home Office, Education, Health, and deductible items')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {t('taxYearLabel', 'Tax Year')}
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2030"
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Custom Reminder Note */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('taxCalendarNoteLabel', 'Personal Tax Calendar & Reminder Note')}
              </label>
              <textarea
                rows={2}
                value={taxPeriodReminderNote}
                onChange={(e) => setTaxPeriodReminderNote(e.target.value)}
                placeholder={t('taxNotePlaceholder', 'e.g. April 30 CRA deadline, submit expense receipts in March...')}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Tips for current region */}
            <div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                💡 {t('taxRefundTipsTitle', 'Tips to Increase Refund for')} {currentRegion.countryName}:
              </p>
              <ul className="space-y-1 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-400 list-disc list-inside">
                {currentRegion.refundTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-500/25 cursor-pointer"
              >
                {t('saveTaxSettings', 'Save Tax Settings')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
