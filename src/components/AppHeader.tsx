/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useContext, useRef, useEffect } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  BellRing, 
  Calendar, 
  ChevronDown, 
  Check, 
  LogIn
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../constants/translations';
import { MainNavTab } from './Navbar';
import { cn } from '../lib/utils';

interface AppHeaderProps {
  activeTab: MainNavTab;
  onToggleMobileMenu: () => void;
  onOpenCalendarModal?: () => void;
  onOpenNotificationSettings: () => void;
  isCalendarSyncEnabled?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onToggleMobileMenu,
  onOpenCalendarModal,
  onOpenNotificationSettings,
  isCalendarSyncEnabled = false
}) => {
  const { user, profile, toggleDarkMode, darkMode, openAuthModal } = useContext(AuthContext);
  const { language, setLanguage, t } = useTranslation();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const getPageTitle = (tab: MainNavTab) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: t('dashboard') || 'Dashboard',
          subtitle: language === 'tr' ? 'Finansal genel bakış ve harcama istatistikleri' : 'Financial overview & spending analytics'
        };
      case 'subscriptions':
        return {
          title: t('subscriptions') || 'Abonelikler',
          subtitle: language === 'tr' ? 'Tekrarlayan dijital servisler ve üyelikler' : 'Recurring digital services and memberships'
        };
      case 'installments':
        return {
          title: t('installments') || 'Taksitler',
          subtitle: language === 'tr' ? 'Kredi kartı taksitleri ve borç takibi' : 'Card installments and debt tracking'
        };
      case 'regularPayments':
        return {
          title: t('regularPayments') || 'Düzenli Ödemeler',
          subtitle: language === 'tr' ? 'Kira, faturalar, aidat ve kredi ödemeleri' : 'Rent, utility bills, dues and recurring loans'
        };
      case 'incomeSources':
        return {
          title: t('monthlyIncomeSources') || 'Aylık Gelir Kaynakları',
          subtitle: language === 'tr' ? 'Maaş, ek gelir, kira ve serbest kazanç yönetimi' : 'Salary, side income, rental and freelance earnings'
        };
      case 'savingsFunds':
        return {
          title: t('savingsTargets') || 'Birikim & Hedef Fonları',
          subtitle: language === 'tr' ? 'Acil durum fonu, tatil, birikim ve yatırım hedefleri' : 'Emergency fund, travel, savings and investment goals'
        };
      case 'tax':
        return {
          title: t('taxCenter') || (language === 'tr' ? 'Vergi Yönetimi' : 'Tax Center'),
          subtitle: language === 'tr' ? 'Yıllara göre ödenen ve iade alınan vergi takibi, yasal ayarlamalar' : 'Tax payments, refund history, deductions and regional compliance'
        };
      case 'settings':
        return {
          title: t('settings') || (language === 'tr' ? 'Ayarlar' : 'Settings'),
          subtitle: language === 'tr' ? 'Kişisel bilgiler, profil ayarları, bildirimler ve veri yönetimi' : 'Personal information, preferences, notifications and data backup'
        };
      default:
        return {
          title: 'SubTrack',
          subtitle: 'Kişisel Finans Yönetimi'
        };
    }
  };

  const { title, subtitle } = getPageTitle(activeTab);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Mobile hamburger + Active View Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-white truncate">
                {title}
              </h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Right: Global Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Google Calendar Quick Link */}
            {onOpenCalendarModal && (
              <button
                type="button"
                onClick={onOpenCalendarModal}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  isCalendarSyncEnabled
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:bg-blue-100"
                )}
                title={t('googleCalendarTooltip') || 'Google Calendar Takvimi'}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Google Calendar</span>
                {isCalendarSyncEnabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
              </button>
            )}

            {/* Currency Tag */}
            {profile?.currency && (
              <div className="hidden min-[480px]:flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-black border border-gray-200/60 dark:border-gray-700/60">
                {profile.currency}
              </div>
            )}

            {/* Language Selector Dropdown */}
            <div className="relative" ref={languageMenuRef}>
              <button
                type="button"
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200/70 dark:bg-gray-800 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-200 border border-gray-200/60 dark:border-gray-700/60 transition-all cursor-pointer"
                title={t('language') || 'Dil'}
                aria-label="Select Language"
              >
                <span className="text-base leading-none">{currentLanguageInfo.flag}</span>
                <span className="uppercase tracking-wider font-extrabold hidden min-[440px]:inline">{currentLanguageInfo.code}</span>
                <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform duration-200", isLanguageOpen && "rotate-180")} />
              </button>

              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    {t('language')}
                  </div>
                  <div className="p-1 space-y-0.5">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = lang.code === language;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLanguageOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base leading-none">{lang.flag}</span>
                            <div className="flex flex-col">
                              <span className="font-semibold leading-tight">{lang.nativeName}</span>
                              <span className="text-[10px] text-gray-400 leading-tight font-normal">{lang.name}</span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Mode Toggle */}
            <button 
              type="button"
              onClick={toggleDarkMode}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title={darkMode ? (t('lightMode') || 'Açık Mod') : (t('darkMode') || 'Koyu Mod')}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <button 
              type="button"
              onClick={onOpenNotificationSettings}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title={t('notificationSettings') || 'Bildirim Ayarları'}
            >
              <BellRing className="w-4 h-4" />
            </button>

            {/* Auth / User Header Avatar */}
            {user ? (
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}`} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 shadow-xs cursor-pointer"
                referrerPolicy="no-referrer"
                onClick={openAuthModal}
                title={user.displayName || user.email}
              />
            ) : (
              <button 
                type="button"
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('loginOrContinue')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
