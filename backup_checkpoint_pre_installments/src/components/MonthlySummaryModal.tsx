import React, { useContext, useMemo } from 'react';
import { motion } from 'motion/react';
import { parseISO, format } from 'date-fns';
import { PieChart, XCircle, Zap, Info, Tag, CreditCard } from 'lucide-react';
import { Payment, Subscription } from '../types';
import { AuthContext } from '../context/AuthContext';
import { ICON_MAP, formatCurrency } from '../constants';

export const MonthlySummaryModal = ({ 
  isOpen, 
  onClose, 
  payments, 
  subscriptions, 
  onSelectMonth,
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  payments: Payment[], 
  subscriptions: Subscription[], 
  onSelectMonth?: (monthKey: string) => void;
}) => {
  const { profile } = useContext(AuthContext);

  const monthlySummaries = useMemo(() => {
    const data: { 
      [key: string]: { 
        total: number;
        regularTotal: number;
        topupTotal: number;
        subs: { [key: string]: { amount: number; regular: number; topup: number; icon: string } }; 
        label: string;
      } 
    } = {};
    
    payments.forEach(p => {
      try {
        const d = parseISO(p.date);
        if (isNaN(d.getTime())) return;
        
        const monthKey = format(d, 'yyyy-MM');
        const monthLabel = format(d, 'MMMM yyyy');
        const sub = subscriptions.find(s => s.id === p.subscriptionId);
        const subName = sub?.name || 'Bilinmeyen';
        const subIcon = sub?.icon || 'tag';
        const isTopUp = p.type === 'topup';

        if (!data[monthKey]) {
          data[monthKey] = { total: 0, regularTotal: 0, topupTotal: 0, subs: {}, label: monthLabel };
        }
        data[monthKey].total += p.amount || 0;
        if (isTopUp) {
          data[monthKey].topupTotal += p.amount || 0;
        } else {
          data[monthKey].regularTotal += p.amount || 0;
        }
        
        if (!data[monthKey].subs[subName]) {
          data[monthKey].subs[subName] = { amount: 0, regular: 0, topup: 0, icon: subIcon };
        }
        data[monthKey].subs[subName].amount += p.amount || 0;
        if (isTopUp) {
          data[monthKey].subs[subName].topup += p.amount || 0;
        } else {
          data[monthKey].subs[subName].regular += p.amount || 0;
        }
      } catch (e) {
        console.error('Error processing payment for summary:', e);
      }
    });
    
    return Object.entries(data)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => ({ key, ...value }));
  }, [payments, subscriptions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Aylık Harcama ve Ödeme Özeti
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sabit abonelikler ve ek limit çekimleri dökümü</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {monthlySummaries.length > 0 ? (
            monthlySummaries.map((summary) => (
              <div key={summary.key} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-2.5 z-10 border-b border-gray-100 dark:border-gray-800 gap-2">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{summary.label}</h3>
                    <div className="flex items-center gap-2 text-xs font-semibold mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400">Plan: {formatCurrency(summary.regularTotal, profile?.currency)}</span>
                      {summary.topupTotal > 0 && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <Zap className="w-3 h-3" />
                            Ek Limit: {formatCurrency(summary.topupTotal, profile?.currency)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {onSelectMonth && (
                      <button
                        onClick={() => {
                          onClose();
                          onSelectMonth(summary.key);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        title="Bu ayın detaylı ve mükerrer kayıtlarını inceleyin"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Kayıtları İncele</span>
                      </button>
                    )}
                    <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none">
                      Toplam: {formatCurrency(summary.total, profile?.currency)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(summary.subs).map(([name, subData]) => {
                    const data = subData as { amount: number; regular: number; topup: number; icon: string };
                    const Icon = ICON_MAP[data.icon] || Tag;
                    return (
                      <div key={name} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block">{name}</span>
                            {data.topup > 0 && (
                              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5" />
                                {formatCurrency(data.topup, profile?.currency)} ek çekim
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-extrabold text-gray-900 dark:text-white">
                          {formatCurrency(data.amount, profile?.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <CreditCard className="w-16 h-16 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Henüz harcama geçmişi bulunamadı</p>
            </div>
          )}
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            * Bireysel ödeme ve ek limit çekim tarihlerini abonelik kartlarındaki geçmiş simgesine veya Kayıtları İncele butonuna tıklayarak yönetebilirsiniz.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
