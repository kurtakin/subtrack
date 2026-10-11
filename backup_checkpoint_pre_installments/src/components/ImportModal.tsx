import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  FileText,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export interface ImportCandidate {
  name: string;
  amount: number;
  category: string;
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextPaymentDate: string;
  status: 'active' | 'cancelled';
  icon: string;
  pricingType: 'fixed' | 'usage_based' | 'hybrid';
  selected: boolean;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Omit<ImportCandidate, 'selected'>[]) => Promise<number>;
  currencyCode?: string;
  formatCurrency: (amount: number, currency?: string) => string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currencyCode = 'CAD',
  formatCurrency
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [parsedItems, setParsedItems] = useState<ImportCandidate[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const normalizeCycle = (raw: any): 'monthly' | 'yearly' | 'weekly' | 'quarterly' => {
    const s = String(raw || '').toLowerCase();
    if (s.includes('year') || s.includes('yıl') || s.includes('sene') || s.includes('annual')) return 'yearly';
    if (s.includes('week') || s.includes('hafta')) return 'weekly';
    if (s.includes('quarter') || s.includes('çeyrek') || s.includes('3 ay')) return 'quarterly';
    return 'monthly';
  };

  const parseJSON = (text: string): ImportCandidate[] => {
    const parsed = JSON.parse(text);
    let list: any[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.subscriptions)) list = parsed.subscriptions;
      else if (Array.isArray(parsed.items)) list = parsed.items;
      else if (Array.isArray(parsed.data)) list = parsed.data;
      else throw new Error('JSON formatında abonelik dizisi (array) bulunamadı.');
    } else {
      throw new Error('Geçersiz JSON verisi.');
    }
    const nowIso = new Date().toISOString();
    return list.map((item: any, idx: number) => {
      const name = String(item.name || item.title || item.ad || `Abonelik ${idx + 1}`).trim();
      let amount = parseFloat(item.amount ?? item.tutar ?? item.fiyat ?? item.price ?? 0);
      if (isNaN(amount)) amount = 0;
      let nextDate = item.nextPaymentDate || item.date || item.tarih || item.nextPayment || nowIso;
      try {
        const d = new Date(nextDate);
        if (isNaN(d.getTime())) nextDate = nowIso;
        else nextDate = d.toISOString();
      } catch {
        nextDate = nowIso;
      }
      return {
        name,
        amount,
        category: String(item.category || item.kategori || 'Other'),
        billingCycle: normalizeCycle(item.billingCycle || item.cycle || item.periyot),
        nextPaymentDate: nextDate,
        status: (item.status === 'cancelled' || item.durum === 'iptal' ? 'cancelled' : 'active') as 'active' | 'cancelled',
        icon: item.icon || 'tag',
        pricingType: item.pricingType || 'fixed',
        selected: true
      };
    }).filter(x => x.name.length > 0);
  };

  const parseCSV = (text: string): ImportCandidate[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];
    // Check delimiter: comma vs semicolon vs tab
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
    else if (firstLine.includes('\t')) delimiter = '\t';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const rows = lines.map(parseLine);
    if (rows.length === 0) return [];

    let startIndex = 0;
    // Check if first row is header
    const firstRowText = rows[0].join(' ').toLowerCase();
    const hasHeader = firstRowText.includes('ad') ||
                      firstRowText.includes('name') ||
                      firstRowText.includes('tutar') ||
                      firstRowText.includes('amount') ||
                      firstRowText.includes('kategori');
    if (hasHeader) {
      startIndex = 1;
    }

    const nowIso = new Date().toISOString();
    const candidates: ImportCandidate[] = [];
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue;
      const name = row[0].replace(/^["']|["']$/g, '').trim();
      if (!name) continue;

      // Extract amount: clean currency symbols or commas
      const rawAmount = (row[1] || '0').replace(/[^0-9.,-]/g, '').replace(',', '.');
      const amount = parseFloat(rawAmount) || 0;
      const category = row[2] ? row[2].replace(/^["']|["']$/g, '').trim() : 'Other';
      const cycle = normalizeCycle(row[3]);

      let nextDate = nowIso;
      if (row[4]) {
        try {
          const d = new Date(row[4].replace(/^["']|["']$/g, '').trim());
          if (!isNaN(d.getTime())) nextDate = d.toISOString();
        } catch {}
      }

      candidates.push({
        name,
        amount,
        category,
        billingCycle: cycle,
        nextPaymentDate: nextDate,
        status: 'active',
        icon: 'tag',
        pricingType: 'fixed',
        selected: true
      });
    }
    return candidates;
  };

  const handleProcessText = (raw: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrorMsg('Lütfen içe aktarılacak metin veya dosya sağlayın.');
      return;
    }
    try {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const items = parseJSON(trimmed);
        if (items.length === 0) throw new Error('Hiçbir geçerli abonelik satırı tespit edilemedi.');
        setParsedItems(items);
      } else {
        const items = parseCSV(trimmed);
        if (items.length === 0) throw new Error('Hiçbir geçerli CSV satırı tespit edilemedi.');
        setParsedItems(items);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Veri işlenirken bir hata oluştu. Formatı kontrol edin.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessText(content);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Dosya okunamadı. Lütfen tekrar deneyin.');
    };
    reader.readAsText(file);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setParsedItems(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const handleToggleItem = (index: number) => {
    setParsedItems(prev => prev.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
  };

  const handleRemoveCandidate = (index: number) => {
    setParsedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const selectedCount = parsedItems.filter(i => i.selected).length;
  const selectedTotal = parsedItems.filter(i => i.selected).reduce((sum, i) => sum + i.amount, 0);

  const handleExecuteImport = async () => {
    const itemsToImport = parsedItems.filter(i => i.selected).map(({ selected, ...rest }) => rest);
    if (itemsToImport.length === 0) {
      setErrorMsg('Lütfen içe aktarılacak en az bir abonelik seçin.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const count = await onImport(itemsToImport);
      setSuccessMsg(`${count} adet gerçek abonelik başarıyla hesabınıza aktarıldı!`);
      setTimeout(() => {
        onClose();
        setParsedItems([]);
        setPastedText('');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Abonelikler veritabanına eklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Abonelikleri İçe Aktar</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Yedek dosyanızı (.json, .csv) yükleyin veya doğrudan yapıştırın</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-2xl flex items-center gap-3 text-green-700 dark:text-green-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Mode Tabs */}
          {parsedItems.length === 0 && (
            <>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
                <button
                  onClick={() => setActiveTab('file')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'file'
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Dosya Yükle (.JSON / .CSV)</span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Metin / JSON Yapıştır</span>
                </button>
              </div>

              {activeTab === 'file' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/30 flex flex-col items-center justify-center gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,text/csv,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      Dosyanızı seçmek için tıklayın veya buraya sürükleyin
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Desteklenen formatlar: SubTrack JSON Yedeği, CSV Tablosu
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Örnek CSV Formatı:\nAd, Tutar, Kategori, Periyot, Tarih\nNetflix, 299, Eğlence, monthly, 2026-10-15\nTurkcell, 450, İletişim, monthly, 2026-10-20\n\nVeya JSON formatında yapıştırabilirsiniz.`}
                    rows={8}
                    className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleProcessText(pastedText)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Verileri Çözümle ve Önizle</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Preview of Parsed Items */}
          {parsedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Tespit Edilen Abonelikler ({parsedItems.length} Adet)
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Hesabınıza aktarmak istediklerinizi işaretleyin
                  </p>
                </div>
                <button
                  onClick={() => setParsedItems([])}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                >
                  Farklı Dosya Seç
                </button>
              </div>

              {/* Selection Bar */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parsedItems.length > 0 && parsedItems.every(i => i.selected)}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tümünü Seç ({selectedCount}/{parsedItems.length})</span>
                </label>
                <div className="font-bold text-gray-900 dark:text-white">
                  Seçilen Toplam: <span className="text-blue-600 dark:text-blue-400">{formatCurrency(selectedTotal, currencyCode)}</span>
                </div>
              </div>

              {/* Table / List */}
              <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-100 dark:border-gray-800 rounded-2xl p-2 bg-gray-50/50 dark:bg-gray-800/20">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                      item.selected
                        ? 'bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-900/60 shadow-xs'
                        : 'bg-gray-100/50 dark:bg-gray-800/40 border-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(idx)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.billingCycle === 'monthly' ? 'Aylık' : item.billingCycle === 'yearly' ? 'Yıllık' : item.billingCycle} • Sonraki: {item.nextPaymentDate.split('T')[0]}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-gray-900 dark:text-white text-sm">
                        {formatCurrency(item.amount, currencyCode)}
                      </span>
                      <button
                        onClick={() => handleRemoveCandidate(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="Listeden Çıkar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          >
            İptal
          </button>
          {parsedItems.length > 0 && (
            <button
              onClick={handleExecuteImport}
              disabled={selectedCount === 0 || isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Aktarılıyor...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Seçilen {selectedCount} Aboneliği Kaydet</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
