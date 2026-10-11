import React, { useContext } from 'react';
import { motion } from 'motion/react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Tag,
  Zap,
  Calendar,
  Clock,
  XCircle,
  Settings,
  Trash2
} from 'lucide-react';
import { Subscription } from '../types';
import { AuthContext } from '../context/AuthContext';
import { ICON_MAP, formatCurrency } from '../constants';
import { cn } from '../lib/utils';

export const SubscriptionCard: React.FC<{ 
  sub: Subscription, 
  onEdit: (s: Subscription) => void, 
  onDelete: (id: string) => void | Promise<void>,
  onToggleStatus: (sub: Subscription) => void | Promise<void>,
  onViewHistory: (sub: Subscription) => void,
  onAddTopUp: (sub: Subscription) => void,
  onSyncCalendar?: (sub: Subscription) => void,
  currentMonthTopUpsTotal?: number
}> = ({ sub, onEdit, onDelete, onToggleStatus, onViewHistory, onAddTopUp, onSyncCalendar, currentMonthTopUpsTotal = 0 }) => {
  const { profile } = useContext(AuthContext);
  const isUsageBased = sub.pricingType === 'usage_based';
  const isHybrid = sub.pricingType === 'hybrid';
  const daysRemaining = differenceInDays(parseISO(sub.nextPaymentDate), new Date());
  const isOverdue = !isUsageBased && daysRemaining < 0;
  const IconComponent = ICON_MAP[sub.icon] || Tag;
  const isActive = sub.status === 'active';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl hover:shadow-blue-50/50 dark:hover:shadow-blue-900/10 transition-all flex flex-col justify-between",
        !isActive && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              isActive ? "bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
            )}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn("font-bold text-gray-900 dark:text-white", !isActive && "line-through")}>{sub.name}</h3>
                {isUsageBased && (
                  <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold rounded-md uppercase tracking-tight flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    Kullandıkça
                  </span>
                )}
                {isHybrid && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold rounded-md uppercase tracking-tight flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    Hibrit
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{sub.category}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(sub.amount, profile?.currency)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isUsageBased ? 'tahmini aylık' : `her ${sub.billingCycle === 'monthly' ? 'ay' : 'yıl'}`}
            </p>
          </div>
        </div>

        {/* Current Month Top-up / Extra Usage summary if exists */}
        {currentMonthTopUpsTotal > 0 && (
          <div className="mb-3 px-3 py-1.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Bu Ay Ek Çekim / Limit:
            </span>
            <span className="font-extrabold text-amber-900 dark:text-amber-200">
              +{formatCurrency(currentMonthTopUpsTotal, profile?.currency)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm">
          {isActive ? (
            isUsageBased ? (
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Limit Bittikçe Çekilir
              </span>
            ) : (
              <>
                <Calendar className={cn("w-4 h-4", isOverdue ? "text-red-500" : "text-gray-400")} />
                <span className={cn(
                  "font-medium",
                  isOverdue ? "text-red-600" : "text-gray-600 dark:text-gray-300"
                )}>
                  {isOverdue ? 'Gecikmiş' : `Sonraki: ${format(parseISO(sub.nextPaymentDate), 'MMM d')}`}
                </span>
                {daysRemaining >= 0 && daysRemaining <= 7 && (
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold rounded-full uppercase">
                    Yaklaştı
                  </span>
                )}
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Oto
                </span>
                {sub.calendarEventId && (
                  <span 
                    className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-full flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40"
                    title="Google Takvim ile senkronize (1 gün öncesine alarmlı)"
                  >
                    <Calendar className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Takvimde (1g Alarm)</span>
                  </span>
                )}
              </>
            )
          ) : (
            <span className="text-gray-400 font-medium italic flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              İptal Edildi
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Add Top-up / Extra Charge button */}
          {isActive && (
            <button
              onClick={() => onAddTopUp(sub)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg transition-colors border border-amber-200/50 dark:border-amber-800/40 cursor-pointer"
              title="Bu aboneliğe ek harcama veya limit dolumu kaydet"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>+ Ek Ödeme</span>
            </button>
          )}

          <button 
            onClick={() => onToggleStatus(sub)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer",
              isActive ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
            )}
            title={isActive ? "İptal Edildi Olarak İşaretle" : "Aktif Yap"}
          >
            <span
              className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                isActive ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isActive && onSyncCalendar && (
              <button 
                onClick={() => onSyncCalendar(sub)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  sub.calendarEventId 
                    ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" 
                    : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                )}
                title={sub.calendarEventId ? "Google Takvimde güncelle (Tekrar senkronize et)" : "Google Takvim'e ekle (1 gün önce alarmlı)"}
              >
                <Calendar className="w-4 h-4" />
              </button>
            )}

            <button 
              onClick={() => onViewHistory(sub)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
              title="Ödeme Geçmişini Gör"
            >
              <Clock className="w-4 h-4" />
            </button>

            <button 
              onClick={() => onEdit(sub)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
              title="Düzenle"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button 
              onClick={() => onDelete(sub.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
