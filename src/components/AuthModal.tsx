import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  XCircle,
  LogIn,
  Mail,
  Lock,
  User,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import { setCachedAccessToken } from '../services/googleCalendar';
import { cn } from '../lib/utils';
import { useTranslation } from '../context/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocalLogin?: (email: string, displayName?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLocalLogin
}) => {
  const { language } = useTranslation();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [allowLocalFallback, setAllowLocalFallback] = useState(false);

  if (!isOpen) return null;

  const isTr = language === 'tr';

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setPopupBlocked(false);
    setAllowLocalFallback(false);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
      onClose();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setPopupBlocked(true);
        setErrorMessage(isTr 
          ? 'Tarayıcınız Google giriş açılır penceresini (popup) engelledi. Lütfen açılır pencerelere izin verin veya uygulamayı yeni bir sekmede açın.' 
          : 'Your browser blocked the Google login popup. Please allow popups or open the app in a new tab.');
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage(isTr 
          ? 'Bu alan adı yetkilendirilmemiş. Lütfen aşağıdaki E-posta ile giriş formunu kullanın.' 
          : 'Domain not authorized. Please use the email sign in form below.');
        setAllowLocalFallback(true);
        return;
      }
      setErrorMessage(err.message || (isTr ? 'Google ile giriş yapılırken bir sorun oluştu.' : 'An error occurred during Google sign in.'));
      setAllowLocalFallback(true);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName && userCred.user) {
          await updateProfile(userCred.user, { displayName });
        }
      }
      onClose();
    } catch (err: any) {
      console.error('Email Auth error:', err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = isTr ? 'E-posta veya şifre hatalı.' : 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = isTr ? 'Bu e-posta adresiyle zaten kayıtlı bir hesap var.' : 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = isTr ? 'Şifreniz en az 6 karakterden oluşmalıdır.' : 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = isTr ? 'Lütfen geçerli bir e-posta adresi girin.' : 'Please enter a valid email address.';
      } else {
        setAllowLocalFallback(true);
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithLocal = () => {
    if (!email) {
      setErrorMessage(isTr ? 'Lütfen e-posta adresinizi girin.' : 'Please enter your email address.');
      return;
    }
    if (onLocalLogin) {
      onLocalLogin(email, displayName || email.split('@')[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {isTr ? "SubTrack'e Giriş Yap" : 'Sign In to SubTrack'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isTr ? 'Aboneliklerinizi senkronize etmek için hesabınızı bağlayın' : 'Connect your account to sync your subscriptions'}
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p>{errorMessage}</p>
                  {popupBlocked && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isTr ? 'Uygulamayı Yeni Sekmede Aç' : 'Open App in New Tab'}</span>
                    </a>
                  )}
                  {allowLocalFallback && (
                    <button
                      type="button"
                      onClick={handleContinueWithLocal}
                      className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isTr ? 'Bu E-Posta ile Hemen Devam Et' : 'Continue with This Email'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google One-Click Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3.5 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-100 rounded-2xl border border-gray-200 dark:border-gray-700 font-extrabold text-sm transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            <span>
              {isGoogleLoading 
                ? (isTr ? 'Google Bağlanıyor...' : 'Connecting Google...') 
                : (isTr ? 'Google ile Giriş Yap' : 'Sign in with Google')}
            </span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
            <span className="flex-shrink mx-3 text-xs text-gray-400 font-bold uppercase tracking-wider">
              {isTr ? 'veya e-posta' : 'or email'}
            </span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMessage(null); }}
              className={cn(
                "py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
                authMode === 'login'
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {isTr ? 'Giriş Yap' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMessage(null); }}
              className={cn(
                "py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
                authMode === 'register'
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {isTr ? 'Yeni Hesap Oluştur' : 'Create Account'}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  {isTr ? 'Adınız Soyadınız' : 'Full Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={isTr ? 'Adınız' : 'Your name'}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                {isTr ? 'E-Posta Adresi' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                {isTr ? 'Şifre' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>
                {authMode === 'login' 
                  ? (isTr ? 'E-Posta ile Giriş Yap' : 'Sign in with Email') 
                  : (isTr ? 'Hesabımı Oluştur' : 'Create My Account')}
              </span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            {isTr ? 'Güvenli & Şifrelenmiş Oturum' : 'Secure & Encrypted Session'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          >
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
