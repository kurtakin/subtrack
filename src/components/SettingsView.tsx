/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText, 
  DollarSign, 
  Globe, 
  Moon, 
  Sun, 
  Bell, 
  Calendar, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  Sparkles,
  ShieldCheck,
  CreditCard,
  Sliders,
  Volume2,
  VolumeX,
  RefreshCw,
  LogOut,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../constants/translations';
import { formatCurrency } from '../constants';
import { cn } from '../lib/utils';
import { auth } from '../firebase';

interface SettingsViewProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCalendarModal: () => void;
  onOpenExportModal: () => void;
  onOpenImportModal: () => void;
  onRestoreDefaults: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  darkMode,
  onToggleDarkMode,
  onOpenCalendarModal,
  onOpenExportModal,
  onOpenImportModal,
  onRestoreDefaults
}) => {
  const { t, language, setLanguage } = useTranslation();

  // Personal Info Form State
  const [displayName, setDisplayName] = useState(profile?.displayName || 'Akın Kurt');
  const [email, setEmail] = useState(profile?.email || 'kurtakinca@gmail.com');
  const [phone, setPhone] = useState(profile?.phone || '+1 (555) 349-2810');
  const [location, setLocation] = useState(profile?.location || 'Toronto, Canada');
  const [occupation, setOccupation] = useState(profile?.occupation || 'Senior Software Architect / E-Commerce Specialist');
  const [bio, setBio] = useState(profile?.bio || 'Finansal özgürlük, teknoloji yatırımları ve düzenli bütçe yönetimi.');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || 'https://ui-avatars.com/api/?name=Akin+Kurt&background=2563eb&color=fff');

  // Financial & App Preferences
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [monthlyBudget, setMonthlyBudget] = useState(profile?.monthlyBudget?.toString() || '3500');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(profile?.defaultPaymentMethod || 'Kredi Kartı (Visa Platinum)');

  // Notification Preferences
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(profile?.notificationSettings?.notifyDaysBefore?.toString() || '3');
  const [browserNotifications, setBrowserNotifications] = useState(profile?.notificationSettings?.browserNotifications ?? true);
  const [emailNotifications, setEmailNotifications] = useState(profile?.notificationSettings?.emailNotifications ?? true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Success Feedback Toast
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Quick Preset Avatars
  const avatarPresets = [
    { label: 'Pro Blue', url: 'https://ui-avatars.com/api/?name=Akin+Kurt&background=2563eb&color=fff&bold=true' },
    { label: 'Purple Tech', url: 'https://ui-avatars.com/api/?name=Akin+Kurt&background=7c3aed&color=fff&bold=true' },
    { label: 'Emerald Lead', url: 'https://ui-avatars.com/api/?name=Akin+Kurt&background=059669&color=fff&bold=true' },
    { label: 'Amber Star', url: 'https://ui-avatars.com/api/?name=Akin+Kurt&background=d97706&color=fff&bold=true' },
    { label: 'Ruby Pro', url: 'https://ui-avatars.com/api/?name=Akin+Kurt&background=dc2626&color=fff&bold=true' },
    { label: 'Dark Sleek', url: 'https://ui-avatars.com/api/?name=Akin+Kurt&background=1e293b&color=fff&bold=true' }
  ];

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateProfile({
      displayName: displayName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim(),
      occupation: occupation.trim(),
      bio: bio.trim(),
      photoURL: photoURL.trim(),
      currency,
      monthlyBudget: Number(monthlyBudget) || 0,
      defaultPaymentMethod: defaultPaymentMethod.trim(),
      notificationSettings: {
        notifyDaysBefore: Number(notifyDaysBefore) || 3,
        browserNotifications,
        emailNotifications
      }
    });

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const generateNewAvatar = () => {
    const formattedName = encodeURIComponent(displayName || 'User');
    const colors = ['2563eb', '7c3aed', '059669', 'd97706', 'dc2626', '0891b2', '4f46e5'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newUrl = `https://ui-avatars.com/api/?name=${formattedName}&background=${randomColor}&color=fff&bold=true`;
    setPhotoURL(newUrl);
  };

  const currencyOptions = [
    { code: 'USD', label: 'USD ($) - US Dollar' },
    { code: 'CAD', label: 'CAD (C$) - Canadian Dollar' },
    { code: 'EUR', label: 'EUR (€) - Euro' },
    { code: 'TRY', label: 'TRY (₺) - Türk Lirası' },
    { code: 'GBP', label: 'GBP (£) - British Pound' },
    { code: 'AUD', label: 'AUD (A$) - Australian Dollar' },
    { code: 'JPY', label: 'JPY (¥) - Japanese Yen' },
    { code: 'CHF', label: 'CHF (Fr) - Swiss Franc' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl shadow-lg shadow-blue-500/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
              {language === 'tr' ? 'Kullanıcı Profili' : 'User Profile'}
            </span>
            <span className="text-blue-100 text-xs font-semibold">SubTrack Pro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            {t('settings') || (language === 'tr' ? 'Ayarlar & Kişisel Bilgiler' : 'Settings & Personal Information')}
          </h1>
          <p className="text-sm text-blue-100 mt-1 max-w-xl">
            {language === 'tr' 
              ? 'Kişisel profil detaylarınızı, para biriminizi, bildirim ve takvim tercihlerinizi bu ekrandan yönetebilirsiniz.'
              : 'Manage your personal profile details, preferred currency, notifications, and calendar preferences.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSaveAll()}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer self-start md:self-auto shrink-0"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Main Settings Grid */}
      <form onSubmit={handleSaveAll} className="space-y-8">
        {/* 1. Kişisel Bilgiler (Personal Information) */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  {t('personalInfo') || (language === 'tr' ? 'Kişisel Bilgiler' : 'Personal Information')}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === 'tr' ? 'İsim, unvan, profil görseli ve iletişim bilgileriniz' : 'Your name, title, avatar and contact details'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">
              {language === 'tr' ? 'Profil Detayları' : 'Profile Details'}
            </span>
          </div>

          {/* Avatar Preview & Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60">
            <div className="relative group shrink-0">
              <img
                src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}`}
                alt="Avatar"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-md"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1.5 -right-1.5 p-1 bg-blue-600 text-white rounded-lg shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {displayName || 'Akın Kurt'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateNewAvatar}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs self-center sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{language === 'tr' ? 'Yeni Avatar Üret' : 'Generate Avatar'}</span>
                </button>
              </div>

              {/* Preset Avatars Bar */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1.5">
                  {language === 'tr' ? 'Hızlı Avatar Seçimi' : 'Quick Avatar Presets'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoURL(preset.url)}
                      className={cn(
                        "w-8 h-8 rounded-xl overflow-hidden border-2 transition-all cursor-pointer hover:scale-105",
                        photoURL === preset.url
                          ? "border-blue-600 ring-2 ring-blue-500/30 scale-105"
                          : "border-gray-200 dark:border-gray-700 opacity-80 hover:opacity-100"
                      )}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                  {language === 'tr' ? 'Profil Fotoğrafı URL' : 'Avatar Image URL'}
                </label>
                <input
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                {language === 'tr' ? 'Ad Soyad' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Adınız ve Soyadınız"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                {language === 'tr' ? 'E-posta Adresi' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eposta@ornek.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                {language === 'tr' ? 'Telefon Numarası' : 'Phone Number'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                {language === 'tr' ? 'Şehir / Ülke' : 'Location / City'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Toronto, Canada / İstanbul, Türkiye"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                {language === 'tr' ? 'Meslek / Uzmanlık Unvanı' : 'Occupation / Job Title'}
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Senior Software Architect / E-Commerce Specialist"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                {language === 'tr' ? 'Kişisel Biyografi & Finansal Hedef Notu' : 'Bio & Financial Goal Note'}
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Finansal hedefleriniz veya kişisel notlarınız..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Finansal Tercihler & Uygulama Ayarları (Preferences) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol Kolon: Finansal Tercihler */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  {language === 'tr' ? 'Finansal Tercihler' : 'Financial Preferences'}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === 'tr' ? 'Varsayılan para birimi ve aylık bütçe hedefleri' : 'Default currency and monthly budget target'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  {language === 'tr' ? 'Varsayılan Para Birimi' : 'Default Currency'}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all cursor-pointer"
                >
                  {currencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Live Preview Strip */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">
                  {language === 'tr' ? 'Biçimlendirme Önizlemesi:' : 'Formatting Preview:'}
                </span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(1250, currency)} · {formatCurrency(45.99, currency)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  {language === 'tr' ? 'Aylık Toplam Harcama Bütçesi' : 'Monthly Spending Budget'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="3500"
                    className="w-full pl-14 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  {language === 'tr' ? 'Varsayılan Ödeme Yöntemi' : 'Default Payment Method'}
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                    placeholder="Kredi Kartı (Visa Platinum)"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Uygulama Tercihleri & Bildirimler */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  {language === 'tr' ? 'Arayüz & Bildirimler' : 'Interface & Notifications'}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === 'tr' ? 'Dil seçimi, tema modu ve ödeme uyarıları' : 'Language, theme mode and payment alerts'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  {language === 'tr' ? 'Uygulama Dili' : 'Interface Language'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code === language;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code as SupportedLanguage)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs"
                            : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                        )}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="truncate">{lang.nativeName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-2xs">
                    {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      {language === 'tr' ? 'Karanlık Tema Modu' : 'Dark Mode Theme'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {darkMode ? (language === 'tr' ? 'Koyu mod aktif' : 'Dark theme active') : (language === 'tr' ? 'Açık mod aktif' : 'Light theme active')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                    darkMode ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      darkMode ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Reminder Lead Time */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  {language === 'tr' ? 'Ödeme Hatırlatma Süresi' : 'Reminder Advance Days'}
                </label>
                <div className="relative">
                  <Bell className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={notifyDaysBefore}
                    onChange={(e) => setNotifyDaysBefore(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all cursor-pointer"
                  >
                    <option value="1">{language === 'tr' ? '1 gün önceden bildir' : '1 day before'}</option>
                    <option value="2">{language === 'tr' ? '2 gün önceden bildir' : '2 days before'}</option>
                    <option value="3">{language === 'tr' ? '3 gün önceden bildir' : '3 days before'}</option>
                    <option value="5">{language === 'tr' ? '5 gün önceden bildir' : '5 days before'}</option>
                    <option value="7">{language === 'tr' ? '1 hafta (7 gün) önceden bildir' : '1 week (7 days) before'}</option>
                  </select>
                </div>
              </div>

              {/* Browser Push & Email Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBrowserNotifications(!browserNotifications)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    browserNotifications
                      ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300"
                      : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-500"
                  )}
                >
                  <span>{language === 'tr' ? 'Tarayıcı Bildirimi' : 'Browser Push'}</span>
                  <span className={cn("w-2 h-2 rounded-full", browserNotifications ? "bg-blue-600" : "bg-gray-400")} />
                </button>

                <button
                  type="button"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    emailNotifications
                      ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300"
                      : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-500"
                  )}
                >
                  <span>{language === 'tr' ? 'E-posta Uyarısı' : 'Email Alerts'}</span>
                  <span className={cn("w-2 h-2 rounded-full", emailNotifications ? "bg-purple-600" : "bg-gray-400")} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Google Calendar & Veri Yönetimi (Data & Integrations) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Google Calendar Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white">
                    Google Calendar
                  </h2>
                  <p className="text-xs text-gray-500">
                    {language === 'tr' ? 'Ödemelerinizi Google Takvim ile otomatik eşitleyin' : 'Sync payments directly to Google Calendar'}
                  </p>
                </div>
              </div>
              {profile?.calendarSettings?.enabled ? (
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {language === 'tr' ? 'Bağlı' : 'Connected'}
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-black rounded-full">
                  {language === 'tr' ? 'Bağlı Değil' : 'Not Connected'}
                </span>
              )}
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between items-center font-bold text-gray-700 dark:text-gray-300">
                <span>{language === 'tr' ? 'Etkin Takvim:' : 'Active Calendar:'}</span>
                <span className="text-blue-600 dark:text-blue-400 truncate max-w-[180px]">
                  {profile?.calendarSettings?.calendarName || 'Primary Gmail Calendar'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed pt-1">
                {language === 'tr'
                  ? 'Faturalar, taksitler ve otomatik ödemeler vadesinde takvimde otomatik yeşil renkle işaretlenir. Yeniden eşitlemede mükerrer etkinlik eklenmez.'
                  : 'Bills and auto-payments sync with Basil green highlight on Google Calendar. Re-syncing updates existing entries without duplicates.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenCalendarModal}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>{language === 'tr' ? 'Google Calendar Yönetimini Aç' : 'Manage Google Calendar'}</span>
            </button>
          </div>

          {/* Veri Yedekleme & Sıfırlama */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  {language === 'tr' ? 'Veri Yedekleme & Dışa Aktarma' : 'Data Backup & Export'}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === 'tr' ? 'Tüm finansal kayıtlarınızı JSON veya CSV olarak saklayın' : 'Download or import complete financial records'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenExportModal}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>{language === 'tr' ? 'Dışa Aktar (JSON)' : 'Export JSON'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-all cursor-pointer shadow-2xs"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>{language === 'tr' ? 'İçe Aktar (JSON)' : 'Import JSON'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-[11px] text-gray-400">
                {language === 'tr' ? 'Varsayılan örnek verileri geri yükle' : 'Restore initial sample data'}
              </div>
              <button
                type="button"
                onClick={onRestoreDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Sıfırla' : 'Reset Data'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Hesap & Güvenlik Özeti (Account & Security) */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                {language === 'tr' ? 'Oturum & Güvenlik' : 'Account & Security'}
              </h3>
              <p className="text-xs text-gray-500">
                UID: {profile?.uid || 'user_kurtakinca'} · {email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => auth.signOut().catch(() => {})}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer self-stretch sm:self-auto justify-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Güvenli Çıkış' : 'Sign Out'}</span>
          </button>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{language === 'tr' ? 'Değişiklikler anında cihazınıza ve profilinize kaydedilir.' : 'Changes are saved locally and synced to your profile.'}</span>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{language === 'tr' ? 'Ayarları Kaydet' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Floating Success Toast */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-8 z-50 flex items-center gap-2.5 px-5 py-3 bg-emerald-600 text-white rounded-2xl shadow-2xl font-bold text-xs"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{language === 'tr' ? 'Kişisel bilgiler ve ayarlar başarıyla kaydedildi!' : 'Personal information & settings saved successfully!'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
