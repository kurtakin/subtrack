/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  PieChart, 
  LogIn, 
  ChevronRight, 
  AlertCircle,
  TrendingUp,
  Tag,
  Clock,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Coins,
  BarChart3,
  TrendingDown,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Upload,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { format, addMonths, addYears, parseISO, differenceInDays, differenceInCalendarDays, isAfter } from 'date-fns';
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './firebase';
import { UserProfile, Subscription, Payment, OperationType, FirestoreErrorInfo } from './types';
import { AuthContext } from './context/AuthContext';
import { formatCurrency, getCurrencySymbol, isDemoItem, COLORS } from './constants';
import { Navbar } from './components/Navbar';
import { SubscriptionCard } from './components/SubscriptionCard';
import { PaymentHistoryModal } from './components/PaymentHistoryModal';
import { QuickAddPaymentModal } from './components/QuickAddPaymentModal';
import { MonthlySummaryModal } from './components/MonthlySummaryModal';
import { MonthDetailModal } from './components/MonthDetailModal';
import { ExportReportModal } from './components/ExportReportModal';
import { ImportModal } from './components/ImportModal';
import { GoogleCalendarModal } from './components/GoogleCalendarModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AddEditModal } from './components/AddEditModal';
import { AuthModal } from './components/AuthModal';
import { SEED_SUBSCRIPTIONS, SEED_PAYMENTS, DEFAULT_PROFILE } from './data/seedData';
import {
  syncEventToGoogleCalendar,
  deleteGoogleCalendarEvent,
  getCachedAccessToken,
  setCachedAccessToken
} from './services/googleCalendar';
import { cn } from './lib/utils';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Firestore Error')) {
        setHasError(true);
        setErrorDetails(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100">
        <AlertCircle className="w-12 h-12 mb-4 text-red-600 dark:text-red-400" />
        <h1 className="text-2xl font-bold mb-2">Bir sorun oluştu</h1>
        <p className="text-center mb-4 max-w-md text-red-700 dark:text-red-300">
          Bir veritabanı veya yapılandırma hatası gerçekleşti. Lütfen sayfayı yenileyiniz.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg cursor-pointer"
        >
          Yeniden Yükle
        </button>
        {errorDetails && (
          <pre className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl text-xs overflow-auto max-w-full border border-red-200 dark:border-red-800 font-mono">
            {errorDetails}
          </pre>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('subtrack_local_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      uid: DEFAULT_PROFILE.uid,
      email: DEFAULT_PROFILE.email,
      displayName: DEFAULT_PROFILE.displayName,
      photoURL: DEFAULT_PROFILE.photoURL
    };
  });
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('subtrack_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROFILE;
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    try {
      const saved = localStorage.getItem('subtrack_subscriptions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_SUBSCRIPTIONS;
  });
  const [allPayments, setAllPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem('subtrack_payments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_PAYMENTS;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddSub, setQuickAddSub] = useState<Subscription | null>(null);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [historySub, setHistorySub] = useState<Subscription | null>(null);
  const [isGlobalHistoryOpen, setIsGlobalHistoryOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [isMonthDetailOpen, setIsMonthDetailOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isScanningStorage, setIsScanningStorage] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLocalLogin = async (email: string, displayName?: string) => {
    const fakeUid = 'user_' + btoa(email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    const localUser = {
      uid: fakeUid,
      email: email,
      displayName: displayName || email.split('@')[0],
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}`
    };
    setUser(localUser as any);
    const newProfile: UserProfile = {
      uid: fakeUid,
      email: email,
      displayName: displayName || email.split('@')[0],
      photoURL: localUser.photoURL,
      currency: profile?.currency || 'CAD',
      darkMode: darkMode
    };
    setProfile(newProfile);
    localStorage.setItem('subtrack_local_user', JSON.stringify(localUser));
    try {
      await setDoc(doc(db, 'users', fakeUid), newProfile);
    } catch (e) {
      console.warn('Could not persist user to firestore, continuing with local profile:', e);
    }
  };

  const [sortBy, setSortBy] = useState<keyof Subscription>('nextPaymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hideInactive, setHideInactive] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [darkMode, setDarkMode] = useState(false);

  const confirm = (options: { 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    variant?: 'danger' | 'info';
    confirmText?: string;
  }) => {
    setConfirmModal({ ...options, isOpen: true });
  };

  // Dark Mode Logic
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedMode === 'true' || (savedMode === null && prefersDark);
    
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (profile?.darkMode !== undefined) {
      setDarkMode(profile.darkMode);
      if (profile.darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  }, [profile?.darkMode]);

  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (profile) {
      setProfile({ ...profile, darkMode: newMode });
    } else {
      localStorage.setItem('darkMode', String(newMode));
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          darkMode: newMode
        });
      } catch (error) {
        console.error('Error updating dark mode:', error);
      }
    }
  };

  // Notification Check
  useEffect(() => {
    if (!user || !profile || subscriptions.length === 0) return;
    const checkNotifications = async () => {
      const settings = profile.notificationSettings;
      if (!settings) return;
      const now = new Date();
      const notifyThreshold = settings.notifyDaysBefore;

      for (const sub of subscriptions) {
        if (sub.status === 'cancelled') continue;
        const nextPayment = parseISO(sub.nextPaymentDate);
        const daysUntil = differenceInCalendarDays(nextPayment, now);
        const isDueSoon = daysUntil >= 0 && daysUntil <= notifyThreshold;
        const alreadyNotifiedToday = sub.lastNotified && differenceInCalendarDays(now, parseISO(sub.lastNotified)) < 1;

        if (isDueSoon && !alreadyNotifiedToday) {
          if (settings.browserNotifications && Notification.permission === 'granted') {
            new Notification('Abonelik Hatırlatması', {
              body: `${sub.name} ödemesi (${formatCurrency(sub.amount, profile.currency)}) ${daysUntil} gün içinde yapılacak!`,
              icon: '/favicon.ico'
            });
          }

          if (settings.emailNotifications && 
              import.meta.env.VITE_EMAILJS_SERVICE_ID && 
              import.meta.env.VITE_EMAILJS_TEMPLATE_ID && 
              import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
            try {
              await emailjs.send(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                {
                  to_name: user.displayName,
                  to_email: user.email,
                  sub_name: sub.name,
                  amount: formatCurrency(sub.amount, profile.currency),
                  due_date: format(nextPayment, 'MMM d, yyyy'),
                  days_left: daysUntil
                },
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
              );
            } catch (err) {
              console.error('EmailJS Error:', err);
            }
          }

          await updateDoc(doc(db, 'subscriptions', sub.id), {
            lastNotified: now.toISOString()
          });
        }
      }
    };
    checkNotifications();
  }, [user, profile, subscriptions]);

  // Auto-record payments for recurring subscriptions
  const isAutoRecordingRef = useRef(false);
  const autoRecordPayments = async () => {
    if (!user || subscriptions.length === 0 || isAutoRecordingRef.current) return;
    isAutoRecordingRef.current = true;
    try {
      const now = new Date();
      
      for (const sub of subscriptions) {
        if (sub.status === 'cancelled') continue;
        if (sub.pricingType === 'usage_based') continue;

        let currentNextDateString = sub.nextPaymentDate;
        let nextPaymentDate = parseISO(currentNextDateString);
        let updated = false;

        const existingMonthKeys = new Set<string>();
        try {
          const paymentsRef = collection(db, 'subscriptions', sub.id, 'payments');
          const snap = await getDocs(query(paymentsRef, where('uid', '==', user.uid)));
          snap.forEach(d => {
            const data = d.data();
            if (data.date && (!data.type || data.type === 'regular')) {
              try {
                existingMonthKeys.add(format(parseISO(data.date), 'yyyy-MM'));
              } catch {
                // ignore
              }
            }
          });
        } catch (e) {
          console.error(`Failed to check existing payments for ${sub.name}:`, e);
        }
        
        while (differenceInCalendarDays(now, nextPaymentDate) >= 0) {
          const paymentMonthKey = format(nextPaymentDate, 'yyyy-MM');
          if (!existingMonthKeys.has(paymentMonthKey)) {
            try {
              await addDoc(collection(db, 'subscriptions', sub.id, 'payments'), {
                uid: user.uid,
                subscriptionId: sub.id,
                amount: sub.amount,
                date: nextPaymentDate.toISOString(),
                status: 'paid',
                type: 'regular',
                note: 'Otomatik Plan Yenilemesi'
              });
              existingMonthKeys.add(paymentMonthKey);
            } catch (error) {
              console.error(`Failed to auto-record payment for ${sub.name}:`, error);
              break; 
            }
          }
          nextPaymentDate = sub.billingCycle === 'monthly' 
            ? addMonths(nextPaymentDate, 1) 
            : addYears(nextPaymentDate, 1);
          
          updated = true;
          if (isAfter(nextPaymentDate, addYears(now, 2))) break;
        }

        if (updated) {
          try {
            await updateDoc(doc(db, 'subscriptions', sub.id), {
              nextPaymentDate: nextPaymentDate.toISOString()
            });
          } catch (error) {
            console.error(`Failed to update subscription date for ${sub.name}:`, error);
          }
        }
      }
    } finally {
      isAutoRecordingRef.current = false;
    }
  };

  useEffect(() => {
    autoRecordPayments();
  }, [user, subscriptions]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userDoc);
          if (!snap.exists()) {
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || '',
              photoURL: u.photoURL || '',
              currency: profile?.currency || 'USD',
              darkMode: localStorage.getItem('darkMode') === 'true'
            };
            try {
              await setDoc(userDoc, newProfile);
            } catch {}
            setProfile(newProfile);
          } else {
            setProfile(snap.data() as UserProfile);
          }
        } catch (error) {
          console.warn('User profile network fetch fallback to local cache:', error);
          const savedProfile = localStorage.getItem('subtrack_user_profile');
          if (savedProfile) {
            try { setProfile(JSON.parse(savedProfile)); } catch {}
          }
        }
      } else {
        const saved = localStorage.getItem('subtrack_local_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed?.uid && parsed?.email) {
              setUser(parsed as any);
              const userDoc = doc(db, 'users', parsed.uid);
              try {
                const snap = await getDoc(userDoc);
                if (snap.exists()) {
                  setProfile(snap.data() as UserProfile);
                } else {
                  setProfile({
                    uid: parsed.uid,
                    email: parsed.email,
                    displayName: parsed.displayName || '',
                    photoURL: parsed.photoURL || '',
                    currency: 'USD',
                    darkMode: localStorage.getItem('darkMode') === 'true'
                  });
                }
              } catch {
                setProfile({
                  uid: parsed.uid,
                  email: parsed.email,
                  displayName: parsed.displayName || '',
                  photoURL: parsed.photoURL || '',
                  currency: 'USD',
                  darkMode: localStorage.getItem('darkMode') === 'true'
                });
              }
              setLoading(false);
              return;
            }
          } catch {}
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscriptions Listener
  useEffect(() => {
    if (!user) return;
    const collRef = collection(db, 'subscriptions');
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const allDocs = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() } as Subscription));
      
      const userSubs: Subscription[] = [];
      allDocs.forEach(docItem => {
        if (isDemoItem(docItem.name)) {
          deleteDoc(doc(db, 'subscriptions', docItem.id)).catch(() => {});
          return;
        }
        if (!docItem.uid || docItem.uid === user.uid || (docItem as any).email === user.email || docItem.uid === user.email) {
          userSubs.push(docItem);
          if (docItem.uid !== user.uid) {
            updateDoc(doc(db, 'subscriptions', docItem.id), { uid: user.uid }).catch(() => {});
          }
        }
      });

      if (userSubs.length > 0) {
        setSubscriptions(userSubs);
        try {
          localStorage.setItem(`subtrack_backup_subscriptions_${user.uid}`, JSON.stringify(userSubs));
          localStorage.setItem('subtrack_subscriptions', JSON.stringify(userSubs));
        } catch {
          // ignore
        }
      } else {
        setSubscriptions(prev => prev.length > 0 ? prev : SEED_SUBSCRIPTIONS);
      }
    }, (error) => {
      console.error('Subscriptions onSnapshot error:', error);
      try {
        const backup = localStorage.getItem(`subtrack_backup_subscriptions_${user.uid}`) || localStorage.getItem('subtrack_subscriptions');
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const filtered = parsed.filter(item => !isDemoItem(item?.name));
            if (filtered.length > 0) {
              setSubscriptions(filtered);
            }
          }
        }
      } catch {
        // ignore
      }
      handleFirestoreError(error, OperationType.LIST, 'subscriptions');
    });

    return () => unsubscribe();
  }, [user]);

  // All Payments Listener
  useEffect(() => {
    if (!user || subscriptions.length === 0) {
      return;
    }
    const unsubscribes = subscriptions.map(sub => {
      const q = collection(db, 'subscriptions', sub.id, 'payments');
      return onSnapshot(q, (snapshot) => {
        const paymentsData = snapshot.docs.map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        })) as Payment[];
        
        if (paymentsData.length > 0) {
          setAllPayments(prev => {
            const otherPayments = prev.filter(p => p.subscriptionId !== sub.id);
            const combined = [...otherPayments, ...paymentsData];
            const sorted = combined.sort((a, b) => b.date.localeCompare(a.date));
            try {
              localStorage.setItem('subtrack_payments', JSON.stringify(sorted));
            } catch {}
            return sorted;
          });
        }
      }, (error) => {
        // keep local payments
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, subscriptions]);

  // Calculations
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const topUpsBySubThisMonth = useMemo(() => {
    const map: { [subId: string]: number } = {};
    allPayments.forEach(p => {
      if (p.type === 'topup' && p.date) {
        try {
          const d = parseISO(p.date);
          if (format(d, 'yyyy-MM') === currentMonthKey) {
            map[p.subscriptionId] = (map[p.subscriptionId] || 0) + p.amount;
          }
        } catch {
          // ignore
        }
      }
    });
    return map;
  }, [allPayments, currentMonthKey]);

  const monthlyTotal = useMemo(() => {
    return subscriptions.reduce((acc, sub) => {
      if (sub.status === 'cancelled') return acc;
      const amount = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
      return acc + amount;
    }, 0);
  }, [subscriptions]);

  const statsComparison = useMemo(() => {
    const now = new Date();
    const currentMKey = format(now, 'yyyy-MM');
    const lastMonthDate = addMonths(now, -1);
    const lastMKey = format(lastMonthDate, 'yyyy-MM');
    let currentTotal = 0;
    let lastTotal = 0;
    allPayments.forEach(p => {
      const d = parseISO(p.date);
      const key = format(d, 'yyyy-MM');
      if (key === currentMKey) currentTotal += p.amount;
      if (key === lastMKey) lastTotal += p.amount;
    });
    const diff = currentTotal - lastTotal;
    const percent = lastTotal > 0 ? (diff / lastTotal) * 100 : 0;
    return {
      currentTotal,
      lastTotal,
      diff,
      percent,
      isHigher: diff > 0
    };
  }, [allPayments]);

  const categoryData = useMemo(() => {
    const data: { [key: string]: number } = {};
    subscriptions.forEach(sub => {
      if (sub.status === 'cancelled') return;
      const amount = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
      data[sub.category] = (data[sub.category] || 0) + amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [subscriptions]);

  const upcomingBills = useMemo(() => {
    return [...subscriptions]
      .filter(s => s.status === 'active')
      .sort((a, b) => parseISO(a.nextPaymentDate).getTime() - parseISO(b.nextPaymentDate).getTime())
      .slice(0, 5);
  }, [subscriptions]);

  const monthlyHistoryData = useMemo(() => {
    const data: { [key: string]: { total: number, date: Date, label: string } } = {};
    
    allPayments.forEach(p => {
      try {
        if (!p.date) return;
        const d = parseISO(p.date);
        if (isNaN(d.getTime())) return;
        
        const mKey = format(d, 'yyyy-MM');
        const mLabel = format(d, 'MMM yyyy');
        
        if (!data[mKey]) {
          data[mKey] = { total: 0, date: d, label: mLabel };
        }
        data[mKey].total += p.amount || 0;
      } catch (e) {
        console.warn('Failed to parse payment date:', p.date, e);
      }
    });
    
    return Object.entries(data)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ 
        key,
        name: value.label, 
        value: value.total 
      }));
  }, [allPayments]);

  const duplicatePaymentsInfo = useMemo(() => {
    const seen: { [key: string]: boolean } = {};
    const duplicateIds: string[] = [];
    let excessAmount = 0;
    const monthsSet = new Set<string>();

    allPayments.forEach(p => {
      if (!p.date) return;
      try {
        const d = parseISO(p.date);
        const mKey = format(d, 'yyyy-MM');
        const key = (p.type === 'topup')
          ? `topup_${p.subscriptionId}_${p.date}_${p.amount}_${p.note || ''}`
          : `regular_${p.subscriptionId}_${mKey}`;

        if (seen[key]) {
          duplicateIds.push(p.id);
          excessAmount += p.amount;
          monthsSet.add(mKey);
        } else {
          seen[key] = true;
        }
      } catch {
        // ignore
      }
    });

    return {
      count: duplicateIds.length,
      duplicateIds,
      excessAmount,
      monthsWithDuplicates: Array.from(monthsSet)
    };
  }, [allPayments]);

  const inactiveCount = useMemo(() => {
    return subscriptions.filter(s => s.status === 'cancelled').length;
  }, [subscriptions]);

  const sortedSubscriptions = useMemo(() => {
    let list = [...subscriptions];
    if (hideInactive) {
      list = list.filter(sub => sub.status !== 'cancelled');
    }
    return list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'nextPaymentDate') {
        valA = parseISO(a.nextPaymentDate).getTime();
        valB = parseISO(b.nextPaymentDate).getTime();
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [subscriptions, hideInactive, sortBy, sortOrder]);

  const handleDelete = async (id: string) => {
    const subToDelete = subscriptions.find(s => s.id === id);
    confirm({
      title: 'Aboneliği Sil',
      message: 'Bu aboneliği silmek istediğinize emin misiniz? Varsa Google Takvim etkinliği ve tüm geçmiş ödemeleri de silinecektir.',
      confirmText: 'Sil',
      onConfirm: async () => {
        try {
          const token = getCachedAccessToken();
          if (token && subToDelete?.calendarEventId) {
            const calId = profile?.calendarSettings?.calendarId || 'primary';
            await deleteGoogleCalendarEvent(token, calId, subToDelete.calendarEventId).catch(console.error);
          }
          await deleteDoc(doc(db, 'subscriptions', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'subscriptions');
        }
      }
    });
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setIsModalOpen(true);
  };

  const handleViewHistory = (sub: Subscription) => {
    setHistorySub(sub);
    setIsHistoryOpen(true);
  };

  const handleToggleStatus = async (sub: Subscription) => {
    const newStatus = sub.status === 'active' ? 'cancelled' : 'active';
    try {
      const token = getCachedAccessToken();
      const calId = profile?.calendarSettings?.calendarId || 'primary';
      let newEventId = sub.calendarEventId;

      if (token) {
        if (newStatus === 'cancelled' && sub.calendarEventId) {
          await deleteGoogleCalendarEvent(token, calId, sub.calendarEventId).catch(console.error);
          newEventId = undefined;
        } else if (newStatus === 'active') {
          try {
            const calRes = await syncEventToGoogleCalendar(
              token,
              calId,
              {
                name: sub.name,
                amount: sub.amount,
                currency: profile?.currency || 'CAD',
                category: sub.category,
                billingCycle: sub.billingCycle,
                nextPaymentDate: sub.nextPaymentDate,
                status: 'active'
              }
            );
            newEventId = calRes.eventId;
          } catch (e) {
            console.error('Failed to sync restored event to calendar:', e);
          }
        }
      }

      await updateDoc(doc(db, 'subscriptions', sub.id), { 
        status: newStatus,
        calendarEventId: newEventId || null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'subscriptions');
    }
  };

  const handleSyncSingleSubscription = async (sub: Subscription) => {
    const token = getCachedAccessToken();
    if (!token) {
      setIsCalendarModalOpen(true);
      return;
    }
    try {
      const calId = profile?.calendarSettings?.calendarId || 'primary';
      const result = await syncEventToGoogleCalendar(
        token,
        calId,
        {
          name: sub.name,
          amount: sub.amount,
          currency: profile?.currency || 'CAD',
          category: sub.category,
          billingCycle: sub.billingCycle,
          nextPaymentDate: sub.nextPaymentDate,
          status: sub.status
        },
        sub.calendarEventId
      );
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        calendarEventId: result.eventId,
        calendarSyncedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Failed to sync subscription to calendar:', err);
      setIsCalendarModalOpen(true);
    }
  };

  const demoSubscriptions = useMemo(() => {
    return subscriptions.filter(s => 
      (s as any).isDemo || isDemoItem(s.name)
    );
  }, [subscriptions]);

  const handleDeleteAllDemoData = async () => {
    if (!user) return;
    if (demoSubscriptions.length === 0) {
      alert('Kayıtlı demo veya test aboneliği bulunamadı.');
      return;
    }
    try {
      let deletedCount = 0;
      for (const item of demoSubscriptions) {
        const relatedPayments = allPayments.filter(p => p.subscriptionId === item.id);
        for (const p of relatedPayments) {
          await deleteDoc(doc(db, 'subscriptions', item.id, 'payments', p.id)).catch(() => {});
        }
        await deleteDoc(doc(db, 'subscriptions', item.id));
        deletedCount++;
      }
      try {
        localStorage.removeItem('subtrack_subscriptions');
        localStorage.removeItem(`subtrack_backup_subscriptions_${user.uid}`);
        localStorage.removeItem('subscriptions');
      } catch {}
      alert(`${deletedCount} adet demo abonelik başarıyla silindi ve temizlendi.`);
    } catch (err) {
      console.error('Demo veriler temizlenirken hata oluştu:', err);
      alert('Demo veriler silinirken bir hata oluştu.');
    }
  };

  const handleImportSubscriptions = async (items: any[]): Promise<number> => {
    if (!user) throw new Error('Oturum açık değil.');
    let count = 0;
    for (const item of items) {
      await addDoc(collection(db, 'subscriptions'), {
        uid: user.uid,
        name: item.name,
        amount: item.amount,
        category: item.category || 'Other',
        billingCycle: item.billingCycle || 'monthly',
        nextPaymentDate: item.nextPaymentDate || new Date().toISOString(),
        status: item.status || 'active',
        icon: item.icon || 'tag',
        pricingType: item.pricingType || 'fixed'
      });
      count++;
    }
    return count;
  };

  const handleScanAndRecoverAll = async () => {
    if (!user) return;
    setIsScanningStorage(true);
    let recoveredCount = 0;

    try {
      const storageCandidates: any[] = [];
      const checkRaw = (raw: string | null) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item && typeof item === 'object' && (item.name || item.amount)) {
                storageCandidates.push(item);
              }
            });
          } else if (parsed && typeof parsed === 'object') {
            ['subscriptions', 'items', 'data', 'records'].forEach(prop => {
              if (Array.isArray(parsed[prop])) {
                parsed[prop].forEach((item: any) => {
                  if (item && typeof item === 'object' && (item.name || item.amount)) {
                    storageCandidates.push(item);
                  }
                });
              }
            });
          }
        } catch {}
      };

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) checkRaw(localStorage.getItem(k));
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) checkRaw(sessionStorage.getItem(k));
      }

      const existingNames = new Set(subscriptions.map(s => (s.name || '').toLowerCase().trim()));
      const addedNames = new Set<string>();

      for (const item of storageCandidates) {
        const cleanName = (item.name || '').trim();
        const lowerName = cleanName.toLowerCase();
        if (!cleanName || isDemoItem(cleanName) || existingNames.has(lowerName) || addedNames.has(lowerName)) continue;
        
        addedNames.add(lowerName);
        try {
          await addDoc(collection(db, 'subscriptions'), {
            uid: user.uid,
            name: cleanName,
            amount: Number(item.amount) || 0,
            billingCycle: item.billingCycle || 'monthly',
            nextPaymentDate: item.nextPaymentDate || new Date().toISOString(),
            category: item.category || 'Other',
            icon: item.icon || 'tag',
            status: item.status || 'active',
            pricingType: item.pricingType || 'fixed'
          });
          recoveredCount++;
        } catch (err) {
          console.error('Failed to add recovered doc:', err);
        }
      }

      if (recoveredCount > 0) {
        alert(`${recoveredCount} adet önceki abonelik kaydı başarıyla kurtarıldı ve hesabınıza eklendi!`);
      } else {
        alert('Tarayıcının yerel belleğinde kurtarılacak eski kayıt bulunamadı.');
      }
    } finally {
      setIsScanningStorage(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      profile, 
      toggleDarkMode, 
      darkMode,
      openAuthModal: () => setIsAuthModalOpen(true),
      signInWithLocalEmail: handleLocalLogin
    }}>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 pb-20 transition-colors">
          <Navbar />
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Abonelik verileriniz yükleniyor...</p>
              </div>
            ) : !user ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 font-bold">
                  <CreditCard className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 dark:text-white">Aboneliklerinizi Yönetin</h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-lg mb-8">
                  Unutulan faturalar ve sürpriz harcamalara son verin. Tüm ödemelerinizi tek bir yerden takip edin.
                </p>
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/20 flex items-center gap-3 cursor-pointer"
                >
                  <LogIn className="w-6 h-6" />
                  <span>Giriş Yap / Devam Et</span>
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight dark:text-white">Finansal Genel Bakış</h1>
                    <p className="text-gray-500 dark:text-gray-400">Tekrar hoş geldin, {user.displayName?.split(' ')[0]}!</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button 
                      onClick={() => { setQuickAddSub(null); setIsQuickAddOpen(true); }}
                      disabled={subscriptions.length === 0}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-200 dark:shadow-none cursor-pointer"
                      title="Limit bittiğinde yapılan ek çekim veya ödeme ekle"
                    >
                      <Plus className="w-5 h-5" />
                      <span>+ Ek Harcama</span>
                    </button>
                    <button 
                      onClick={() => setIsCalendarModalOpen(true)}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm cursor-pointer"
                      title="Google / Gmail Takviminize aylık ödemeleri otomatik ekleyin ve 1 gün öncesine alarm kurun"
                    >
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="hidden sm:inline">Google Takvim</span>
                      <span className="sm:hidden">Takvim</span>
                      {profile?.calendarSettings?.enabled && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </button>
                    <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm cursor-pointer"
                      title="JSON veya CSV yedeğinizden gerçek aboneliklerinizi içe aktarın"
                    >
                      <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span>İçe Aktar</span>
                    </button>
                    <button 
                      onClick={() => setIsExportModalOpen(true)}
                      disabled={subscriptions.length === 0 && allPayments.length === 0}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Aylara ve duruma göre filtreleyerek tüm verileri liste halinde inceleyin ve CSV indirin"
                    >
                      <Download className="w-5 h-5" />
                      <span>Dışa Aktar</span>
                    </button>
                    <button 
                      onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
                      className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-blue-900/20 cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Yeni Abonelik</span>
                    </button>
                  </div>
                </div>

                {/* Demo / Sample Data Warning Banner */}
                {demoSubscriptions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-700/80 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-amber-950 dark:text-amber-200">
                            Demo / Test Abonelikleri Tespit Edildi ({demoSubscriptions.length} Adet)
                          </h4>
                          <span className="px-2 py-0.5 bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-md text-[10px] font-bold">
                            Demo Veri
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 max-w-2xl leading-relaxed">
                          Listelenen test verilerini tek tıkla temizleyebilir ve kendi aboneliklerinizi ekleyebilirsiniz.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={() => {
                          confirm({
                            title: 'Demo Verilerini Temizle',
                            message: `${demoSubscriptions.length} adet demo abonelik kaydı hesabınızdan silinecektir. Onaylıyor musunuz?`,
                            confirmText: 'Tüm Demo Verileri Sil',
                            onConfirm: handleDeleteAllDemoData
                          });
                        }}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/20 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Demo Verileri Temizle ({demoSubscriptions.length})</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Zero-Subscriptions Recovery Banner */}
                {subscriptions.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                          Abonelik listeniz şu an boş
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
                          Gerçek aboneliklerinizi eklemek için <strong>Yeni Abonelik</strong> butonunu kullanabilir veya varsa önceki yedek dosyanızı <strong>İçe Aktar</strong> ile doğrudan yükleyebilirsiniz.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
                      <button
                        onClick={handleScanAndRecoverAll}
                        disabled={isScanningStorage}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                        title="Tarayıcının önbelleğini tarar"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isScanningStorage && "animate-spin")} />
                        <span>{isScanningStorage ? "Önbellek Taranıyor..." : "Önbelleği Tara"}</span>
                      </button>
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Yedekten İçe Aktar</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                          <Coins className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Aylık Bütçe</span>
                      </div>
                      <p className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        {formatCurrency(monthlyTotal, profile?.currency)}
                      </p>
                      <div className="mt-6 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-bold bg-green-50/50 dark:bg-green-900/10 px-3 py-1.5 rounded-xl w-fit">
                        <TrendingUp className="w-4 h-4" />
                        <span>{subscriptions.length} aktif / kayıtlı servis</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 dark:bg-purple-900/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/10 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <PieChart className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Kategoriler</span>
                      </div>
                      <div className="flex-1 h-24">
                        {categoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={categoryData}
                                innerRadius={40}
                                outerRadius={55}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {categoryData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ReTooltip 
                                contentStyle={{
                                  borderRadius: '12px',
                                  border: 'none',
                                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                  backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
                                  padding: '8px 12px'
                                }}
                              />
                            </RePieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400 italic">Veri yok</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Duplicate Payments Notice Banner */}
                {duplicatePaymentsInfo.count > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                          {duplicatePaymentsInfo.count} adet mükerrer / çift kayıt tespit edildi!
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          Otomatik yenileme senkronizasyonu nedeniyle bazı abonelikler birden fazla kez kaydedilmiş ({formatCurrency(duplicatePaymentsInfo.excessAmount, profile?.currency)} fazla).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMonthKey(duplicatePaymentsInfo.monthsWithDuplicates[0] || currentMonthKey);
                        setIsMonthDetailOpen(true);
                      }}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-amber-600/20 transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Kayıtları İncele & Çiftleri Temizle</span>
                    </button>
                  </motion.div>
                )}

                {/* Monthly History Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
                >
                  <div className="p-5 border-b border-gray-50 dark:border-gray-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white leading-tight">Aylık Görünüm & Trendler</h2>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">Ay bazında harcama dağılımı (detaylar için aylara tıklayın)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statsComparison.lastTotal > 0 && (
                          <div className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5",
                            statsComparison.isHigher ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                          )}>
                            {statsComparison.isHigher ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {statsComparison.isHigher ? '+' : ''}{statsComparison.percent.toFixed(0)}%
                          </div>
                        )}
                        {monthlyHistoryData.length > 0 && (
                          <button 
                            onClick={() => {
                              const latestKey = monthlyHistoryData[monthlyHistoryData.length - 1]?.key || currentMonthKey;
                              setSelectedMonthKey(latestKey);
                              setIsMonthDetailOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Ay Bazlı Ödeme Dökümünü İncele"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Dökümü İncele</span>
                          </button>
                        )}
                        {allPayments.length > 0 && (
                          <button 
                            onClick={() => setIsGlobalHistoryOpen(true)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all cursor-pointer"
                            title="Tüm Aylık Harcama Özeti"
                          >
                            <ArrowUpDown className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4">
                    <div className="lg:border-r border-gray-50 dark:border-gray-800 p-5 space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Geçmiş Aylar</h3>
                      <div className="space-y-2">
                        {monthlyHistoryData.length > 0 ? (
                          [...monthlyHistoryData].reverse().slice(0, 4).map((data, idx) => (
                            <button 
                              key={data.key || data.name}
                              onClick={() => {
                                setSelectedMonthKey(data.key);
                                setIsMonthDetailOpen(true);
                              }}
                              className="w-full flex justify-between items-center p-3 bg-gray-50/50 hover:bg-blue-50/60 dark:bg-gray-800/30 dark:hover:bg-blue-900/30 rounded-xl border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all text-left cursor-pointer group"
                              title="Bu ayın ödeme kayıtlarını incele"
                            >
                              <div className="flex flex-col">
                                <span className={cn("text-[11px] font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors", idx === 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")}>
                                  {data.name}
                                </span>
                                {idx === 0 && <span className="text-[9px] uppercase font-black tracking-tighter opacity-60">Son Ay</span>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-gray-900 dark:text-white">{formatCurrency(data.value, profile?.currency)}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">Veri bulunmuyor</p>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-3 p-5">
                      <div className="h-[220px] w-full">
                        {monthlyHistoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyHistoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#1f2937' : '#f1f5f9'} />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                dy={5}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                tickFormatter={(value) => `${getCurrencySymbol(profile?.currency)}${value}`}
                              />
                              <ReTooltip 
                                contentStyle={{
                                  borderRadius: '16px',
                                  border: 'none',
                                  boxShadow: '0 15px 35px -5px rgb(0 0 0 / 0.2)',
                                  backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
                                  padding: '12px'
                                }}
                                cursor={{ fill: 'transparent' }}
                                formatter={(value: any) => [formatCurrency(Number(value) || 0, profile?.currency), 'Toplam']}
                              />
                              <Bar 
                                dataKey="value" 
                                fill="#3b82f6" 
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                                animationDuration={1500}
                                onClick={(entry: any) => {
                                  if (entry && entry.key) {
                                    setSelectedMonthKey(entry.key);
                                    setIsMonthDetailOpen(true);
                                  }
                                }}
                                className="cursor-pointer hover:opacity-85 transition-opacity"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <Clock className="w-10 h-10 opacity-10" />
                            <p className="font-medium text-[11px]">Trend grafiği hazırlanıyor...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Subscriptions List */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                          <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span>{hideInactive ? 'Aktif Abonelikler' : 'Tüm Abonelikler'}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold">
                            {sortedSubscriptions.length}
                          </span>
                        </h2>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {inactiveCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setHideInactive(!hideInactive)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                              hideInactive
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 shadow-xs"
                                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                            )}
                            title={hideInactive ? "Kapalı abonelikleri listeye dahil et" : "Kapalı (inaktif) abonelikleri listeden gizle"}
                          >
                            {hideInactive ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
                            <span>{hideInactive ? `Kapalılar Gizli (${inactiveCount})` : `Kapalıyı Gizle (${inactiveCount})`}</span>
                          </button>
                        )}
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-r border-gray-100 dark:border-gray-800">
                            <ArrowUpDown className="w-3 h-3" />
                            <span>Sırala</span>
                          </div>
                          <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as keyof Subscription)}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-transparent outline-none cursor-pointer"
                          >
                            <option value="nextPaymentDate">Sonraki Tarih</option>
                            <option value="name">İsim</option>
                            <option value="amount">Tutar</option>
                            <option value="category">Kategori</option>
                          </select>
                          <button 
                            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors mr-1 cursor-pointer"
                            title={`Sıralama yönü: ${sortOrder}`}
                          >
                            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {sortedSubscriptions.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                          {sortedSubscriptions.map((sub) => (
                            <SubscriptionCard
                              key={sub.id}
                              sub={sub}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onToggleStatus={handleToggleStatus}
                              onViewHistory={handleViewHistory}
                              onAddTopUp={(s) => {
                                setQuickAddSub(s);
                                setIsQuickAddOpen(true);
                              }}
                              onSyncCalendar={handleSyncSingleSubscription}
                              currentMonthTopUpsTotal={topUpsBySubThisMonth[sub.id] || 0}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800">
                        <CreditCard className="w-16 h-16 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2 dark:text-white">Henüz kayıtlı abonelik yok</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Aboneliklerinizi veya limit bittikçe çekim yapan servislerinizi ekleyin.</p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button 
                            onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg cursor-pointer flex items-center gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            <span>İlk Aboneliğinizi Ekleyin</span>
                          </button>
                          <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-5 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer flex items-center gap-2"
                            title="JSON veya CSV yedeğinden gerçek aboneliklerinizi yükleyin"
                          >
                            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>Yedekten İçe Aktar (JSON/CSV)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar - Upcoming Bills */}
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                      <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Yaklaşan Faturalar
                    </h2>
                    
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                      {upcomingBills.length > 0 ? (
                        upcomingBills.map((sub) => {
                          const isUsageBased = sub.pricingType === 'usage_based';
                          const daysRemaining = differenceInDays(parseISO(sub.nextPaymentDate), new Date());
                          return (
                            <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                                  <Tag className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-gray-900 dark:text-white">{sub.name}</p>
                                  <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">
                                    {isUsageBased
                                      ? '⚡ Limit bittikçe'
                                      : daysRemaining < 0
                                        ? 'Gecikmiş'
                                        : daysRemaining === 0
                                          ? 'Bugün ödenecek'
                                          : `${daysRemaining} gün kaldı`}
                                  </p>
                                </div>
                              </div>
                              <p className="font-black text-sm text-gray-900 dark:text-white">{formatCurrency(sub.amount, profile?.currency)}</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-gray-400 dark:text-gray-500 italic text-sm">
                          Yaklaşan fatura yok
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Dialogs and Popups */}
          <AddEditModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            sub={editingSub} 
          />
          
          <PaymentHistoryModal 
            isOpen={isHistoryOpen} 
            onClose={() => setIsHistoryOpen(false)} 
            sub={historySub}
            onConfirmAction={confirm}
          />

          <QuickAddPaymentModal
            isOpen={isQuickAddOpen}
            onClose={() => {
              setIsQuickAddOpen(false);
              setQuickAddSub(null);
            }}
            initialSub={quickAddSub}
            subscriptions={subscriptions.filter(s => s.status === 'active')}
          />

          <MonthlySummaryModal 
            isOpen={isGlobalHistoryOpen} 
            onClose={() => setIsGlobalHistoryOpen(false)} 
            payments={allPayments}
            subscriptions={subscriptions}
            onSelectMonth={(mKey) => {
              setSelectedMonthKey(mKey);
              setIsMonthDetailOpen(true);
            }}
          />

          <MonthDetailModal
            isOpen={isMonthDetailOpen}
            onClose={() => {
              setIsMonthDetailOpen(false);
              setSelectedMonthKey(null);
            }}
            monthKey={selectedMonthKey}
            allPayments={allPayments}
            subscriptions={subscriptions}
            onConfirmAction={confirm}
          />

          <ExportReportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            subscriptions={subscriptions}
            payments={allPayments}
          />

          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImportSubscriptions}
            currencyCode={profile?.currency}
            formatCurrency={formatCurrency}
          />

          <GoogleCalendarModal
            isOpen={isCalendarModalOpen}
            onClose={() => setIsCalendarModalOpen(false)}
            user={user}
            profile={profile}
            subscriptions={subscriptions}
            onConfirmAction={confirm}
            onUpdateSubscription={(updatedSub) => {
              setSubscriptions(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
            }}
          />

          <ConfirmationModal 
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            variant={confirmModal.variant}
            confirmText={confirmModal.confirmText}
          />

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLocalLogin={handleLocalLogin}
          />
        </div>
      </ErrorBoundary>
    </AuthContext.Provider>
  );
}
