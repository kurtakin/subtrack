import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion } from 'motion/react';
import { parseISO, format } from 'date-fns';
import {
  FileSpreadsheet,
  XCircle,
  Calendar,
  Search,
  Check,
  Filter,
  BarChart3,
  Copy,
  FileText,
  Download,
  Zap
} from 'lucide-react';
import { Subscription, Payment } from '../types';
import { AuthContext } from '../context/AuthContext';
import { formatCurrency, getCurrencySymbol } from '../constants';
import { cn } from '../lib/utils';

export const ExportReportModal = ({
  isOpen,
  onClose,
  subscriptions,
  payments
}: {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  payments: Payment[];
}) => {
  const { profile } = useContext(AuthContext);
  const currencyCode = profile?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currencyCode);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => {
      if (p.date) {
        try {
          const d = parseISO(p.date);
          if (!isNaN(d.getTime())) {
            set.add(format(d, 'yyyy-MM'));
          }
        } catch {
          // ignore
        }
      }
    });
    if (set.size === 0) {
      set.add(format(new Date(), 'yyyy-MM'));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [payments]);

  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'topup'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMonths(availableMonths);
    }
  }, [isOpen, availableMonths]);

  const handleToggleMonth = (mKey: string) => {
    if (selectedMonths.includes(mKey)) {
      if (selectedMonths.length === 1) return;
      setSelectedMonths(selectedMonths.filter(k => k !== mKey));
    } else {
      setSelectedMonths([...selectedMonths, mKey]);
    }
  };

  const handleSelectAllMonths = () => {
    setSelectedMonths(availableMonths);
  };

  const handleSelectRecentMonths = (count: number) => {
    setSelectedMonths(availableMonths.slice(0, count));
  };

  const filteredRows = useMemo(() => {
    return payments.map(p => {
      const sub = subscriptions.find(s => s.id === p.subscriptionId);
      let monthKey = '';
      let monthLabel = '';
      let dateFormatted = '';
      try {
        const d = parseISO(p.date);
        monthKey = format(d, 'yyyy-MM');
        monthLabel = format(d, 'MMMM yyyy');
        dateFormatted = format(d, 'dd MMM yyyy');
      } catch {
        monthKey = 'Diğer';
        monthLabel = 'Bilinmeyen Tarih';
        dateFormatted = p.date ? p.date.split('T')[0] : '-';
      }
      return {
        id: p.id,
        date: p.date,
        dateFormatted,
        monthKey,
        monthLabel,
        subscriptionId: p.subscriptionId,
        subName: sub?.name || 'Silinmiş / Bilinmeyen',
        category: sub?.category || 'Diğer',
        status: (sub?.status || 'active') as 'active' | 'cancelled',
        type: (p.type || 'regular') as 'regular' | 'topup',
        amount: p.amount || 0,
        note: p.note || ''
      };
    }).filter(r => {
      if (selectedMonths.length > 0 && !selectedMonths.includes(r.monthKey)) {
        return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && r.type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.subName.toLowerCase().includes(q);
        const matchCategory = r.category.toLowerCase().includes(q);
        const matchNote = r.note.toLowerCase().includes(q);
        if (!matchName && !matchCategory && !matchNote) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, subscriptions, selectedMonths, statusFilter, typeFilter, searchQuery]);

  const monthlyTotals = useMemo(() => {
    const map: {
      [monthKey: string]: {
        monthKey: string;
        label: string;
        count: number;
        regularTotal: number;
        topupTotal: number;
        activeTotal: number;
        cancelledTotal: number;
        total: number;
      };
    } = {};

    filteredRows.forEach(row => {
      if (!map[row.monthKey]) {
        map[row.monthKey] = {
          monthKey: row.monthKey,
          label: row.monthLabel,
          count: 0,
          regularTotal: 0,
          topupTotal: 0,
          activeTotal: 0,
          cancelledTotal: 0,
          total: 0
        };
      }
      const item = map[row.monthKey];
      item.count += 1;
      item.total += row.amount;
      if (row.type === 'topup') {
        item.topupTotal += row.amount;
      } else {
        item.regularTotal += row.amount;
      }
      if (row.status === 'cancelled') {
        item.cancelledTotal += row.amount;
      } else {
        item.activeTotal += row.amount;
      }
    });

    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredRows]);

  const grandTotal = useMemo(() => {
    return monthlyTotals.reduce((acc, curr) => ({
      count: acc.count + curr.count,
      regularTotal: acc.regularTotal + curr.regularTotal,
      topupTotal: acc.topupTotal + curr.topupTotal,
      activeTotal: acc.activeTotal + curr.activeTotal,
      cancelledTotal: acc.cancelledTotal + curr.cancelledTotal,
      total: acc.total + curr.total,
    }), { count: 0, regularTotal: 0, topupTotal: 0, activeTotal: 0, cancelledTotal: 0, total: 0 });
  }, [monthlyTotals]);

  const handleDownloadCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = [
      'Tarih',
      'Dönem (Ay)',
      'Abonelik / Hizmet',
      'Kategori',
      'Abonelik Durumu',
      'Ödeme Türü',
      `Tutar (${currencyCode})`,
      'Para Birimi',
      'Açıklama / Not'
    ];

    const dataRows = filteredRows.map(r => [
      r.date.split('T')[0],
      r.monthLabel,
      r.subName,
      r.category,
      r.status === 'active' ? 'Aktif' : 'Kapalı (İptal)',
      r.type === 'topup' ? 'Ek Harcama / Limit' : 'Plan Yenilemesi',
      r.amount.toFixed(2),
      currencyCode,
      r.note || ''
    ]);

    const summaryHeader = [
      `--- AYLIK TOPLAMLAR VE DÖNEM DÖKÜMÜ (${currencyCode}) ---`,
      '', '', '', '', '', '', '', ''
    ];

    const summaryColumns = [
      'Dönem / Ay',
      'İşlem Sayısı',
      `Sabit Plan Ödemeleri (${currencyCode})`,
      `Ek Harcamalar (${currencyCode})`,
      `Aktif Abonelikler Tutarı (${currencyCode})`,
      `Kapalı (İptal) Abonelikler Tutarı (${currencyCode})`,
      `Aylık Genel Toplam (${currencyCode})`,
      'Para Birimi',
      ''
    ];

    const summaryRows = monthlyTotals.map(m => [
      m.label,
      m.count.toString(),
      m.regularTotal.toFixed(2),
      m.topupTotal.toFixed(2),
      m.activeTotal.toFixed(2),
      m.cancelledTotal.toFixed(2),
      m.total.toFixed(2),
      currencyCode,
      ''
    ]);

    const grandTotalRow = [
      'GENEL TOPLAM',
      grandTotal.count.toString(),
      grandTotal.regularTotal.toFixed(2),
      grandTotal.topupTotal.toFixed(2),
      grandTotal.activeTotal.toFixed(2),
      grandTotal.cancelledTotal.toFixed(2),
      grandTotal.total.toFixed(2),
      currencyCode,
      ''
    ];

    const csvLines = [
      headers.map(c => `"${c.replace(/"/g, '""')}"`).join(','),
      ...dataRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
      '',
      summaryHeader.map(c => `"${c}"`).join(','),
      summaryColumns.map(c => `"${c}"`).join(','),
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      grandTotalRow.map(c => `"${c}"`).join(',')
    ];

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `harcama_raporu_${currencyCode}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    if (subscriptions.length === 0 && payments.length === 0) return;
    const exportData = {
      version: 1,
      appName: 'SubTrack',
      exportedAt: new Date().toISOString(),
      subscriptions: subscriptions.map(({ id, ...s }) => s),
      payments: payments.map(({ id, ...p }) => p)
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtrack_yedek_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyTable = () => {
    if (filteredRows.length === 0) return;
    const header = ['Tarih', 'Dönem', 'Hizmet', 'Kategori', 'Durum', 'Tür', 'Tutar (CAD)', 'Para Birimi', 'Açıklama'].join('\t');
    const lines = filteredRows.map(r => [
      r.date.split('T')[0],
      r.monthLabel,
      r.subName,
      r.category,
      r.status === 'active' ? 'Aktif' : 'Kapalı',
      r.type === 'topup' ? 'Ek Harcama' : 'Plan',
      r.amount.toFixed(2),
      'CAD',
      r.note || ''
    ].join('\t'));

    const summaryLines = monthlyTotals.map(m => [
      `[Toplam] ${m.label}`,
      `${m.count} işlem`,
      `Plan: ${m.regularTotal.toFixed(2)} CAD`,
      `Ek: ${m.topupTotal.toFixed(2)} CAD`,
      `Kapalı: ${m.cancelledTotal.toFixed(2)} CAD`,
      `Ay Toplamı: ${m.total.toFixed(2)} CAD`
    ].join('\t'));

    const grandLine = `GENEL TOPLAM\t${grandTotal.count} işlem\tPlan: ${grandTotal.regularTotal.toFixed(2)} CAD\tEk: ${grandTotal.topupTotal.toFixed(2)} CAD\tKapalı: ${grandTotal.cancelledTotal.toFixed(2)} CAD\tTOPLAM: ${grandTotal.total.toFixed(2)} CAD`;

    const textToCopy = [header, ...lines, '', '--- AYLIK TOPLAMLAR (CAD) ---', ...summaryLines, grandLine].join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900 sticky top-0 z-20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Veri Dışa Aktarma & Raporlama Merkezi
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-extrabold text-[11px] rounded-lg flex items-center gap-1">
                  {currencyCode} ({currencySymbol})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Aylara ve abonelik durumuna göre filtreleyerek detaylı döküm alın ve {currencyCode} cinsinden alt toplamlarla dışa aktarın.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-5 sm:p-6 bg-gray-50/70 dark:bg-gray-850/60 border-b border-gray-100 dark:border-gray-800 space-y-4 shrink-0 overflow-y-auto max-h-[35vh]">
          {/* Month Multi-Selector */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Ayları Filtreleyin ({selectedMonths.length} Ay Seçili)
              </label>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={handleSelectAllMonths}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Tüm Aylar
                </button>
                {availableMonths.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleSelectRecentMonths(1)}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    Yalnızca Son Ay
                  </button>
                )}
                {availableMonths.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleSelectRecentMonths(3)}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    Son 3 Ay
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableMonths.map(mKey => {
                const isSelected = selectedMonths.includes(mKey);
                let label = mKey;
                try {
                  label = format(parseISO(`${mKey}-01`), 'MMM yyyy');
                } catch {
                  // fallback
                }
                const countInMonth = payments.filter(p => {
                  try {
                    return p.date && format(parseISO(p.date), 'yyyy-MM') === mKey;
                  } catch {
                    return false;
                  }
                }).length;

                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => handleToggleMonth(mKey)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer",
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    )}
                  >
                    <span>{label}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                    )}>
                      {countInMonth}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Type & Search Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60 dark:border-gray-800">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Abonelik Durumu
              </label>
              <div className="grid grid-cols-3 gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    statusFilter === 'all'
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  )}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    statusFilter === 'active'
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-green-600"
                  )}
                >
                  Aktifler
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('cancelled')}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    statusFilter === 'cancelled'
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-rose-600"
                  )}
                  title="Aylara göre kapalı / iptal edilen abonelikler"
                >
                  Kapalı
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Ödeme Türü
              </label>
              <div className="grid grid-cols-3 gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    typeFilter === 'all'
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  )}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('regular')}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    typeFilter === 'regular'
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-blue-600"
                  )}
                >
                  Planlar
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('topup')}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    typeFilter === 'topup'
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-amber-600"
                  )}
                >
                  Ek Limit
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Hizmet / Açıklama Ara
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Netflix, OpenAI, Token..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area: Live Table + Monthly Totals Section at Bottom */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Filtrelenen İşlemler Dökümü
              </span>
              <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-extrabold rounded-full">
                {filteredRows.length} Kayıt
              </span>
            </div>
            {isCopied && (
              <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Panoya Kopyalandı
              </span>
            )}
          </div>

          {filteredRows.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm max-h-[36vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="p-3">Tarih</th>
                    <th className="p-3">Abonelik / Hizmet</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Durum</th>
                    <th className="p-3">Ödeme Türü</th>
                    <th className="p-3">Not / Açıklama</th>
                    <th className="p-3 text-right">Tutar (CAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {row.dateFormatted}
                      </td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {row.subName}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {row.category}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {row.status === 'active' ? (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 font-extrabold rounded-md text-[10px]">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-extrabold rounded-md text-[10px]">
                            Kapalı (İptal)
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {row.type === 'topup' ? (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold rounded-md text-[10px] flex items-center gap-1 w-fit">
                            <Zap className="w-3 h-3 text-amber-600" />
                            Ek Harcama
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-extrabold rounded-md text-[10px] w-fit">
                            Plan Yenilemesi
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {row.note || '-'}
                      </td>
                      <td className="p-3 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(row.amount, currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <Filter className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Seçilen kriterlere uygun kayıt bulunamadı</p>
              <p className="text-xs text-gray-400 mt-0.5">Ay seçimini veya durum filtrelerini değiştirmeyi deneyin</p>
            </div>
          )}

          {/* TABLONUN ALTINDA: AYLIK TOPLAMLAR VE DÖNEM DÖKÜMÜ */}
          {monthlyTotals.length > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white">
                      Tablo Altı Aylık Toplamlar Özeti ({currencyCode})
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Her ay için gerçekleşen plan ödemeleri, ek çekimler ve kapalı abonelik harcamaları
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl w-fit">
                  {monthlyTotals.length} Ay Özeti ({currencyCode})
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="p-3">Dönem / Ay</th>
                      <th className="p-3 text-center">İşlem Sayısı</th>
                      <th className="p-3 text-right">Sabit Planlar ({currencyCode})</th>
                      <th className="p-3 text-right">Ek Harcamalar ({currencyCode})</th>
                      <th className="p-3 text-right">Kapalı Abonelikler ({currencyCode})</th>
                      <th className="p-3 text-right">Ay Toplamı ({currencyCode})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                    {monthlyTotals.map(m => (
                      <tr key={m.monthKey} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="p-3 font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          {m.label}
                        </td>
                        <td className="p-3 text-center text-gray-500 dark:text-gray-400 font-semibold">
                          {m.count} işlem
                        </td>
                        <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-semibold">
                          {formatCurrency(m.regularTotal, currencyCode)}
                        </td>
                        <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                          {formatCurrency(m.topupTotal, currencyCode)}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {m.cancelledTotal > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              {formatCurrency(m.cancelledTotal, currencyCode)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-black text-gray-900 dark:text-white text-sm">
                          {formatCurrency(m.total, currencyCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50/80 dark:bg-blue-950/50 border-t-2 border-blue-200 dark:border-blue-800/80 font-black">
                    <tr>
                      <td className="p-3.5 text-blue-950 dark:text-blue-200 uppercase tracking-wider text-xs">
                        GENEL TOPLAM ({currencyCode})
                      </td>
                      <td className="p-3.5 text-center text-blue-800 dark:text-blue-300 font-extrabold">
                        {grandTotal.count} işlem
                      </td>
                      <td className="p-3.5 text-right text-blue-900 dark:text-blue-200 font-bold">
                        {formatCurrency(grandTotal.regularTotal, currencyCode)}
                      </td>
                      <td className="p-3.5 text-right text-amber-700 dark:text-amber-300 font-extrabold">
                        {formatCurrency(grandTotal.topupTotal, currencyCode)}
                      </td>
                      <td className="p-3.5 text-right text-rose-700 dark:text-rose-300 font-bold">
                        {formatCurrency(grandTotal.cancelledTotal, currencyCode)}
                      </td>
                      <td className="p-3.5 text-right text-base text-blue-950 dark:text-white font-black">
                        {formatCurrency(grandTotal.total, currencyCode)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyTable}
              disabled={filteredRows.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Excel veya Google E-Tablolar'a yapıştırmak üzere panoya kopyalayın"
            >
              {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Kopyalandı!' : 'Tabloyu Kopyala'}</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              disabled={subscriptions.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Tüm aboneliklerinizi JSON yedek dosyası olarak indirin"
            >
              <FileText className="w-4 h-4" />
              <span>JSON Yedek İndir</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={filteredRows.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              title="Alt toplamlarıyla birlikte CSV dosyası indirin"
            >
              <Download className="w-4 h-4" />
              <span>CSV Olarak İndir (Excel & Sheets)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-xl transition-all hover:opacity-90 cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </motion.div>
    </div>
  );
};
