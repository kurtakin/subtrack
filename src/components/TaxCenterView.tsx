/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  Globe, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  Calculator, 
  ArrowUpRight, 
  Check, 
  Filter,
  Sparkles
} from 'lucide-react';
import { TaxProfile, TaxYearRecord, CountryTaxRegion } from '../types';
import { getTaxRegion, getAllTaxRegions, normalizeCountryCode } from '../constants/taxRegions';
import { useTranslation } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { AddEditTaxYearModal } from './AddEditTaxYearModal';
import { 
  syncTaxMilestoneToGoogleCalendar, 
  getCachedAccessToken, 
  connectGoogleCalendar 
} from '../services/googleCalendar';

interface TaxCenterViewProps {
  taxProfile: TaxProfile;
  onSaveTaxProfile: (taxData: TaxProfile) => void;
  taxYearRecords: TaxYearRecord[];
  onSaveTaxYearRecord: (record: TaxYearRecord) => void;
  onDeleteTaxYearRecord: (id: string) => void;
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
  onOpenCalendarModal?: () => void;
}

export const TaxCenterView: React.FC<TaxCenterViewProps> = ({
  taxProfile,
  onSaveTaxProfile,
  taxYearRecords,
  onSaveTaxYearRecord,
  onDeleteTaxYearRecord,
  currencyCode = 'USD',
  formatCurrency,
  onOpenCalendarModal
}) => {
  const { t, language } = useTranslation();

  // Tab View Selection: 'history' | 'profile' | 'calendar' | 'simulator'
  const [activeTab, setActiveTab] = useState<'history' | 'profile' | 'calendar' | 'simulator'>('history');

  // Modal State for Adding/Editing a Tax Year Record
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaxYearRecord | null>(null);

  // Status Filter for Year Records
  const [statusFilter, setStatusFilter] = useState<'all' | 'filed' | 'refund_received' | 'pending'>('all');

  // Calendar sync state for tax milestones
  const [syncingMilestoneId, setSyncingMilestoneId] = useState<string | null>(null);
  const [milestoneSyncFeedback, setMilestoneSyncFeedback] = useState<Record<string, string>>({});

  // Local state for Quick Tax Profile Form
  const [selectedCountry, setSelectedCountry] = useState<CountryTaxRegion>(() => normalizeCountryCode(taxProfile.country));
  const [taxYear, setTaxYear] = useState<number>(taxProfile.taxYear || 2026);
  const [expectedAnnualTaxRefund, setExpectedAnnualTaxRefund] = useState<string>(taxProfile.expectedAnnualTaxRefund?.toString() || '');
  const [actualReceivedTaxRefund, setActualReceivedTaxRefund] = useState<string>(taxProfile.actualReceivedTaxRefund?.toString() || '');
  const [estimatedAnnualTaxPayable, setEstimatedAnnualTaxPayable] = useState<string>(taxProfile.estimatedAnnualTaxPayable?.toString() || '');
  const [deductibleExpensesEstimate, setDeductibleExpensesEstimate] = useState<string>(taxProfile.deductibleExpensesEstimate?.toString() || '');
  const [taxPeriodReminderNote, setTaxPeriodReminderNote] = useState<string>(taxProfile.taxPeriodReminderNote || '');
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  // Interactive Tax Estimator State
  const [simGross, setSimGross] = useState<string>('95000');
  const [simDeductions, setSimDeductions] = useState<string>('12000');
  const [simEstimatedRate, setSimEstimatedRate] = useState<string>('22');

  const currentRegion = useMemo(() => getTaxRegion(selectedCountry, 'en'), [selectedCountry]);
  const allRegions = useMemo(() => getAllTaxRegions('en'), []);

  // Filtered and Sorted Tax Year Records (Newest Year First)
  const sortedRecords = useMemo(() => {
    let list = [...taxYearRecords];
    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }
    return list.sort((a, b) => b.year - a.year);
  }, [taxYearRecords, statusFilter]);

  // Aggregate Metrics Across Years
  const metrics = useMemo(() => {
    const totalTaxPaid = taxYearRecords.reduce((sum, r) => sum + (r.taxPaid || 0), 0);
    const totalRefund = taxYearRecords.reduce((sum, r) => sum + (r.taxRefund || 0), 0);
    const totalDeductions = taxYearRecords.reduce((sum, r) => sum + (r.deductibleExpenses || 0), 0);
    const totalGross = taxYearRecords.reduce((sum, r) => sum + (r.grossIncome || 0), 0);
    const avgEffectiveRate = totalGross > 0 ? Number(((totalTaxPaid / totalGross) * 100).toFixed(1)) : 0;

    return {
      totalTaxPaid,
      totalRefund,
      totalDeductions,
      avgEffectiveRate,
      recordsCount: taxYearRecords.length
    };
  }, [taxYearRecords]);

  // Handle Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTaxProfile({
      ...taxProfile,
      country: selectedCountry,
      taxYear: Number(taxYear) || 2026,
      expectedAnnualTaxRefund: Number(expectedAnnualTaxRefund) || 0,
      actualReceivedTaxRefund: Number(actualReceivedTaxRefund) || 0,
      estimatedAnnualTaxPayable: Number(estimatedAnnualTaxPayable) || 0,
      deductibleExpensesEstimate: Number(deductibleExpensesEstimate) || 0,
      taxPeriodReminderNote: taxPeriodReminderNote.trim(),
      updatedAt: new Date().toISOString()
    });

    setProfileSavedFeedback(true);
    setTimeout(() => setProfileSavedFeedback(false), 2500);
  };

  const handleSyncMilestone = async (kd: { id: string; title: string; isoDate?: string; description: string }) => {
    if (!kd.isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(kd.isoDate)) {
      alert(language === 'tr' ? 'Bu dönemin kesinleşmiş bir resmi takvim tarihi (YYYY-MM-DD) bulunmuyor.' : 'This milestone does not have a confirmed statutory date (YYYY-MM-DD).');
      return;
    }
    let token = getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
      } catch {
        alert(language === 'tr' ? 'Google Takvim bağlantısı kurulamadı.' : 'Could not connect to Google Calendar.');
        return;
      }
    }
    setSyncingMilestoneId(kd.id);
    try {
      await syncTaxMilestoneToGoogleCalendar(
        token,
        'primary',
        {
          id: kd.id,
          title: kd.title,
          countryCode: currentRegion.code,
          taxAuthority: currentRegion.taxAuthority,
          date: kd.isoDate,
          type: 'statutory_milestone',
          description: kd.description,
          isCompleted: false
        }
      );
      setMilestoneSyncFeedback(prev => ({ ...prev, [kd.id]: 'synced' }));
      setTimeout(() => {
        setMilestoneSyncFeedback(prev => {
          const next = { ...prev };
          delete next[kd.id];
          return next;
        });
      }, 3500);
    } catch (err: any) {
      alert(`Takvim aktarımı başarısız: ${err.message || ''}`);
    } finally {
      setSyncingMilestoneId(null);
    }
  };

  const handleSyncFilingRecord = async (r: TaxYearRecord) => {
    if (!r.filingDate || !/^\d{4}-\d{2}-\d{2}$/.test(r.filingDate)) {
      alert(language === 'tr' ? 'Bu vergi kaydında geçerli bir beyan tarihi (YYYY-MM-DD) bulunamadı.' : 'No valid filing date (YYYY-MM-DD) found on this record.');
      return;
    }
    let token = getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
      } catch {
        alert(language === 'tr' ? 'Google Takvim bağlantısı kurulamadı.' : 'Could not connect to Google Calendar.');
        return;
      }
    }
    setSyncingMilestoneId(r.id);
    try {
      await syncTaxMilestoneToGoogleCalendar(
        token,
        'primary',
        {
          id: r.id,
          title: `${r.year} Tax Return Filing`,
          countryCode: currentRegion.code,
          taxAuthority: currentRegion.taxAuthority,
          date: r.filingDate,
          type: 'declaration_filing',
          description: r.note || `${r.year} tax return filing`,
          isCompleted: r.status === 'filed' || r.status === 'refund_received'
        }
      );
      setMilestoneSyncFeedback(prev => ({ ...prev, [r.id]: 'synced' }));
      setTimeout(() => {
        setMilestoneSyncFeedback(prev => {
          const next = { ...prev };
          delete next[r.id];
          return next;
        });
      }, 3500);
    } catch (err: any) {
      alert(`Takvim aktarımı başarısız: ${err.message || ''}`);
    } finally {
      setSyncingMilestoneId(null);
    }
  };

  // Simulator Calculations
  const simGrossNum = Number(simGross) || 0;
  const simDeductNum = Number(simDeductions) || 0;
  const simRateNum = Number(simEstimatedRate) || 0;
  const simTaxableBase = Math.max(0, simGrossNum - simDeductNum);
  const simEstimatedTax = (simTaxableBase * simRateNum) / 100;
  const simTaxSavedFromDeductions = (simDeductNum * simRateNum) / 100;
  const simNetTakeHome = simGrossNum - simEstimatedTax;

  const getStatusBadge = (status: TaxYearRecord['status']) => {
    switch (status) {
      case 'refund_received':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Refund Received
          </span>
        );
      case 'filed':
        return (
          <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black inline-flex items-center gap-1">
            <Check className="w-3 h-3" />
            Filed
          </span>
        );
      case 'in_review':
        return (
          <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            In Review
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-black inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white rounded-3xl shadow-lg shadow-indigo-500/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white flex items-center gap-1">
              <span>{currentRegion.flag}</span>
              <span>{currentRegion.code} · {currentRegion.taxAuthority.split(' ')[0]}</span>
            </span>
            <span className="text-indigo-200 text-xs font-semibold">
              Active Tax Year: {taxProfile.taxYear || 2026}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            Tax & Refund Center
          </h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            Annual tax filing history, refunds received, official statutory deadlines, and regional tax deductions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingRecord(null);
              setIsRecordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-5 py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Tax Year</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tax Authority */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Tax Authority
            </span>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
              <span>{currentRegion.flag}</span>
              <span className="truncate">{currentRegion.code}</span>
            </div>
            <p className="text-[11px] text-gray-500 truncate max-w-[140px] mt-0.5">
              {currentRegion.taxAuthority}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Tax Refund */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Expected / Actual Refund
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(taxProfile.expectedAnnualTaxRefund || 0, currencyCode)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Received: {formatCurrency(taxProfile.actualReceivedTaxRefund || 0, currencyCode)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Recorded Tax Paid */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Recorded Tax Paid
            </span>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
              {formatCurrency(metrics.totalTaxPaid, currencyCode)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {metrics.recordsCount} Years Recorded
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Avg. Effective Rate */}
        <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Avg. Effective Rate
            </span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              %{metrics.avgEffectiveRate}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Deductions: {formatCurrency(metrics.totalDeductions, currencyCode)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
            activeTab === 'history'
              ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>Tax History by Year</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
            {taxYearRecords.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
            activeTab === 'profile'
              ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <Landmark className="w-4 h-4" />
          <span>Tax Profile & Adjustments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
            activeTab === 'calendar'
              ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Official Deadlines</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
            activeTab === 'simulator'
              ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <Calculator className="w-4 h-4" />
          <span>Tax & Earnings Calculator</span>
        </button>
      </div>

      {/* 1. SECTION: Tax History by Year */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Controls: Filter & Add button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    statusFilter === 'all' ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('refund_received')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    statusFilter === 'refund_received' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  Refund Received
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('filed')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    statusFilter === 'filed' ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  Filed
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    statusFilter === 'pending' ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  Pending
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Tax Year</span>
            </button>
          </div>

          {/* Desktop Multi-Year Table */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-6">Tax Year</th>
                    <th className="py-4 px-4">Gross Income</th>
                    <th className="py-4 px-4">Deductions</th>
                    <th className="py-4 px-4">Tax Paid</th>
                    <th className="py-4 px-4">Tax Refund</th>
                    <th className="py-4 px-4">Effective Rate</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sortedRecords.map((r) => {
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-gray-900 dark:text-white">
                              {r.year}
                            </span>
                            {r.filingDate && (
                              <span className="text-[10px] text-gray-400">
                                ({r.filingDate})
                              </span>
                            )}
                          </div>
                          {r.note && (
                            <p className="text-[11px] text-gray-400 line-clamp-1 max-w-xs mt-0.5">
                              {r.note}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">
                          {formatCurrency(r.grossIncome, currencyCode)}
                        </td>
                        <td className="py-4 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                          -{formatCurrency(r.deductibleExpenses, currencyCode)}
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">
                          {formatCurrency(r.taxPaid, currencyCode)}
                        </td>
                        <td className="py-4 px-4 font-black text-emerald-600 dark:text-emerald-400">
                          {r.taxRefund > 0 ? `+${formatCurrency(r.taxRefund, currencyCode)}` : '-'}
                        </td>
                        <td className="py-4 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                          %{r.effectiveTaxRate || (r.grossIncome > 0 ? ((r.taxPaid / r.grossIncome) * 100).toFixed(1) : 0)}
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.filingDate && (
                              <button
                                type="button"
                                onClick={() => handleSyncFilingRecord(r)}
                                disabled={syncingMilestoneId === r.id}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                                  milestoneSyncFeedback[r.id] === 'synced'
                                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                                    : "text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                )}
                                title={milestoneSyncFeedback[r.id] === 'synced' ? "Synced to Calendar" : "Sync Filing Date to Google Calendar"}
                              >
                                {syncingMilestoneId === r.id ? (
                                  <Clock className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                ) : milestoneSyncFeedback[r.id] === 'synced' ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Calendar className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(r);
                                setIsRecordModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete ${r.year} tax record?`)) {
                                  onDeleteTaxYearRecord(r.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {sortedRecords.map((r) => (
              <div 
                key={r.id} 
                className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-gray-900 dark:text-white">
                      {r.year}
                    </span>
                    {getStatusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecord(r);
                        setIsRecordModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTaxYearRecord(r.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-[10px] text-gray-400 block">Gross Income</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(r.grossIncome, currencyCode)}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-[10px] text-gray-400 block">Tax Paid</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(r.taxPaid, currencyCode)}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">Tax Refund</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(r.taxRefund, currencyCode)}</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block">Effective Rate</span>
                    <span className="font-black text-indigo-700 dark:text-indigo-300">%{r.effectiveTaxRate || 0}</span>
                  </div>
                </div>

                {r.note && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    "{r.note}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SECTION: Tax Profile & Adjustments */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">
                    Tax Jurisdiction & Authority
                  </h2>
                  <p className="text-xs text-gray-500">
                    Select your tax jurisdiction and statutory parameters
                  </p>
                </div>
              </div>
            </div>

            {/* Region Selector Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {allRegions.map((reg) => {
                const isSelected = selectedCountry === reg.code;
                return (
                  <button
                    key={reg.code}
                    type="button"
                    onClick={() => setSelectedCountry(reg.code)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-2xs scale-102"
                        : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    )}
                  >
                    <span className="text-2xl mb-1">{reg.flag}</span>
                    <span className="font-extrabold text-xs">{reg.code}</span>
                    <span className="text-[10px] text-gray-500 truncate w-full mt-0.5">{reg.countryName.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Country Details Strip */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-black text-indigo-900 dark:text-indigo-200">{currentRegion.taxAuthority}</span>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  Filing Deadline: {currentRegion.filingDeadline}
                </p>
              </div>
              <div className="text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                {currentRegion.refundPeriod}
              </div>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Active Tax Year
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Expected Annual Refund ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expectedAnnualTaxRefund}
                  onChange={(e) => setExpectedAnnualTaxRefund(e.target.value)}
                  placeholder="2450"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Actual Received Refund ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={actualReceivedTaxRefund}
                  onChange={(e) => setActualReceivedTaxRefund(e.target.value)}
                  placeholder="1800"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Deductible Expenses Base ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={deductibleExpensesEstimate}
                  onChange={(e) => setDeductibleExpensesEstimate(e.target.value)}
                  placeholder="3800"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Tax Season Reminder Note
                </label>
                <input
                  type="text"
                  value={taxPeriodReminderNote}
                  onChange={(e) => setTaxPeriodReminderNote(e.target.value)}
                  placeholder="Canada CRA filing deadline April 30, RRSP deadline March 1."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
              {profileSavedFeedback ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                  Tax profile updated!
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  Reflects immediately on your financial projections.
                </span>
              )}

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. SECTION: Official Deadlines & Calendar */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">
                    {currentRegion.countryName} · Official Tax Deadlines
                  </h2>
                  <p className="text-xs text-gray-500">
                    Statutory filing and payment milestones set by {currentRegion.taxAuthority}
                  </p>
                </div>
              </div>

              {onOpenCalendarModal && (
                <button
                  type="button"
                  onClick={onOpenCalendarModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-xs border border-blue-200 dark:border-blue-800 cursor-pointer transition-all self-start sm:self-auto"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Sync to Google Calendar</span>
                </button>
              )}
            </div>

            {/* Key Dates Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentRegion.keyDates.map((kd, idx) => {
                const isSyncing = syncingMilestoneId === kd.id;
                const isSynced = milestoneSyncFeedback[kd.id] === 'synced';
                return (
                  <div 
                    key={idx}
                    className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          Milestone {idx + 1}
                        </span>
                        <Calendar className="w-4 h-4 text-indigo-500" />
                      </div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">
                        {kd.title}
                      </h3>
                      <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {kd.date}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {kd.description}
                      </p>
                    </div>

                    {kd.isoDate && (
                      <button
                        type="button"
                        onClick={() => handleSyncMilestone(kd)}
                        disabled={isSyncing}
                        className={cn(
                          "w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border shadow-2xs",
                          isSynced
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                        )}
                      >
                        {isSynced ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{language === 'tr' ? 'Takvimde Güncel' : 'Synced to Calendar'}</span>
                          </>
                        ) : isSyncing ? (
                          <>
                            <Clock className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                            <span>{language === 'tr' ? 'Eşitleniyor...' : 'Syncing...'}</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{language === 'tr' ? 'Takvime Aktar / Güncelle' : 'Sync to Calendar'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Official Tax Saving Tips */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{currentRegion.countryName} Tax Saving Strategies</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentRegion.refundTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTION: Interactive Tax & Earnings Calculator */}
      {activeTab === 'simulator' && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Tax Burden & Net Take-Home Calculator
              </h2>
              <p className="text-xs text-gray-500">
                Estimate net take-home income after retirement contributions and taxes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Annual Gross Income ({currencyCode})
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={simGross}
                    onChange={(e) => setSimGross(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Tax Deductible Contributions ({currencyCode})
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={simDeductions}
                    onChange={(e) => setSimDeductions(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Canada: RRSP/FHSA, USA: 401(k)/IRA/HSA, UK: Pension, EU: Werbungskosten
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Estimated Effective Tax Rate (%)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">%</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    step="0.5"
                    value={simEstimatedRate}
                    onChange={(e) => setSimEstimatedRate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Simulation Results Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/60 dark:border-indigo-800/60 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Simulation Breakdown
              </span>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-300">Taxable Income Base:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(simTaxableBase, currencyCode)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-300">Estimated Total Tax:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(simEstimatedTax, currencyCode)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">Tax Saved from Deductions:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">+{formatCurrency(simTaxSavedFromDeductions, currencyCode)}</span>
                </div>

                <div className="pt-3 border-t border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-gray-500">Annual Net Take-Home:</span>
                    <div className="text-2xl font-black text-indigo-900 dark:text-white">
                      {formatCurrency(simNetTakeHome, currencyCode)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400">Monthly Net Avg:</span>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-200">
                      {formatCurrency(simNetTakeHome / 12, currencyCode)}/mo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Adding / Editing a Tax Year Record */}
      <AddEditTaxYearModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={(rec) => {
          onSaveTaxYearRecord(rec);
          setIsRecordModalOpen(false);
        }}
        record={editingRecord}
        currencyCode={currencyCode}
      />
    </div>
  );
};
