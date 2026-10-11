import React, { useState, useContext, useRef, useEffect } from 'react';
import { CreditCard, Sun, Moon, BellRing, UserCheck, LogOut, LogIn, ShoppingBag, Home, LayoutDashboard, Globe, ChevronDown, Check } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../constants/translations';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { setCachedAccessToken } from '../services/googleCalendar';
import { cn } from '../lib/utils';

interface NavbarProps {
  activeTab?: 'dashboard' | 'subscriptions' | 'installments' | 'regularPayments';
  onSelectTab?: (tab: 'dashboard' | 'subscriptions' | 'installments' | 'regularPayments') => void;
  activeInstallmentsCount?: number;
  activeRegularPaymentsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab = 'subscriptions',
  onSelectTab,
  activeInstallmentsCount = 0,
  activeRegularPaymentsCount = 0
}) => {
  const { user, profile, toggleDarkMode, darkMode, openAuthModal } = useContext(AuthContext);
  const { language, setLanguage, t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const handleLogout = () => signOut(auth);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3 sm:gap-6">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onSelectTab && onSelectTab('dashboard')}
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white hidden min-[400px]:inline">SubTrack</span>
              </div>

              {onSelectTab && (
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 text-xs font-extrabold">
                  <button
                    type="button"
                    onClick={() => onSelectTab('dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('dashboard')}</span>
                    <span className="sm:hidden">{t('summary')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('subscriptions')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'subscriptions'
                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('subscriptions')}</span>
                    <span className="sm:hidden">{t('bills')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('installments')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'installments'
                        ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{t('installments')}</span>
                    {activeInstallmentsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black">
                        {activeInstallmentsCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('regularPayments')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'regularPayments'
                        ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('regularPayments')}</span>
                    <span className="sm:hidden">{t('payments')}</span>
                    {activeRegularPaymentsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-black">
                        {activeRegularPaymentsCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Selector Dropdown */}
              <div className="relative" ref={languageMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200/70 dark:bg-gray-800 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-200 border border-gray-200/60 dark:border-gray-700/60 transition-all cursor-pointer"
                  title={t('language')}
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

              <button 
                onClick={toggleDarkMode}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                title={darkMode ? t('lightMode') : t('darkMode')}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                    title={t('notificationSettings')}
                  >
                    <BellRing className="w-5 h-5" />
                  </button>

                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName || 'Kullanıcı'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>

                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}`} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                    referrerPolicy="no-referrer"
                  />

                  <button 
                    onClick={openAuthModal}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                    title="Hesap değiştir veya tekrar giriş yap"
                  >
                    <UserCheck className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    title={t('logout')}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={openAuthModal}
                  className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 dark:shadow-blue-900/20 cursor-pointer text-xs sm:text-sm font-bold"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('loginOrContinue')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <NotificationSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
