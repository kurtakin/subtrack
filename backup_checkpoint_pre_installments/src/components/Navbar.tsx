import React, { useState, useContext } from 'react';
import { CreditCard, Sun, Moon, BellRing, UserCheck, LogOut, LogIn } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { setCachedAccessToken } from '../services/googleCalendar';
import { cn } from '../lib/utils';

export const Navbar = () => {
  const { user, profile, toggleDarkMode, darkMode, openAuthModal } = useContext(AuthContext);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = () => signOut(auth);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">SubTrack</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                title={darkMode ? "Açık Moda Geç" : "Karanlık Moda Geç"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                    title="Alarm ve Bildirim Ayarları"
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
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={openAuthModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 dark:shadow-blue-900/20 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Giriş Yap</span>
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
