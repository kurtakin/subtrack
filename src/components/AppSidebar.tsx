/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useContext } from 'react';
import { 
  CreditCard, 
  ShoppingBag, 
  Home, 
  LayoutDashboard, 
  TrendingUp, 
  PiggyBank,
  BellRing,
  LogOut,
  LogIn,
  UserCheck,
  X,
  ChevronRight,
  Landmark,
  Settings
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { MainNavTab } from './Navbar';
import { cn } from '../lib/utils';

interface AppSidebarProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  activeInstallmentsCount?: number;
  activeRegularPaymentsCount?: number;
  incomesCount?: number;
  savingsCount?: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNotificationSettings: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  activeInstallmentsCount = 0,
  activeRegularPaymentsCount = 0,
  incomesCount = 0,
  savingsCount = 0,
  isMobileOpen,
  onCloseMobile,
  onOpenNotificationSettings
}) => {
  const { user, profile, openAuthModal } = useContext(AuthContext);
  const { t, language } = useTranslation();

  const handleLogout = () => signOut(auth);

  const navItems = [
    {
      id: 'dashboard' as MainNavTab,
      label: t('dashboard') || 'Dashboard',
      icon: LayoutDashboard,
      color: 'emerald',
      activeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      count: undefined
    },
    {
      id: 'subscriptions' as MainNavTab,
      label: t('subscriptions') || 'Abonelikler',
      icon: CreditCard,
      color: 'blue',
      activeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border-blue-500',
      iconClass: 'text-blue-600 dark:text-blue-400',
      count: undefined
    },
    {
      id: 'installments' as MainNavTab,
      label: t('installments') || 'Taksitler',
      icon: ShoppingBag,
      color: 'purple',
      activeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold border-purple-500',
      iconClass: 'text-purple-600 dark:text-purple-400',
      count: activeInstallmentsCount,
      countBadgeClass: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
    },
    {
      id: 'regularPayments' as MainNavTab,
      label: t('regularPayments') || 'Düzenli Ödemeler',
      icon: Home,
      color: 'amber',
      activeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold border-amber-500',
      iconClass: 'text-amber-600 dark:text-amber-400',
      count: activeRegularPaymentsCount,
      countBadgeClass: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
    },
    {
      id: 'incomeSources' as MainNavTab,
      label: t('monthlyIncomeSources') || (language === 'tr' ? 'Aylık Gelir Kaynakları' : 'Monthly Income Sources'),
      icon: TrendingUp,
      color: 'emerald',
      activeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      count: incomesCount,
      countBadgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
    },
    {
      id: 'savingsFunds' as MainNavTab,
      label: t('savingsTargets') || (language === 'tr' ? 'Birikim & Hedef Fonları' : 'Savings & Target Funds'),
      icon: PiggyBank,
      color: 'blue',
      activeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border-blue-500',
      iconClass: 'text-blue-600 dark:text-blue-400',
      count: savingsCount,
      countBadgeClass: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
    },
    {
      id: 'tax' as MainNavTab,
      label: t('taxCenter') || (language === 'tr' ? 'Vergi Yönetimi' : 'Tax Center'),
      icon: Landmark,
      color: 'indigo',
      activeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border-indigo-500',
      iconClass: 'text-indigo-600 dark:text-indigo-400',
      count: undefined
    },
    {
      id: 'settings' as MainNavTab,
      label: t('settings') || (language === 'tr' ? 'Ayarlar' : 'Settings'),
      icon: Settings,
      color: 'slate',
      activeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-slate-500',
      iconClass: 'text-slate-700 dark:text-slate-300',
      count: undefined
    }
  ];

  const handleItemClick = (id: MainNavTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 dark:border-gray-800">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleItemClick('dashboard')}
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">SubTrack</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">Pro</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium leading-none">Finans & Abonelik</p>
          </div>
        </div>

        {/* Close button for mobile */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto no-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-black tracking-wider uppercase text-gray-400 dark:text-gray-500">
          {language === 'tr' ? 'Ana Menü' : 'Main Menu'}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left group cursor-pointer border-l-3",
                isActive 
                  ? item.activeClass
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors shrink-0",
                  isActive ? "bg-white dark:bg-gray-800 shadow-xs" : "bg-gray-100 dark:bg-gray-800/60 group-hover:bg-white dark:group-hover:bg-gray-800"
                )}>
                  <Icon className={cn("w-4 h-4", isActive ? item.iconClass : "text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200")} />
                </div>
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black",
                    item.countBadgeClass || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  )}>
                    {item.count}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* User & Settings Footer */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        {user ? (
          <div className="p-2.5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div 
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                onClick={() => handleItemClick('settings')}
                title={language === 'tr' ? 'Profil ve Ayarlara Git' : 'Go to Profile & Settings'}
              >
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}`} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 object-cover shrink-0 group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {user.displayName || 'Kullanıcı'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenNotificationSettings}
                  className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title={t('notificationSettings') || 'Bildirim Ayarları'}
                >
                  <BellRing className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  title={t('logout') || 'Çıkış Yap'}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={openAuthModal}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'Hesap Değiştir' : 'Switch Account'}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openAuthModal}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('loginOrContinue')}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Permanent fixed/sticky on the left */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 lg:hidden shadow-2xl transition-transform duration-300 ease-in-out transform",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>
    </>
  );
};
