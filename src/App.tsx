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
  Calendar,
  RotateCcw,
  Receipt,
  ShoppingBag,
  Layers
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
import { UserProfile, Subscription, Payment, Installment, RegularPayment, IncomeItem, SavingsTarget, TaxProfile, TaxYearRecord, OperationType, FirestoreErrorInfo } from './types';
import { AuthContext } from './context/AuthContext';
import { useTranslation } from './context/LanguageContext';
import { formatCurrency, getCurrencySymbol, isDemoItem, COLORS } from './constants';
import { getLocalizedCategoryName } from './utils/categoryTranslator';
import { cleanSubscriptionPayload } from './utils/subscriptionUtils';
import { Navbar, MainNavTab } from './components/Navbar';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
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
import { InstallmentsView } from './components/InstallmentsView';
import { AddEditInstallmentModal } from './components/AddEditInstallmentModal';
import { RegularPaymentsView } from './components/RegularPaymentsView';
import { AddEditRegularPaymentModal } from './components/AddEditRegularPaymentModal';
import { FinancialDashboardView } from './components/FinancialDashboardView';
import { MonthlyIncomeSourcesView } from './components/MonthlyIncomeSourcesView';
import { SavingsTargetFundsView } from './components/SavingsTargetFundsView';
import { TaxCenterView } from './components/TaxCenterView';
import { SettingsView } from './components/SettingsView';
import { AddEditIncomeModal } from './components/AddEditIncomeModal';
import { AddEditSavingsModal } from './components/AddEditSavingsModal';
import { TaxSettingsModal } from './components/TaxSettingsModal';
import { normalizeCountryCode } from './constants/taxRegions';
import { SEED_SUBSCRIPTIONS, SEED_PAYMENTS, DEFAULT_PROFILE, SEED_INSTALLMENTS, HONDA_PILOT_INSTALLMENT, SEED_REGULAR_PAYMENTS, SEED_INCOMES, SEED_SAVINGS, SEED_TAX_PROFILE, SEED_TAX_YEAR_RECORDS } from './data/seedData';
import {
  syncEventToGoogleCalendar,
  deleteGoogleCalendarEvent,
  syncInstallmentToGoogleCalendar,
  deleteInstallmentCalendarEvents,
  markInstallmentEventPaidInGoogleCalendar,
  unmarkInstallmentEventPaidInGoogleCalendar,
  syncRegularPaymentToGoogleCalendar,
  resolveTargetPeriod,
  isRegularPaymentPaidForPeriod,
  markRegularPaymentEventPaidInGoogleCalendar,
  markSubscriptionEventPaidInGoogleCalendar,
  connectGoogleCalendar,
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
  const { t, language } = useTranslation();
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
  const [trendFilter, setTrendFilter] = useState<'subscriptions' | 'all' | 'regular' | 'installments'>('subscriptions');
  const [trendMode, setTrendMode] = useState<'actual' | 'planned'>('actual');

  // Navigation & Management State (Dashboard, Subscriptions, Installments, RegularPayments, IncomeSources, SavingsFunds)
  const [activeMainTab, setActiveMainTab] = useState<MainNavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);

  // Incomes State
  const [incomes, setIncomes] = useState<IncomeItem[]>(() => {
    try {
      const saved = localStorage.getItem('subtrack_incomes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) return parsed;
          if (localStorage.getItem('subtrack_incomes_initialized') === 'true') {
            return [];
          }
        }
      }
    } catch {}
    return SEED_INCOMES;
  });
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('subtrack_incomes', JSON.stringify(incomes));
    } catch {}
  }, [incomes]);

  // Savings Targets State
  const [savings, setSavings] = useState<SavingsTarget[]>(() => {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('subtrack_deleted_savings_ids') || '[]');
      const saved = localStorage.getItem('subtrack_savings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(item => item && !deletedIds.includes(item.id));
          if (filtered.length > 0) return filtered;
          if (localStorage.getItem('subtrack_savings_initialized') === 'true' || deletedIds.length > 0) {
            return [];
          }
        }
      }
      return SEED_SAVINGS.filter(item => !deletedIds.includes(item.id));
    } catch {}
    return SEED_SAVINGS;
  });
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [editingSavings, setEditingSavings] = useState<SavingsTarget | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('subtrack_savings', JSON.stringify(savings));
    } catch {}
  }, [savings]);

  // Tax Profile State
  const [taxProfile, setTaxProfile] = useState<TaxProfile>(() => {
    try {
      const saved = localStorage.getItem('subtrack_tax_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            country: normalizeCountryCode(parsed.country)
          };
        }
      }
    } catch {}
    return SEED_TAX_PROFILE;
  });
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('subtrack_tax_profile', JSON.stringify(taxProfile));
    } catch {}
  }, [taxProfile]);

  // Tax Year Records State (Annual records for multi-year tracking)
  const [taxYearRecords, setTaxYearRecords] = useState<TaxYearRecord[]>(() => {
    try {
      const saved = localStorage.getItem('subtrack_tax_year_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_TAX_YEAR_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('subtrack_tax_year_records', JSON.stringify(taxYearRecords));
    } catch {}
  }, [taxYearRecords]);

  const handleSaveTaxYearRecord = (record: TaxYearRecord) => {
    setTaxYearRecords(prev => {
      const exists = prev.some(r => r.id === record.id);
      if (exists) {
        return prev.map(r => r.id === record.id ? record : r);
      }
      return [record, ...prev];
    });
  };

  const handleDeleteTaxYearRecord = (id: string) => {
    setTaxYearRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile(prev => {
      const merged = prev ? { ...prev, ...updated } : { ...DEFAULT_PROFILE, ...updated };
      try {
        localStorage.setItem('subtrack_user_profile', JSON.stringify(merged));
      } catch {}
      return merged;
    });

    if (updated.displayName || updated.email || updated.photoURL) {
      setUser((prev: any) => {
        const nextUser = {
          ...prev,
          displayName: updated.displayName ?? prev?.displayName,
          email: updated.email ?? prev?.email,
          photoURL: updated.photoURL ?? prev?.photoURL
        };
        try {
          localStorage.setItem('subtrack_local_user', JSON.stringify(nextUser));
        } catch {}
        return nextUser;
      });
    }

    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), updated, { merge: true }).catch(() => {});
    }
  };

  const [installments, setInstallments] = useState<Installment[]>(() => {
    try {
      const saved = localStorage.getItem('subtrack_installments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const nonDemo = parsed.filter(i => !['inst_iphone', 'inst_macbook', 'inst_dyson'].includes(i.id));
          if (nonDemo.length > 0) return nonDemo;
          if (localStorage.getItem('subtrack_installments_initialized') === 'true') {
            return [];
          }
        }
      }
    } catch {}
    return [HONDA_PILOT_INSTALLMENT];
  });
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);

  // Regular Payments State (Kira, faturalar, kişilere/kurumlara ödemeler)
  const [regularPayments, setRegularPayments] = useState<RegularPayment[]>(() => {
    try {
      const saved = localStorage.getItem('subtrack_regular_payments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) return parsed;
          if (localStorage.getItem('subtrack_regular_payments_initialized') === 'true') {
            return [];
          }
        }
      }
    } catch {}
    return SEED_REGULAR_PAYMENTS;
  });
  const [isRegularPaymentModalOpen, setIsRegularPaymentModalOpen] = useState(false);
  const [editingRegularPayment, setEditingRegularPayment] = useState<RegularPayment | null>(null);
  const [syncingCalendarPaymentId, setSyncingCalendarPaymentId] = useState<string | null>(null);
  const [payingRegularPaymentId, setPayingRegularPaymentId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('subtrack_regular_payments', JSON.stringify(regularPayments));
    } catch {}
  }, [regularPayments]);

  useEffect(() => {
    try {
      localStorage.setItem('subtrack_installments', JSON.stringify(installments));
      localStorage.setItem('subtrack_installments_initialized', 'true');
    } catch {}
  }, [installments]);

  const [syncingCalendarInstallmentId, setSyncingCalendarInstallmentId] = useState<string | null>(null);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);

  const handleSyncSingleInstallment = async (inst: Installment, silent = false): Promise<boolean> => {
    let token = getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
      } catch (err: any) {
        if (!silent) {
          alert('Google Takvim erişim izni alınamadı: ' + (err.message || ''));
        }
        return false;
      }
    }

    setSyncingCalendarInstallmentId(inst.id);
    try {
      const targetCalId = profile?.calendarSettings?.calendarId || 'primary';
      const result = await syncInstallmentToGoogleCalendar(
        token,
        targetCalId,
        {
          id: inst.id,
          name: inst.name,
          store: inst.store,
          totalAmount: inst.totalAmount,
          monthlyAmount: inst.monthlyAmount,
          currency: profile?.currency || 'USD',
          category: inst.category,
          totalInstallments: inst.totalInstallments,
          paidInstallments: inst.paidInstallments || 0,
          remainingInstallments: inst.remainingInstallments || (inst.totalInstallments - (inst.paidInstallments || 0)),
          nextPaymentDate: inst.nextPaymentDate,
          bankOrCard: inst.bankOrCard,
          note: inst.note,
          isAutoPayment: inst.isAutoPayment,
          isPaid: Boolean(inst.lastPaidMonth === format(new Date(), 'yyyy-MM') || (inst.paidInstallments || 0) >= inst.totalInstallments)
        },
        inst.calendarEventIds || inst.calendarEventId
      );

      const updatedInst: Installment = {
        ...inst,
        calendarEventId: result.eventId,
        calendarEventIds: result.eventIds,
        calendarEventMap: result.eventMap,
        calendarSyncedAt: new Date().toISOString()
      };

      setInstallments(prev => prev.map(item => item.id === inst.id ? updatedInst : item));
      if (user) {
        setDoc(doc(db, 'installments', inst.id), updatedInst, { merge: true }).catch(() => {});
      }

      const curIndex = Math.min(inst.totalInstallments, (inst.paidInstallments || 0) + 1);
      alert(`"${inst.name}" kalan ${result.count} aylık taksiti ([Taksit ${curIndex}/${inst.totalInstallments}]'den itibaren) aylara göre Google Takvim'e başarıyla eklendi!`);
      return true;
    } catch (err: any) {
      console.error('Error syncing installment to calendar:', err);
      if (!silent) {
        alert(`Takvim aktarımı başarısız: ${err.message || ''}`);
      }
      return false;
    } finally {
      setSyncingCalendarInstallmentId(null);
    }
  };

  const handleSaveInstallment = async (data: Omit<Installment, 'id' | 'uid'> & { id?: string; syncToCalendar?: boolean }) => {
    const { syncToCalendar, ...instFields } = data;
    let targetInst: Installment;

    if (instFields.id) {
      const id = instFields.id;
      const existing = installments.find(i => i.id === id);
      targetInst = {
        ...existing,
        ...instFields
      } as Installment;
      setInstallments(prev => {
        const next = prev.map(i => i.id === id ? targetInst : i);
        try {
          localStorage.setItem('subtrack_installments', JSON.stringify(next));
          localStorage.setItem('subtrack_installments_initialized', 'true');
          if (user) {
            localStorage.setItem(`subtrack_backup_installments_${user.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      if (user) {
        setDoc(doc(db, 'installments', id), targetInst, { merge: true }).catch(() => {});
      }
    } else {
      const newId = 'inst_' + Date.now();
      targetInst = {
        ...instFields,
        id: newId,
        uid: user?.uid || DEFAULT_PROFILE.uid,
        createdAt: new Date().toISOString()
      };
      setInstallments(prev => {
        const next = [targetInst, ...prev];
        try {
          localStorage.setItem('subtrack_installments', JSON.stringify(next));
          localStorage.setItem('subtrack_installments_initialized', 'true');
          if (user) {
            localStorage.setItem(`subtrack_backup_installments_${user.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      if (user) {
        setDoc(doc(db, 'installments', newId), targetInst, { merge: true }).catch(() => {});
      }
    }

    // Auto-sync to Google Calendar if requested
    if (syncToCalendar) {
      const token = getCachedAccessToken();
      if (!token) {
        confirm({
          title: 'Google Takvim ile Eşitle',
          message: `"${targetInst.name}" ürününün ${targetInst.totalInstallments - (targetInst.paidInstallments || 0)} aylık taksitlerini Google Takvim'e aylara göre eklemek için Google hesabınızı bağlamak ister misiniz?`,
          confirmText: 'Takvimi Bağla ve Ekle',
          variant: 'info',
          onConfirm: async () => {
            await handleSyncSingleInstallment(targetInst, false);
          }
        });
      } else {
        await handleSyncSingleInstallment(targetInst, false);
      }
    }
  };

  const handleDeleteInstallment = (id: string) => {
    const inst = installments.find(i => i.id === id);
    confirm({
      title: t('deleteInstallmentTitle'),
      message: `${inst?.name ? `"${inst.name}" - ` : ''}${t('deleteInstallmentMsg')}`,
      confirmText: t('delete'),
      variant: 'danger',
      onConfirm: () => {
        setInstallments(prev => {
          const next = prev.filter(i => i.id !== id);
          try {
            localStorage.setItem('subtrack_installments', JSON.stringify(next));
            localStorage.setItem('subtrack_installments_initialized', 'true');
            if (user) {
              localStorage.setItem(`subtrack_backup_installments_${user.uid}`, JSON.stringify(next));
            }
          } catch {}
          return next;
        });
        if (user) {
          deleteDoc(doc(db, 'installments', id)).catch(() => {});
        }
        const token = getCachedAccessToken();
        const targetCalId = profile?.calendarSettings?.calendarId || 'primary';
        if (token && (inst?.calendarEventIds || inst?.calendarEventId)) {
          deleteInstallmentCalendarEvents(token, targetCalId, inst.calendarEventIds || inst.calendarEventId).catch(() => {});
        }
      }
    });
  };

  const handlePayInstallment = async (id: string) => {
    const inst = installments.find(i => i.id === id);
    if (!inst) return;

    const nextPaid = Math.min(inst.totalInstallments, (inst.paidInstallments || 0) + 1);
    const isCompleted = nextPaid >= inst.totalInstallments;

    let nextDate = inst.nextPaymentDate;
    try {
      const parsed = parseISO(inst.nextPaymentDate);
      nextDate = format(addMonths(parsed, 1), 'yyyy-MM-dd');
    } catch {}

    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');
    const todayStr = format(now, 'yyyy-MM-dd');

    // 1. Immediately update SubTrack UI (turn green in SubTrack)
    const updated: Installment = {
      ...inst,
      paidInstallments: nextPaid,
      remainingInstallments: Math.max(0, inst.totalInstallments - nextPaid),
      nextPaymentDate: isCompleted ? inst.nextPaymentDate : nextDate,
      status: isCompleted ? 'completed' : 'active',
      lastPaidDate: todayStr,
      lastPaidMonth: currentMonthStr,
      lastPaidInstallmentNumber: nextPaid
    };

    setInstallments(prev => prev.map(item => item.id === id ? updated : item));
    if (user) {
      setDoc(doc(db, 'installments', id), updated, { merge: true }).catch(() => {});
    }

    // 2. Concurrently update Google Calendar to turn event GREEN (colorId: '10', '✅ [ÖDENDİ - Taksit X/Y] ...')
    let token = getCachedAccessToken();
    const targetCalId = profile?.calendarSettings?.calendarId || 'primary';
    const isCalendarSynced = Boolean(inst.calendarEventId || (inst.calendarEventIds && inst.calendarEventIds.length > 0) || inst.calendarSyncedAt);

    // If installment was synced or calendar settings exist, but token is missing from session, prompt or request connection
    if (!token && (isCalendarSynced || profile?.calendarSettings?.autoSync)) {
      try {
        token = await connectGoogleCalendar();
      } catch (authErr) {
        console.warn('Google Calendar authorization was not granted:', authErr);
      }
    }

    if (token) {
      setPayingInstallmentId(id);
      try {
        const paidEventId = inst.calendarEventMap?.[nextPaid] || 
          (inst.calendarEventIds && inst.calendarEventIds[0]) ||
          inst.calendarEventId;

        const paidGcalId = await markInstallmentEventPaidInGoogleCalendar(token, targetCalId, {
          eventId: paidEventId,
          name: updated.name,
          store: updated.store,
          paidInstallmentNumber: nextPaid,
          totalInstallments: updated.totalInstallments,
          monthlyAmount: updated.monthlyAmount,
          currency: profile?.currency || 'USD',
          paymentDate: inst.nextPaymentDate || todayStr,
          bankOrCard: updated.bankOrCard
        });

        if (paidGcalId) {
          const finalInst: Installment = {
            ...updated,
            calendarEventMap: {
              ...(inst.calendarEventMap || {}),
              [nextPaid]: paidGcalId
            },
            calendarSyncedAt: new Date().toISOString()
          };
          setInstallments(prev => prev.map(item => item.id === id ? finalInst : item));
          if (user) {
            setDoc(doc(db, 'installments', id), finalInst, { merge: true }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Could not mark installment as paid in Google Calendar:', err);
      } finally {
        setPayingInstallmentId(null);
      }
    }
  };

  const handleUndoPayment = async (id: string) => {
    const inst = installments.find(i => i.id === id);
    if (!inst) return;
    const nextPaid = Math.max(0, (inst.paidInstallments || 0) - 1);
    const updated: Installment = {
      ...inst,
      paidInstallments: nextPaid,
      remainingInstallments: Math.max(0, inst.totalInstallments - nextPaid),
      status: 'active',
      lastPaidDate: undefined,
      lastPaidMonth: undefined,
      lastPaidInstallmentNumber: undefined
    };

    setInstallments(prev => prev.map(item => item.id === id ? updated : item));
    if (user) {
      setDoc(doc(db, 'installments', id), updated, { merge: true }).catch(() => {});
    }

    const token = getCachedAccessToken();
    const targetCalId = profile?.calendarSettings?.calendarId || 'primary';
    const lastPaidNum = inst.lastPaidInstallmentNumber || (inst.paidInstallments || 0);
    const paidEventId = inst.calendarEventMap?.[lastPaidNum];

    if (token && paidEventId) {
      await unmarkInstallmentEventPaidInGoogleCalendar(token, targetCalId, {
        eventId: paidEventId,
        name: updated.name,
        store: updated.store,
        paidInstallmentNumber: lastPaidNum,
        totalInstallments: updated.totalInstallments,
        monthlyAmount: updated.monthlyAmount,
        currency: profile?.currency || 'USD',
        paymentDate: inst.nextPaymentDate || new Date().toISOString().split('T')[0],
        bankOrCard: updated.bankOrCard
      }).catch(() => {});
    }
  };

  const handleSetAutoPayment = async (id: string, isAuto: boolean) => {
    const inst = installments.find(i => i.id === id);
    if (!inst) return;
    if (inst.isAutoPayment === isAuto) return;

    const updatedInst: Installment = {
      ...inst,
      isAutoPayment: isAuto
    };

    setInstallments(prev => {
      const next = prev.map(item => item.id === id ? updatedInst : item);
      try {
        localStorage.setItem('subtrack_installments', JSON.stringify(next));
        localStorage.setItem('subtrack_installments_initialized', 'true');
        if (user) {
          localStorage.setItem(`subtrack_backup_installments_${user.uid}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    if (user) {
      setDoc(doc(db, 'installments', id), { isAutoPayment: isAuto }, { merge: true }).catch(() => {});
    }
  };

  const handleToggleAutoPayment = async (id: string) => {
    const inst = installments.find(i => i.id === id);
    if (!inst) return;
    await handleSetAutoPayment(id, !inst.isAutoPayment);
  };

  // Regular Payments Handlers (Kira, faturalar, vb.)
  const handleSaveRegularPayment = async (data: Omit<RegularPayment, 'id' | 'uid'> & { id?: string; syncToCalendar?: boolean }) => {
    const { syncToCalendar, ...payFields } = data;
    let targetPayment: RegularPayment;

    if (payFields.id) {
      const id = payFields.id;
      const existing = regularPayments.find(p => p.id === id);
      targetPayment = {
        ...existing,
        ...payFields
      } as RegularPayment;
      setRegularPayments(prev => {
        const next = prev.map(p => p.id === id ? targetPayment : p);
        try {
          localStorage.setItem('subtrack_regular_payments', JSON.stringify(next));
          if (user) {
            localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      if (user) {
        setDoc(doc(db, 'regularPayments', id), targetPayment, { merge: true }).catch(() => {});
      }
    } else {
      const newId = 'reg_' + Date.now();
      targetPayment = {
        ...payFields,
        id: newId,
        uid: user?.uid || DEFAULT_PROFILE.uid,
        createdAt: new Date().toISOString()
      };
      setRegularPayments(prev => {
        const next = [targetPayment, ...prev];
        try {
          localStorage.setItem('subtrack_regular_payments', JSON.stringify(next));
          if (user) {
            localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      if (user) {
        setDoc(doc(db, 'regularPayments', newId), targetPayment, { merge: true }).catch(() => {});
      }
    }

    if (syncToCalendar) {
      const token = getCachedAccessToken();
      if (token) {
        await handleSyncRegularPaymentToCalendar(targetPayment, true);
      }
    }
  };

  const handleDeleteRegularPayment = (id: string) => {
    const target = regularPayments.find(p => p.id === id);
    confirm({
      title: t('deleteRegularPaymentTitle'),
      message: `${target?.name ? `"${target.name}" - ` : ''}${t('deleteRegularPaymentMsg')}`,
      confirmText: t('delete'),
      variant: 'danger',
      onConfirm: async () => {
        setRegularPayments(prev => {
          const next = prev.filter(p => p.id !== id);
          try {
            localStorage.setItem('subtrack_regular_payments', JSON.stringify(next));
            if (user) {
              localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(next));
            }
          } catch {}
          return next;
        });
        if (user) {
          deleteDoc(doc(db, 'regularPayments', id)).catch(() => {});
        }
        if (target?.calendarEventId) {
          const token = getCachedAccessToken();
          if (token) {
            const calId = profile?.calendarSettings?.calendarId || 'primary';
            deleteGoogleCalendarEvent(token, calId, target.calendarEventId).catch(() => {});
          }
        }
      }
    });
  };

  const handlePayRegularPayment = async (id: string) => {
    const target = regularPayments.find(p => p.id === id);
    if (!target) return;
    setPayingRegularPaymentId(id);

    try {
      const currentMonth = format(new Date(), 'yyyy-MM');
      const todayStr = new Date().toISOString().split('T')[0];

      let nextDate = target.nextPaymentDate;
      try {
        const parsed = parseISO(target.nextPaymentDate);
        const nextMonth = new Date(parsed.getFullYear(), parsed.getMonth() + 1, target.dueDay || parsed.getDate());
        nextDate = nextMonth.toISOString().split('T')[0];
      } catch {}

      const updatedPayment: RegularPayment = {
        ...target,
        lastPaidDate: todayStr,
        lastPaidMonth: currentMonth,
        nextPaymentDate: nextDate
      };

      setRegularPayments(prev => {
        const next = prev.map(p => p.id === id ? updatedPayment : p);
        try {
          localStorage.setItem('subtrack_regular_payments', JSON.stringify(next));
          if (user) {
            localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });

      if (user) {
        setDoc(doc(db, 'regularPayments', id), updatedPayment, { merge: true }).catch(() => {});
      }

      // Turn Google Calendar event green (colorId: 10 - Basil) for due auto/manual payment
      const token = getCachedAccessToken();
      const targetCalId = profile?.calendarSettings?.calendarId || 'primary';
      if (token) {
        try {
          const paidEventId = await markRegularPaymentEventPaidInGoogleCalendar(token, targetCalId, {
            eventId: target.calendarEventId,
            name: target.name,
            amount: target.amount,
            currency: profile?.currency || 'USD',
            payee: target.payee,
            dueDate: target.nextPaymentDate,
            isAutoPayment: target.isAutoPayment
          });

          // Also schedule the upcoming next month event on Google Calendar so it is tracked in orange
          if (paidEventId || profile?.calendarSettings?.autoSync) {
            try {
              const nextMonthResult = await syncRegularPaymentToGoogleCalendar(
                token,
                targetCalId,
                {
                  id: target.id,
                  name: target.name,
                  category: target.category,
                  payee: target.payee,
                  amount: target.amount,
                  currency: profile?.currency || 'USD',
                  nextPaymentDate: nextDate,
                  isAutoPayment: target.isAutoPayment,
                  bankOrCard: target.bankOrCard,
                  accountOrSubscriberNo: target.accountOrSubscriberNo,
                  note: target.note,
                  isPaid: false
                }
              );

              if (nextMonthResult?.eventId) {
                const finalPayment: RegularPayment = {
                  ...updatedPayment,
                  calendarEventId: nextMonthResult.eventId,
                  calendarSyncedAt: new Date().toISOString()
                };
                setRegularPayments(prev => prev.map(p => p.id === id ? finalPayment : p));
                if (user) {
                  setDoc(doc(db, 'regularPayments', id), finalPayment, { merge: true }).catch(() => {});
                }
              }
            } catch (nextErr) {
              console.warn('Could not schedule next month calendar event:', nextErr);
            }
          }
        } catch (gcalErr) {
          console.warn('Google Calendar update error on payment:', gcalErr);
        }
      }
    } finally {
      setPayingRegularPaymentId(null);
    }
  };

  const handleUndoRegularPayment = async (id: string) => {
    const target = regularPayments.find(p => p.id === id);
    if (!target) return;

    const updatedPayment: RegularPayment = {
      ...target,
      lastPaidDate: undefined,
      lastPaidMonth: undefined
    };

    setRegularPayments(prev => {
      const next = prev.map(p => p.id === id ? updatedPayment : p);
      try {
        localStorage.setItem('subtrack_regular_payments', JSON.stringify(next));
        if (user) {
          localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    if (user) {
      setDoc(doc(db, 'regularPayments', id), updatedPayment, { merge: true }).catch(() => {});
    }
  };

  const handleSetRegularPaymentAutoPayment = async (id: string, isAuto: boolean) => {
    const target = regularPayments.find(p => p.id === id);
    if (!target) return;
    if (target.isAutoPayment === isAuto) return;

    const updated: RegularPayment = {
      ...target,
      isAutoPayment: isAuto
    };

    setRegularPayments(prev => {
      const next = prev.map(p => p.id === id ? updated : p);
      try {
        localStorage.setItem('subtrack_regular_payments', JSON.stringify(next));
        if (user) {
          localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    if (user) {
      setDoc(doc(db, 'regularPayments', id), { isAutoPayment: isAuto }, { merge: true }).catch(() => {});
    }
  };

  const handleToggleRegularPaymentAutoPayment = async (id: string) => {
    const target = regularPayments.find(p => p.id === id);
    if (!target) return;
    await handleSetRegularPaymentAutoPayment(id, !target.isAutoPayment);
  };

  const handleSyncRegularPaymentToCalendar = async (payment: RegularPayment, silent = false): Promise<boolean> => {
    let token = getCachedAccessToken();
    if (!token) {
      try {
        token = await connectGoogleCalendar();
      } catch {
        if (!silent) alert('Google Takvim bağlantısı kurulamadı.');
        return false;
      }
    }
    if (!token) return false;

    setSyncingCalendarPaymentId(payment.id);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const curMonth = format(new Date(), 'yyyy-MM');
      const targetPeriod = resolveTargetPeriod(undefined, payment.nextPaymentDate);
      const isPaid = isRegularPaymentPaidForPeriod(payment, targetPeriod);

      const targetCalId = profile?.calendarSettings?.calendarId || 'primary';
      const result = await syncRegularPaymentToGoogleCalendar(
        token,
        targetCalId,
        {
          id: payment.id,
          name: payment.name,
          category: payment.category,
          payee: payment.payee,
          amount: payment.amount,
          currency: profile?.currency || 'USD',
          nextPaymentDate: payment.nextPaymentDate,
          isAutoPayment: payment.isAutoPayment,
          bankOrCard: payment.bankOrCard,
          accountOrSubscriberNo: payment.accountOrSubscriberNo,
          note: payment.note,
          targetPeriod,
          isPaid
        },
        payment.calendarEventId
      );

      const updatedPayment: RegularPayment = {
        ...payment,
        calendarEventId: result.eventId,
        calendarSyncedAt: new Date().toISOString()
      };

      setRegularPayments(prev => prev.map(p => p.id === payment.id ? updatedPayment : p));
      if (user) {
        setDoc(doc(db, 'regularPayments', payment.id), updatedPayment, { merge: true }).catch(() => {});
      }

      if (!silent) {
        alert(`"${payment.name}" ödemesi 1 gün öncesine alarmlı olarak Google Takvim'e başarıyla eklendi!`);
      }
      return true;
    } catch (err: any) {
      console.error('Error syncing regular payment to calendar:', err);
      if (!silent) {
        alert(`Takvim aktarımı başarısız: ${err.message || ''}`);
      }
      return false;
    } finally {
      setSyncingCalendarPaymentId(null);
    }
  };

  // Income Handlers
  const handleSaveIncome = async (incomeData: Omit<IncomeItem, 'id' | 'uid'> & { id?: string }) => {
    let targetIncome: IncomeItem;
    if (incomeData.id) {
      const existing = incomes.find(i => i.id === incomeData.id);
      targetIncome = {
        ...existing,
        ...incomeData,
        id: incomeData.id,
        uid: user?.uid || DEFAULT_PROFILE.uid
      } as IncomeItem;
      setIncomes(prev => prev.map(item => item.id === incomeData.id ? targetIncome : item));
      if (user) {
        setDoc(doc(db, 'incomes', incomeData.id), targetIncome, { merge: true }).catch(() => {});
      }
    } else {
      const newId = 'inc_' + Date.now();
      targetIncome = {
        ...incomeData,
        id: newId,
        uid: user?.uid || DEFAULT_PROFILE.uid,
        createdAt: new Date().toISOString()
      };
      setIncomes(prev => [targetIncome, ...prev]);
      if (user) {
        setDoc(doc(db, 'incomes', newId), targetIncome, { merge: true }).catch(() => {});
      }
    }
  };

  const handleDeleteIncome = (id: string) => {
    const inc = incomes.find(i => i.id === id);
    confirm({
      title: t('deleteIncomeTitle'),
      message: `${inc?.name ? `"${inc.name}" - ` : ''}${t('deleteIncomeMsg')}`,
      confirmText: t('delete'),
      variant: 'danger',
      onConfirm: () => {
        setIncomes(prev => {
          const next = prev.filter(i => i.id !== id);
          try {
            localStorage.setItem('subtrack_incomes', JSON.stringify(next));
            localStorage.setItem('subtrack_incomes_initialized', 'true');
            if (user) {
              localStorage.setItem(`subtrack_backup_incomes_${user.uid}`, JSON.stringify(next));
            }
          } catch {}
          return next;
        });
        if (user) {
          deleteDoc(doc(db, 'incomes', id)).catch(() => {});
        }
      }
    });
  };

  // Savings Handlers
  const handleSaveSavings = async (savingsData: Omit<SavingsTarget, 'id' | 'uid'> & { id?: string }) => {
    let targetSav: SavingsTarget;
    if (savingsData.id) {
      const existing = savings.find(s => s.id === savingsData.id);
      targetSav = {
        ...existing,
        ...savingsData,
        id: savingsData.id,
        uid: user?.uid || DEFAULT_PROFILE.uid
      } as SavingsTarget;
      try {
        const deleted = JSON.parse(localStorage.getItem('subtrack_deleted_savings_ids') || '[]');
        const filtered = deleted.filter((delId: string) => delId !== savingsData.id);
        localStorage.setItem('subtrack_deleted_savings_ids', JSON.stringify(filtered));
      } catch {}
      setSavings(prev => {
        const next = prev.map(item => item.id === savingsData.id ? targetSav : item);
        try {
          localStorage.setItem('subtrack_savings', JSON.stringify(next));
          localStorage.setItem('subtrack_savings_initialized', 'true');
          if (user) {
            localStorage.setItem(`subtrack_backup_savings_${user.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      if (user) {
        setDoc(doc(db, 'savings', savingsData.id), targetSav, { merge: true }).catch(() => {});
      }
    } else {
      const newId = 'sav_' + Date.now();
      targetSav = {
        ...savingsData,
        id: newId,
        uid: user?.uid || DEFAULT_PROFILE.uid,
        createdAt: new Date().toISOString()
      };
      try {
        const deleted = JSON.parse(localStorage.getItem('subtrack_deleted_savings_ids') || '[]');
        const filtered = deleted.filter((delId: string) => delId !== newId);
        localStorage.setItem('subtrack_deleted_savings_ids', JSON.stringify(filtered));
      } catch {}
      setSavings(prev => {
        const next = [targetSav, ...prev];
        try {
          localStorage.setItem('subtrack_savings', JSON.stringify(next));
          localStorage.setItem('subtrack_savings_initialized', 'true');
          if (user) {
            localStorage.setItem(`subtrack_backup_savings_${user.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      if (user) {
        setDoc(doc(db, 'savings', newId), targetSav, { merge: true }).catch(() => {});
      }
    }
  };

  const handleDeleteSavings = (id: string) => {
    const target = savings.find(s => s.id === id);
    confirm({
      title: t('deleteSavingsTitle'),
      message: `${target?.title ? `"${target.title}" - ` : ''}${t('deleteSavingsMsg')}`,
      confirmText: t('delete'),
      variant: 'danger',
      onConfirm: () => {
        // Record deleted id to persistent tombstone
        try {
          const deleted = JSON.parse(localStorage.getItem('subtrack_deleted_savings_ids') || '[]');
          if (!deleted.includes(id)) {
            deleted.push(id);
            localStorage.setItem('subtrack_deleted_savings_ids', JSON.stringify(deleted));
          }
        } catch {}

        setSavings(prev => {
          const next = prev.filter(s => s.id !== id);
          try {
            localStorage.setItem('subtrack_savings', JSON.stringify(next));
            localStorage.setItem('subtrack_savings_initialized', 'true');
            if (user) {
              localStorage.setItem(`subtrack_backup_savings_${user.uid}`, JSON.stringify(next));
            }
          } catch {}
          return next;
        });
        if (user) {
          deleteDoc(doc(db, 'savings', id)).catch(() => {});
        }
      }
    });
  };

  // Tax Profile Handler
  const handleSaveTaxProfile = async (newTaxProfile: TaxProfile) => {
    const updated = {
      ...newTaxProfile,
      uid: user?.uid || DEFAULT_PROFILE.uid,
      updatedAt: new Date().toISOString()
    };
    setTaxProfile(updated);
    if (user) {
      setDoc(doc(db, 'taxProfiles', user.uid), updated, { merge: true }).catch(() => {});
    }
  };

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
  const [hideInactive, setHideInactive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('subtrack_hide_inactive');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {}
    // Default to true: cancelled/closed subscriptions remain hidden by default across updates/reloads
    return true;
  });

  const handleToggleHideInactive = () => {
    setHideInactive(prev => {
      const next = !prev;
      try {
        localStorage.setItem('subtrack_hide_inactive', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
    localStorage.setItem('darkMode', String(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    if (profile) {
      setProfile({ ...profile, darkMode: newMode });
    }

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          darkMode: newMode
        });
      } catch (error) {
        console.warn('Error updating dark mode in firestore:', error);
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

  // Auto-record payments for recurring subscriptions, installments, and regular payments
  const isAutoRecordingRef = useRef(false);
  const autoRecordPayments = async () => {
    if (isAutoRecordingRef.current) return;
    isAutoRecordingRef.current = true;
    try {
      const now = new Date();
      const curMonthStr = format(now, 'yyyy-MM');
      const token = getCachedAccessToken();
      const targetCalId = profile?.calendarSettings?.calendarId || 'primary';
      
      // 1. Subscriptions auto-payment & auto-renewal
      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          if (sub.status === 'cancelled') continue;
          if (sub.pricingType === 'usage_based') continue;

          let currentNextDateString = sub.nextPaymentDate;
          let nextPaymentDate = parseISO(currentNextDateString);
          let updated = false;

          const existingMonthKeys = new Set<string>();
          if (user) {
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
          }
          
          while (differenceInCalendarDays(now, nextPaymentDate) >= 0) {
            const paymentMonthKey = format(nextPaymentDate, 'yyyy-MM');
            if (!existingMonthKeys.has(paymentMonthKey)) {
              if (user) {
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
            }
            nextPaymentDate = sub.billingCycle === 'monthly' 
              ? addMonths(nextPaymentDate, 1) 
              : addYears(nextPaymentDate, 1);
            
            updated = true;
            if (isAfter(nextPaymentDate, addYears(now, 2))) break;
          }

          if (updated) {
            if (user) {
              try {
                await updateDoc(doc(db, 'subscriptions', sub.id), {
                  nextPaymentDate: nextPaymentDate.toISOString()
                });
              } catch (error) {
                console.error(`Failed to update subscription date for ${sub.name}:`, error);
              }
            }

            // If connected to Google Calendar, turn event green (colorId: 10 - Basil)
            if (token) {
              markSubscriptionEventPaidInGoogleCalendar(token, targetCalId, {
                eventId: sub.calendarEventId,
                name: sub.name,
                amount: sub.amount,
                currency: profile?.currency || 'USD',
                category: sub.category,
                dueDate: currentNextDateString
              }).catch(() => {});
            }
          }
        }
      }

      // 2. Auto-execute due installments with auto-payment enabled
      if (installments && installments.length > 0) {
        for (const inst of installments) {
          if (inst.status !== 'active' || !inst.isAutoPayment) continue;
          if (!inst.nextPaymentDate) continue;
          try {
            const isDue = differenceInCalendarDays(now, parseISO(inst.nextPaymentDate)) >= 0;
            if (isDue && inst.lastPaidMonth !== curMonthStr && (inst.paidInstallments || 0) < inst.totalInstallments) {
              await handlePayInstallment(inst.id);
            }
          } catch {}
        }
      }

      // 3. Auto-execute due regular payments and turn Google Calendar green
      if (regularPayments && regularPayments.length > 0) {
        for (const regPay of regularPayments) {
          if (regPay.status !== 'active' || !regPay.isAutoPayment) continue;
          if (!regPay.nextPaymentDate) continue;
          try {
            const isDue = differenceInCalendarDays(now, parseISO(regPay.nextPaymentDate)) >= 0;
            if (isDue) {
              if (regPay.lastPaidMonth !== curMonthStr) {
                // Execute auto-payment and update calendar event to green
                await handlePayRegularPayment(regPay.id);
              } else if (token) {
                // Already marked paid in SubTrack, ensure Google Calendar event is green
                markRegularPaymentEventPaidInGoogleCalendar(token, targetCalId, {
                  eventId: regPay.calendarEventId,
                  name: regPay.name,
                  amount: regPay.amount,
                  currency: profile?.currency || 'USD',
                  payee: regPay.payee,
                  dueDate: regPay.lastPaidDate || regPay.nextPaymentDate,
                  isAutoPayment: true
                }).catch(() => {});
              }
            }
          } catch {}
        }
      }
    } finally {
      isAutoRecordingRef.current = false;
    }
  };

  useEffect(() => {
    autoRecordPayments();
  }, [user, subscriptions, installments, regularPayments]);

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
      let deletedSubIds: string[] = [];
      try {
        deletedSubIds = JSON.parse(localStorage.getItem('subtrack_deleted_subscriptions') || '[]');
      } catch {}

      const allDocs = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() } as Subscription));
      
      const userSubs: Subscription[] = [];
      allDocs.forEach(docItem => {
        if (isDemoItem(docItem.name)) {
          deleteDoc(doc(db, 'subscriptions', docItem.id)).catch(() => {});
          return;
        }
        if (deletedSubIds.includes(docItem.id)) {
          return;
        }
        if (!docItem.uid || docItem.uid === user.uid || (docItem as any).email === user.email || docItem.uid === user.email) {
          userSubs.push(docItem);
          if (docItem.uid !== user.uid) {
            updateDoc(doc(db, 'subscriptions', docItem.id), { uid: user.uid }).catch(() => {});
          }
        }
      });

      setSubscriptions(prev => {
        // Read local backup & cached subscriptions
        let localCached: Subscription[] = [];
        try {
          const raw = localStorage.getItem(`subtrack_backup_subscriptions_${user.uid}`) || localStorage.getItem('subtrack_subscriptions');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localCached = parsed.filter(item => item && !deletedSubIds.includes(item.id));
            }
          }
        } catch {}

        const map = new Map<string, Subscription>();

        // 1. Add local cached first
        localCached.forEach(item => {
          if (item && item.id && !deletedSubIds.includes(item.id)) {
            map.set(item.id, item);
          }
        });

        // 2. Add current in-memory state
        prev.forEach(item => {
          if (item && item.id && !deletedSubIds.includes(item.id)) {
            map.set(item.id, item);
          }
        });

        // 3. User subs from Firestore (authoritative)
        userSubs.forEach(item => {
          if (item && item.id && !deletedSubIds.includes(item.id)) {
            map.set(item.id, item);
          }
        });

        const merged = Array.from(map.values());

        if (merged.length > 0) {
          try {
            localStorage.setItem(`subtrack_backup_subscriptions_${user.uid}`, JSON.stringify(merged));
            localStorage.setItem('subtrack_subscriptions', JSON.stringify(merged));
            localStorage.setItem(`subtrack_initialized_${user.uid}`, 'true');
          } catch {}

          // Backfill any local items to Firestore if they weren't in Firestore yet
          const firestoreIds = new Set(userSubs.map(s => s.id));
          merged.forEach(item => {
            if (!firestoreIds.has(item.id)) {
              setDoc(doc(db, 'subscriptions', item.id), { ...item, uid: user.uid }, { merge: true }).catch(() => {});
            }
          });

          return merged;
        }

        // If merged is truly empty, check if we should populate default seed
        const isInitialized = localStorage.getItem(`subtrack_initialized_${user.uid}`);
        if (!isInitialized) {
          const seedList = SEED_SUBSCRIPTIONS
            .filter(s => !deletedSubIds.includes(s.id))
            .map(s => ({
              ...s,
              uid: user.uid,
              id: s.id.startsWith('sub_') ? s.id : `sub_${s.id}`
            }));
          seedList.forEach(s => {
            setDoc(doc(db, 'subscriptions', s.id), s, { merge: true }).catch(() => {});
          });
          try {
            localStorage.setItem(`subtrack_backup_subscriptions_${user.uid}`, JSON.stringify(seedList));
            localStorage.setItem('subtrack_subscriptions', JSON.stringify(seedList));
            localStorage.setItem(`subtrack_initialized_${user.uid}`, 'true');
          } catch {}
          return seedList;
        }

        return [];
      });
    }, (error) => {
      console.warn('Subscriptions onSnapshot warning:', error);
      try {
        const backup = localStorage.getItem(`subtrack_backup_subscriptions_${user.uid}`) || localStorage.getItem('subtrack_subscriptions');
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Array.isArray(parsed) && parsed.length > 0) {
            let deletedSubIds: string[] = [];
            try {
              deletedSubIds = JSON.parse(localStorage.getItem('subtrack_deleted_subscriptions') || '[]');
            } catch {}
            const filtered = parsed.filter(item => item && !deletedSubIds.includes(item.id) && !isDemoItem(item?.name));
            if (filtered.length > 0) {
              setSubscriptions(filtered);
            }
          }
        }
      } catch {}
    });

    return () => unsubscribe();
  }, [user]);

  // Installments Listener
  useEffect(() => {
    if (!user) return;
    const collRef = collection(db, 'installments');
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const allDocs = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() } as Installment));
      
      const userInsts: Installment[] = [];
      allDocs.forEach(docItem => {
        // Automatically delete demo installments from database if found
        if (['inst_iphone', 'inst_macbook', 'inst_dyson'].includes(docItem.id)) {
          deleteDoc(doc(db, 'installments', docItem.id)).catch(() => {});
          return;
        }
        if (!docItem.uid || docItem.uid === user.uid || (docItem as any).email === user.email || docItem.uid === user.email) {
          userInsts.push(docItem);
          if (docItem.uid !== user.uid) {
            updateDoc(doc(db, 'installments', docItem.id), { uid: user.uid }).catch(() => {});
          }
        }
      });

      if (userInsts.length > 0) {
        setInstallments(userInsts);
        try {
          localStorage.setItem(`subtrack_backup_installments_${user.uid}`, JSON.stringify(userInsts));
          localStorage.setItem('subtrack_installments', JSON.stringify(userInsts));
          localStorage.setItem('subtrack_installments_initialized', 'true');
        } catch {}
      } else {
        // If Firestore has no installments yet for this user, check local backup or restore Honda Pilot
        const localSaved = localStorage.getItem(`subtrack_backup_installments_${user.uid}`) || localStorage.getItem('subtrack_installments');
        let initialList: Installment[] = [];
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
              initialList = parsed.filter(i => !['inst_iphone', 'inst_macbook', 'inst_dyson'].includes(i.id));
            }
          } catch {}
        }
        
        // If user has not initialized or only had demo, restore Honda Pilot permanently into Firestore
        if (initialList.length === 0 && localStorage.getItem('subtrack_installments_initialized') !== 'true') {
          initialList = [{ ...HONDA_PILOT_INSTALLMENT, uid: user.uid }];
        }
        
        if (initialList.length > 0) {
          setInstallments(initialList);
          initialList.forEach(instItem => {
            const itemToSave = { ...instItem, uid: user.uid };
            setDoc(doc(db, 'installments', instItem.id), itemToSave, { merge: true }).catch(() => {});
          });
          try {
            localStorage.setItem(`subtrack_backup_installments_${user.uid}`, JSON.stringify(initialList));
            localStorage.setItem('subtrack_installments', JSON.stringify(initialList));
            localStorage.setItem('subtrack_installments_initialized', 'true');
          } catch {}
        } else {
          setInstallments([]);
          try {
            localStorage.setItem('subtrack_installments', JSON.stringify([]));
          } catch {}
        }
      }
    }, (error) => {
      console.error('Installments onSnapshot error:', error);
      try {
        const backup = localStorage.getItem(`subtrack_backup_installments_${user.uid}`) || localStorage.getItem('subtrack_installments');
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(item => !['inst_iphone', 'inst_macbook', 'inst_dyson'].includes(item?.id));
            if (filtered.length > 0) {
              setInstallments(filtered);
            }
          }
        }
      } catch {}
      console.warn('Installments onSnapshot fallback to local state:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Regular Payments Listener (Kira, elektrik, su, doğalgaz, telefon, kurumlara/kişilere ödemeler)
  useEffect(() => {
    if (!user) return;
    const collRef = collection(db, 'regularPayments');
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const allDocs = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() } as RegularPayment));
      const userPayments = allDocs.filter(p => !p.uid || p.uid === user.uid || (p as any).email === user.email || p.uid === user.email);

      if (userPayments.length > 0) {
        setRegularPayments(userPayments);
        try {
          localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(userPayments));
          localStorage.setItem('subtrack_regular_payments', JSON.stringify(userPayments));
        } catch {}
      } else {
        // If Firestore is empty for this user, check local storage or seed initial items
        const localSaved = localStorage.getItem(`subtrack_backup_regular_payments_${user.uid}`) || localStorage.getItem('subtrack_regular_payments');
        let initialList: RegularPayment[] = [];
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialList = parsed;
            }
          } catch {}
        }

        if (initialList.length === 0 && localStorage.getItem('subtrack_regular_payments_initialized') !== 'true') {
          initialList = SEED_REGULAR_PAYMENTS.map(item => ({ ...item, uid: user.uid }));
        }

        if (initialList.length > 0) {
          setRegularPayments(initialList);
          initialList.forEach(item => {
            const itemToSave = { ...item, uid: user.uid };
            setDoc(doc(db, 'regularPayments', item.id), itemToSave, { merge: true }).catch(() => {});
          });
          try {
            localStorage.setItem(`subtrack_backup_regular_payments_${user.uid}`, JSON.stringify(initialList));
            localStorage.setItem('subtrack_regular_payments', JSON.stringify(initialList));
            localStorage.setItem('subtrack_regular_payments_initialized', 'true');
          } catch {}
        }
      }
    }, (error) => {
      console.warn('Regular payments onSnapshot warning:', error);
      try {
        const backup = localStorage.getItem(`subtrack_backup_regular_payments_${user.uid}`) || localStorage.getItem('subtrack_regular_payments');
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRegularPayments(parsed);
          }
        }
      } catch {}
    });

    return () => unsubscribe();
  }, [user]);

  // Incomes Listener
  useEffect(() => {
    if (!user) return;
    const collRef = collection(db, 'incomes');
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as IncomeItem));
      const userDocs = allDocs.filter(i => !i.uid || i.uid === user.uid || (i as any).email === user.email || i.uid === user.email);
      if (userDocs.length > 0) {
        setIncomes(userDocs);
        try {
          localStorage.setItem(`subtrack_backup_incomes_${user.uid}`, JSON.stringify(userDocs));
          localStorage.setItem('subtrack_incomes', JSON.stringify(userDocs));
          localStorage.setItem('subtrack_incomes_initialized', 'true');
        } catch {}
      } else {
        const isInit = localStorage.getItem('subtrack_incomes_initialized');
        if (isInit === 'true') {
          // User intentionally deleted all incomes
          setIncomes([]);
          try {
            localStorage.setItem('subtrack_incomes', JSON.stringify([]));
            if (user) {
              localStorage.setItem(`subtrack_backup_incomes_${user.uid}`, JSON.stringify([]));
            }
          } catch {}
        } else {
          // First time initialization with seed
          const initialList = SEED_INCOMES.map(item => ({ ...item, uid: user.uid }));
          setIncomes(initialList);
          initialList.forEach(item => {
            setDoc(doc(db, 'incomes', item.id), { ...item, uid: user.uid }, { merge: true }).catch(() => {});
          });
          try {
            localStorage.setItem(`subtrack_backup_incomes_${user.uid}`, JSON.stringify(initialList));
            localStorage.setItem('subtrack_incomes', JSON.stringify(initialList));
            localStorage.setItem('subtrack_incomes_initialized', 'true');
          } catch {}
        }
      }
    }, () => {});

    return () => unsubscribe();
  }, [user]);

  // Savings Listener
  useEffect(() => {
    if (!user) return;
    const collRef = collection(db, 'savings');
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      let deletedIds: string[] = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem('subtrack_deleted_savings_ids') || '[]');
      } catch {}

      const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavingsTarget));
      const userDocs = allDocs
        .filter(s => !s.uid || s.uid === user.uid || (s as any).email === user.email || s.uid === user.email)
        .filter(s => !deletedIds.includes(s.id));

      if (userDocs.length > 0) {
        setSavings(userDocs);
        try {
          localStorage.setItem(`subtrack_backup_savings_${user.uid}`, JSON.stringify(userDocs));
          localStorage.setItem('subtrack_savings', JSON.stringify(userDocs));
          localStorage.setItem('subtrack_savings_initialized', 'true');
        } catch {}
      } else {
        const isInit = localStorage.getItem('subtrack_savings_initialized');
        if (isInit === 'true' || deletedIds.length > 0) {
          // User intentionally deleted saving goals
          setSavings([]);
          try {
            localStorage.setItem('subtrack_savings', JSON.stringify([]));
            if (user) {
              localStorage.setItem(`subtrack_backup_savings_${user.uid}`, JSON.stringify([]));
            }
          } catch {}
        } else {
          // First time initialization with seed
          const initialList = SEED_SAVINGS
            .filter(item => !deletedIds.includes(item.id))
            .map(item => ({ ...item, uid: user.uid }));
          setSavings(initialList);
          initialList.forEach(item => {
            setDoc(doc(db, 'savings', item.id), { ...item, uid: user.uid }, { merge: true }).catch(() => {});
          });
          try {
            localStorage.setItem(`subtrack_backup_savings_${user.uid}`, JSON.stringify(initialList));
            localStorage.setItem('subtrack_savings', JSON.stringify(initialList));
            localStorage.setItem('subtrack_savings_initialized', 'true');
          } catch {}
        }
      }
    }, () => {});

    return () => unsubscribe();
  }, [user]);

  // Tax Profile Listener
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'taxProfiles', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as TaxProfile;
        setTaxProfile(data);
        try {
          localStorage.setItem(`subtrack_backup_tax_${user.uid}`, JSON.stringify(data));
          localStorage.setItem('subtrack_tax_profile', JSON.stringify(data));
        } catch {}
      } else {
        const local = localStorage.getItem(`subtrack_backup_tax_${user.uid}`) || localStorage.getItem('subtrack_tax_profile');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed && typeof parsed === 'object') {
              setTaxProfile(parsed);
              setDoc(docRef, { ...parsed, uid: user.uid }, { merge: true }).catch(() => {});
            }
          } catch {}
        } else {
          setDoc(docRef, { ...SEED_TAX_PROFILE, uid: user.uid }, { merge: true }).catch(() => {});
        }
      }
    }, () => {});

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

  const monthlyRegularTotal = useMemo(() => {
    return regularPayments
      .filter(p => p.status === 'active')
      .reduce((acc, curr) => {
        if (curr.frequency === 'quarterly') return acc + (curr.amount / 3);
        if (curr.frequency === 'annual') return acc + (curr.amount / 12);
        return acc + curr.amount;
      }, 0);
  }, [regularPayments]);

  const monthlyInstallmentsTotal = useMemo(() => {
    return installments
      .filter(i => i.status === 'active')
      .reduce((acc, curr) => acc + (curr.monthlyAmount || 0), 0);
  }, [installments]);

  const totalAllMonthly = useMemo(() => {
    return monthlyTotal + monthlyRegularTotal + monthlyInstallmentsTotal;
  }, [monthlyTotal, monthlyRegularTotal, monthlyInstallmentsTotal]);

  const categoryData = useMemo(() => {
    const data: { [key: string]: number } = {};
    subscriptions.forEach(sub => {
      if (sub.status === 'cancelled') return;
      const amount = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
      const localizedCat = getLocalizedCategoryName(sub.category, t) || t('cat_other');
      data[localizedCat] = (data[localizedCat] || 0) + amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [subscriptions, t]);

  const upcomingBills = useMemo(() => {
    return [...subscriptions]
      .filter(s => s.status === 'active')
      .sort((a, b) => parseISO(a.nextPaymentDate).getTime() - parseISO(b.nextPaymentDate).getTime())
      .slice(0, 5);
  }, [subscriptions]);

  const monthlyHistoryData = useMemo(() => {
    const monthKeysSet = new Set<string>();
    const now = new Date();
    // Default to the last 5 months plus current month
    for (let i = -5; i <= 0; i++) {
      const d = addMonths(now, i);
      monthKeysSet.add(format(d, 'yyyy-MM'));
    }

    allPayments.forEach(p => {
      if (p.date) {
        try {
          const d = parseISO(p.date);
          if (!isNaN(d.getTime())) {
            monthKeysSet.add(format(d, 'yyyy-MM'));
          }
        } catch {}
      }
    });

    const currentMKey = format(now, 'yyyy-MM');
    const sortedMonthKeys = Array.from(monthKeysSet).sort();

    return sortedMonthKeys.map(mKey => {
      const [y, m] = mKey.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      const label = format(d, 'MMM yyyy');

      // Actual recorded payments for this month
      const mPayments = allPayments.filter(p => p.date && p.date.startsWith(mKey));
      const paymentsSum = mPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const topupsThisMonth = mPayments
        .filter(p => p.type === 'topup')
        .reduce((acc, p) => acc + (p.amount || 0), 0);

      // Subscriptions
      const subsActual = paymentsSum;
      const subsPlanned = monthlyTotal + topupsThisMonth;
      // In actual mode, if recorded payments exist for this month, use them (matching MonthDetailModal)
      const subsTotal = trendMode === 'actual'
        ? (paymentsSum > 0 ? paymentsSum : (mKey === currentMKey ? monthlyTotal : 0))
        : subsPlanned;

      // Regular payments
      const regularPlanned = monthlyRegularTotal;
      const regularPaid = regularPayments
        .filter(p => p.status === 'active' && ((p.paidMonths && p.paidMonths.includes(mKey)) || (p.lastPaidMonth === mKey)))
        .reduce((acc, curr) => {
          if (curr.frequency === 'quarterly') return acc + (curr.amount / 3);
          if (curr.frequency === 'annual') return acc + (curr.amount / 12);
          if (curr.frequency === 'bimonthly') return acc + (curr.amount / 2);
          return acc + (curr.amount || 0);
        }, 0);
      const regularTotal = trendMode === 'actual' ? (regularPaid > 0 ? regularPaid : regularPlanned) : regularPlanned;

      // Installments
      const installmentsPlanned = monthlyInstallmentsTotal;
      const installmentsPaid = installments
        .filter(i => i.status === 'active' && i.lastPaidMonth === mKey)
        .reduce((acc, curr) => acc + (curr.monthlyAmount || 0), 0);
      const installmentsTotal = trendMode === 'actual' ? (installmentsPaid > 0 ? installmentsPaid : installmentsPlanned) : installmentsPlanned;

      let value = subsTotal;
      if (trendFilter === 'all') {
        value = Number((subsTotal + regularTotal + installmentsTotal).toFixed(2));
      } else if (trendFilter === 'regular') {
        value = Number(regularTotal.toFixed(2));
      } else if (trendFilter === 'installments') {
        value = Number(installmentsTotal.toFixed(2));
      } else {
        value = Number(subsTotal.toFixed(2));
      }

      return {
        key: mKey,
        name: label,
        value,
        subsTotal: Number(subsTotal.toFixed(2)),
        subsActual: Number(subsActual.toFixed(2)),
        subsPlanned: Number(subsPlanned.toFixed(2)),
        regularTotal: Number(regularTotal.toFixed(2)),
        regularPaid: Number(regularPaid.toFixed(2)),
        regularPlanned: Number(regularPlanned.toFixed(2)),
        installmentsTotal: Number(installmentsTotal.toFixed(2)),
        installmentsPaid: Number(installmentsPaid.toFixed(2)),
        installmentsPlanned: Number(installmentsPlanned.toFixed(2))
      };
    });
  }, [allPayments, monthlyTotal, monthlyRegularTotal, monthlyInstallmentsTotal, regularPayments, installments, trendFilter, trendMode]);

  const statsComparison = useMemo(() => {
    if (monthlyHistoryData.length < 2) {
      return { currentTotal: 0, lastTotal: 0, diff: 0, percent: 0, isHigher: false };
    }
    const current = monthlyHistoryData[monthlyHistoryData.length - 1]?.value || 0;
    const last = monthlyHistoryData[monthlyHistoryData.length - 2]?.value || 0;
    const diff = current - last;
    const percent = last > 0 ? (diff / last) * 100 : 0;
    return {
      currentTotal: current,
      lastTotal: last,
      diff,
      percent,
      isHigher: diff > 0
    };
  }, [monthlyHistoryData]);

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
      title: t('deleteSubscriptionTitle'),
      message: `${subToDelete?.name ? `"${subToDelete.name}" - ` : ''}${t('deleteSubscriptionMsg')}`,
      confirmText: t('delete'),
      variant: 'danger',
      onConfirm: async () => {
        // Record deleted id to persistent tombstone
        try {
          const currentDeleted: string[] = JSON.parse(localStorage.getItem('subtrack_deleted_subscriptions') || '[]');
          if (!currentDeleted.includes(id)) {
            currentDeleted.push(id);
            localStorage.setItem('subtrack_deleted_subscriptions', JSON.stringify(currentDeleted));
          }
        } catch {}

        // 1. Immediately update local state & cache so deletion reflects right away
        setSubscriptions(prev => {
          const next = prev.filter(s => s.id !== id);
          try {
            localStorage.setItem('subtrack_subscriptions', JSON.stringify(next));
            if (user) {
              localStorage.setItem(`subtrack_backup_subscriptions_${user.uid}`, JSON.stringify(next));
            }
          } catch {}
          return next;
        });

        // 2. Remove associated payments
        setAllPayments(prev => {
          const next = prev.filter(p => p.subscriptionId !== id);
          try {
            localStorage.setItem('subtrack_payments', JSON.stringify(next));
          } catch {}
          return next;
        });

        // 3. Remove calendar event if connected
        try {
          const token = getCachedAccessToken();
          if (token && subToDelete?.calendarEventId) {
            const calId = profile?.calendarSettings?.calendarId || 'primary';
            await deleteGoogleCalendarEvent(token, calId, subToDelete.calendarEventId).catch(console.error);
          }
        } catch {}

        // 4. Delete from Firestore if exists
        try {
          await deleteDoc(doc(db, 'subscriptions', id));
        } catch (error) {
          console.warn('Could not delete from Firestore (might be local item or network offline):', error);
        }
      }
    });
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setIsModalOpen(true);
  };

  const handleSaveSubscription = (savedSub: Subscription) => {
    const targetSub = cleanSubscriptionPayload(savedSub, user?.uid || DEFAULT_PROFILE.uid);

    // Remove from deleted tombstone if it was re-added
    try {
      const currentDeleted: string[] = JSON.parse(localStorage.getItem('subtrack_deleted_subscriptions') || '[]');
      const filtered = currentDeleted.filter(d => d !== targetSub.id);
      localStorage.setItem('subtrack_deleted_subscriptions', JSON.stringify(filtered));
    } catch {}

    setSubscriptions(prev => {
      const exists = prev.some(s => s.id === targetSub.id);
      const next = exists ? prev.map(s => s.id === targetSub.id ? targetSub : s) : [targetSub, ...prev];
      try {
        localStorage.setItem('subtrack_subscriptions', JSON.stringify(next));
        if (user) {
          localStorage.setItem(`subtrack_backup_subscriptions_${user.uid}`, JSON.stringify(next));
          localStorage.setItem(`subtrack_initialized_${user.uid}`, 'true');
        }
      } catch {}
      return next;
    });

    if (user) {
      setDoc(doc(db, 'subscriptions', targetSub.id), targetSub, { merge: true }).catch((err) => {
        console.warn('Could not sync saved subscription to firestore:', err);
      });
    }
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
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const isPaidThisMonth = Boolean(
        allPayments.some(p => p.subscriptionId === sub.id && p.date?.startsWith(currentMonthStr) && p.status === 'paid') ||
        sub.lastPaidMonth === currentMonthStr ||
        sub.isPaid
      );
      const isSubPaid = Boolean(isPaidThisMonth);

      const result = await syncEventToGoogleCalendar(
        token,
        calId,
        {
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          currency: profile?.currency || 'CAD',
          category: sub.category,
          billingCycle: sub.billingCycle,
          nextPaymentDate: sub.nextPaymentDate,
          status: sub.status,
          note: sub.note,
          isAutoPayment: sub.isAutoPayment,
          isPaid: isSubPaid
        },
        sub.calendarEventId
      );

      const updatedSub = {
        ...sub,
        calendarEventId: result.eventId,
        calendarSyncedAt: new Date().toISOString()
      };

      setSubscriptions(prev => prev.map(s => s.id === sub.id ? updatedSub : s));

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
      for (const demoInstId of ['inst_iphone', 'inst_macbook', 'inst_dyson']) {
        await deleteDoc(doc(db, 'installments', demoInstId)).catch(() => {});
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

  const handleRestoreDefaultSubscriptions = async () => {
    confirm({
      title: t('restoreDefaults'),
      message: t('restoreDefaultsConfirm'),
      confirmText: t('confirm', 'Onayla'),
      variant: 'info',
      onConfirm: async () => {
        try {
          localStorage.removeItem('subtrack_deleted_subscriptions');
        } catch {}

        const existingNames = new Set(subscriptions.map(s => (s.name || '').toLowerCase().trim()));
        const toAdd = SEED_SUBSCRIPTIONS.filter(s => !existingNames.has((s.name || '').toLowerCase().trim()));

        const newItems: Subscription[] = toAdd.map(item => ({
          ...item,
          uid: user?.uid || DEFAULT_PROFILE.uid,
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        }));
        const newSubs = [...newItems, ...subscriptions];

        // Set state immediately in one clean batch
        setSubscriptions(newSubs);
        try {
          localStorage.setItem('subtrack_subscriptions', JSON.stringify(newSubs));
          if (user) {
            localStorage.setItem(`subtrack_backup_subscriptions_${user.uid}`, JSON.stringify(newSubs));
            localStorage.setItem(`subtrack_initialized_${user.uid}`, 'true');
          }
        } catch {}

        if (user) {
          newItems.forEach(item => {
            setDoc(doc(db, 'subscriptions', item.id), item, { merge: true }).catch(() => {});
          });
        }

        if (allPayments.length <= 1) {
          setAllPayments(SEED_PAYMENTS);
          try {
            localStorage.setItem('subtrack_payments', JSON.stringify(SEED_PAYMENTS));
          } catch {}
        }

        alert(t('restoreDefaultsSuccess'));
      }
    });
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 flex flex-col lg:flex-row transition-colors">
          {/* Left Navigation Sidebar */}
          <AppSidebar 
            activeTab={activeMainTab}
            onSelectTab={setActiveMainTab}
            activeInstallmentsCount={installments.filter(i => i.status === 'active').length}
            activeRegularPaymentsCount={regularPayments.filter(p => p.status === 'active').length}
            incomesCount={incomes.filter(i => i.status !== 'paused').length}
            savingsCount={savings.length}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
          />

          {/* Right Main Content Column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">
            <AppHeader
              activeTab={activeMainTab}
              onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
              onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
              isCalendarSyncEnabled={Boolean(profile?.calendarSettings?.enabled)}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">{t('subscriptionDataLoading')}</p>
              </div>
            ) : !user ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 font-bold">
                  <CreditCard className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 dark:text-white">{t('manageSubscriptionsTitle')}</h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-lg mb-8">
                  {t('manageSubscriptionsSubtitle')}
                </p>
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/20 flex items-center gap-3 cursor-pointer"
                >
                  <LogIn className="w-6 h-6" />
                  <span>{t('loginOrContinue')}</span>
                </button>
              </div>
            ) : activeMainTab === 'dashboard' ? (
              <FinancialDashboardView
                incomes={incomes}
                savings={savings}
                taxProfile={taxProfile}
                subscriptions={subscriptions}
                installments={installments}
                regularPayments={regularPayments}
                currencyCode={profile?.currency || 'USD'}
                formatCurrency={formatCurrency}
                onOpenAddIncomeModal={() => {
                  setEditingIncome(null);
                  setIsIncomeModalOpen(true);
                }}
                onEditIncome={(inc) => {
                  setEditingIncome(inc);
                  setIsIncomeModalOpen(true);
                }}
                onDeleteIncome={handleDeleteIncome}
                onOpenAddSavingsModal={() => {
                  setEditingSavings(null);
                  setIsSavingsModalOpen(true);
                }}
                onEditSavings={(sav) => {
                  setEditingSavings(sav);
                  setIsSavingsModalOpen(true);
                }}
                onDeleteSavings={handleDeleteSavings}
                onOpenTaxSettingsModal={() => setIsTaxModalOpen(true)}
                onGoToSubscriptions={() => setActiveMainTab('subscriptions')}
                onGoToInstallments={() => setActiveMainTab('installments')}
                onGoToRegularPayments={() => setActiveMainTab('regularPayments')}
                onGoToIncomeSources={() => setActiveMainTab('incomeSources')}
                onGoToSavingsFunds={() => setActiveMainTab('savingsFunds')}
                onGoToTaxCenter={() => setActiveMainTab('tax')}
              />
            ) : activeMainTab === 'incomeSources' ? (
              <MonthlyIncomeSourcesView
                incomes={incomes}
                taxProfile={taxProfile}
                currencyCode={profile?.currency || 'USD'}
                formatCurrency={formatCurrency}
                onOpenAddIncomeModal={() => {
                  setEditingIncome(null);
                  setIsIncomeModalOpen(true);
                }}
                onEditIncome={(inc) => {
                  setEditingIncome(inc);
                  setIsIncomeModalOpen(true);
                }}
                onDeleteIncome={handleDeleteIncome}
                onOpenTaxSettingsModal={() => setIsTaxModalOpen(true)}
              />
            ) : activeMainTab === 'savingsFunds' ? (
              <SavingsTargetFundsView
                savings={savings}
                currencyCode={profile?.currency || 'USD'}
                formatCurrency={formatCurrency}
                onOpenAddSavingsModal={() => {
                  setEditingSavings(null);
                  setIsSavingsModalOpen(true);
                }}
                onEditSavings={(sav) => {
                  setEditingSavings(sav);
                  setIsSavingsModalOpen(true);
                }}
                onDeleteSavings={handleDeleteSavings}
                onUpdateSavingsAmount={(id, newAmount) => {
                  const target = savings.find(s => s.id === id);
                  if (target) {
                    handleSaveSavings({
                      ...target,
                      currentAmount: newAmount
                    });
                  }
                }}
              />
            ) : activeMainTab === 'installments' ? (
              <InstallmentsView
                installments={installments}
                currencyCode={profile?.currency || 'USD'}
                formatCurrency={formatCurrency}
                onOpenAddModal={() => {
                  setEditingInstallment(null);
                  setIsInstallmentModalOpen(true);
                }}
                onEditInstallment={(inst) => {
                  setEditingInstallment(inst);
                  setIsInstallmentModalOpen(true);
                }}
                onDeleteInstallment={handleDeleteInstallment}
                onPayInstallment={handlePayInstallment}
                onUndoPayment={handleUndoPayment}
                onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
                onSyncInstallmentToCalendar={handleSyncSingleInstallment}
                syncingCalendarId={syncingCalendarInstallmentId}
                payingInstallmentId={payingInstallmentId}
                onSetAutoPayment={handleSetAutoPayment}
                onToggleAutoPayment={handleToggleAutoPayment}
              />
            ) : activeMainTab === 'regularPayments' ? (
              <RegularPaymentsView
                payments={regularPayments}
                currencyCode={profile?.currency || 'USD'}
                formatCurrency={formatCurrency}
                onOpenAddModal={() => {
                  setEditingRegularPayment(null);
                  setIsRegularPaymentModalOpen(true);
                }}
                onEditPayment={(payment) => {
                  setEditingRegularPayment(payment);
                  setIsRegularPaymentModalOpen(true);
                }}
                onDeletePayment={handleDeleteRegularPayment}
                onPayPayment={handlePayRegularPayment}
                onUndoPayment={handleUndoRegularPayment}
                onSetAutoPayment={handleSetRegularPaymentAutoPayment}
                onToggleAutoPayment={handleToggleRegularPaymentAutoPayment}
                onSyncToCalendar={handleSyncRegularPaymentToCalendar}
                syncingCalendarId={syncingCalendarPaymentId}
                payingPaymentId={payingRegularPaymentId}
                onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
              />
            ) : activeMainTab === 'tax' ? (
              <TaxCenterView
                taxProfile={taxProfile}
                onSaveTaxProfile={handleSaveTaxProfile}
                taxYearRecords={taxYearRecords}
                onSaveTaxYearRecord={handleSaveTaxYearRecord}
                onDeleteTaxYearRecord={handleDeleteTaxYearRecord}
                currencyCode={profile?.currency || 'USD'}
                formatCurrency={formatCurrency}
                onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
              />
            ) : activeMainTab === 'settings' ? (
              <SettingsView
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
                onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                onRestoreDefaults={handleRestoreDefaultSubscriptions}
              />
            ) : (
              <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight dark:text-white">{t('subscriptions')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('welcomeBack')}, {user.displayName?.split(' ')[0]}!</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button 
                      onClick={() => { setQuickAddSub(null); setIsQuickAddOpen(true); }}
                      disabled={subscriptions.length === 0}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-200 dark:shadow-none cursor-pointer"
                      title={t('extraSpendingTooltip')}
                    >
                      <Plus className="w-5 h-5" />
                      <span>{t('extraSpending')}</span>
                    </button>
                    <button 
                      onClick={() => setIsCalendarModalOpen(true)}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm cursor-pointer"
                      title={t('googleCalendarTooltip')}
                    >
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="hidden sm:inline">{t('googleCalendar')}</span>
                      <span className="sm:hidden">{t('syncCalendar')}</span>
                      {profile?.calendarSettings?.enabled && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </button>
                    <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm cursor-pointer"
                      title={t('importTooltip')}
                    >
                      <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span>{t('import')}</span>
                    </button>
                    <button 
                      onClick={() => setIsExportModalOpen(true)}
                      disabled={subscriptions.length === 0 && allPayments.length === 0}
                      className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title={t('exportTooltip')}
                    >
                      <Download className="w-5 h-5" />
                      <span>{t('export')}</span>
                    </button>
                    <button 
                      onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
                      className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-blue-900/20 cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                      <span>{t('newSubscription')}</span>
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
                            {t('demoDataDetected').replace('{count}', String(demoSubscriptions.length))}
                          </h4>
                          <span className="px-2 py-0.5 bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-md text-[10px] font-bold">
                            {t('demoTag')}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 max-w-2xl leading-relaxed">
                          {t('demoDataSubtitle')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={() => {
                          confirm({
                            title: t('cleanDemoConfirmTitle'),
                            message: t('cleanDemoConfirmMsg').replace('{count}', String(demoSubscriptions.length)),
                            confirmText: t('cleanDemoConfirmBtn'),
                            onConfirm: handleDeleteAllDemoData
                          });
                        }}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/20 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{t('clearDemoData')} ({demoSubscriptions.length})</span>
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
                          {t('subscriptionListEmpty')}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
                          {t('subscriptionListEmptyPrompt')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
                      <button
                        onClick={handleScanAndRecoverAll}
                        disabled={isScanningStorage}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                        title={t('scanStorageTooltip')}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isScanningStorage && "animate-spin")} />
                        <span>{isScanningStorage ? t('scanningCache') : t('scanCache')}</span>
                      </button>
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t('importFromBackupShort')}</span>
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
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('monthlyBudget')}</span>
                      </div>
                      <p className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        {formatCurrency(monthlyTotal, profile?.currency)}
                      </p>
                      <div className="mt-6 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-bold bg-green-50/50 dark:bg-green-900/10 px-3 py-1.5 rounded-xl w-fit">
                        <TrendingUp className="w-4 h-4" />
                        <span>{subscriptions.length} {t('activeRegisteredServices')}</span>
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
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('categories')}</span>
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
                          <div className="flex items-center justify-center h-full text-xs text-gray-400 italic">{t('noData')}</div>
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
                          {duplicatePaymentsInfo.count} {t('duplicateRecordsDetected')}
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          {t('duplicateExplanation')} ({formatCurrency(duplicatePaymentsInfo.excessAmount, profile?.currency)}).
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
                      <span>{t('inspectRecordsAndClean')}</span>
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
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          trendFilter === 'subscriptions' ? "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400" :
                          trendFilter === 'regular' ? "bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400" :
                          trendFilter === 'installments' ? "bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400" :
                          "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400"
                        )}>
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white leading-tight">{t('monthlyTrends')}</h2>
                            {(() => {
                              const latestItem = monthlyHistoryData[monthlyHistoryData.length - 1];
                              let badgeText = '';
                              if (trendFilter === 'subscriptions') {
                                badgeText = trendMode === 'actual'
                                  ? `${t('subscriptions')} (${t('actualPaid')}): ${formatCurrency(latestItem?.subsActual || 0, profile?.currency)}`
                                  : `${t('subscriptions')} (${t('plannedBudget')}): ${formatCurrency(monthlyTotal, profile?.currency)}`;
                              } else if (trendFilter === 'regular') {
                                badgeText = trendMode === 'actual'
                                  ? `${t('regularPayments')} (${t('actualPaid')}): ${formatCurrency(latestItem?.regularPaid || 0, profile?.currency)}`
                                  : `${t('regularPayments')} (${t('plannedBudget')}): ${formatCurrency(monthlyRegularTotal, profile?.currency)}`;
                              } else if (trendFilter === 'installments') {
                                badgeText = trendMode === 'actual'
                                  ? `${t('installments')} (${t('actualPaid')}): ${formatCurrency(latestItem?.installmentsPaid || 0, profile?.currency)}`
                                  : `${t('installments')} (${t('plannedBudget')}): ${formatCurrency(monthlyInstallmentsTotal, profile?.currency)}`;
                              } else {
                                badgeText = trendMode === 'actual'
                                  ? `${t('total')} (${t('actualPaid')}): ${formatCurrency(latestItem?.value || 0, profile?.currency)}`
                                  : `${t('total')} (${t('plannedBudget')}): ${formatCurrency(totalAllMonthly, profile?.currency)}`;
                              }
                              return (
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[11px] font-extrabold",
                                  trendFilter === 'subscriptions' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300" :
                                  trendFilter === 'regular' ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300" :
                                  trendFilter === 'installments' ? "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300" :
                                  "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                                )}>
                                  {badgeText}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('monthlyTrendSubtitle')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Interactive Mode Selector: Gerçekleşen vs Planlanan */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl text-[11px] font-bold gap-1">
                          <button
                            type="button"
                            onClick={() => setTrendMode('actual')}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl transition-all cursor-pointer",
                              trendMode === 'actual'
                                ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 font-black shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                            title={t('actualPaid')}
                          >
                            {t('actualPaid')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendMode('planned')}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl transition-all cursor-pointer",
                              trendMode === 'planned'
                                ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-black shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                            title={t('plannedBudget')}
                          >
                            {t('plannedBudget')}
                          </button>
                        </div>

                        {/* Interactive Category Selector */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl text-[11px] font-bold gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setTrendFilter('subscriptions')}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1",
                              trendFilter === 'subscriptions'
                                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                            title={`${t('subscriptions')} (${formatCurrency(monthlyTotal, profile?.currency)})`}
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>{t('subscriptions')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendFilter('regular')}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1",
                              trendFilter === 'regular'
                                ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-300 shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                            title={`${t('regularPayments')} (${formatCurrency(monthlyRegularTotal, profile?.currency)})`}
                          >
                            <Receipt className="w-3 h-3" />
                            <span>{t('regularPayments')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrendFilter('all')}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1",
                              trendFilter === 'all'
                                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-300 shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                            title={`${t('all')} (${formatCurrency(totalAllMonthly, profile?.currency)})`}
                          >
                            <Layers className="w-3 h-3" />
                            <span>{t('all')}</span>
                          </button>
                        </div>

                        {statsComparison.lastTotal > 0 && (
                          <div className={cn(
                            "px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shrink-0",
                            statsComparison.isHigher ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400"
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
                            title={t('inspectBreakdown')}
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('reviewBreakdown')}</span>
                          </button>
                        )}
                        {allPayments.length > 0 && (
                          <button 
                            onClick={() => setIsGlobalHistoryOpen(true)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all cursor-pointer"
                            title={t('allMonthlySummary')}
                          >
                            <ArrowUpDown className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4">
                    <div className="lg:border-r border-gray-50 dark:border-gray-800 p-5 space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('pastMonths')}</h3>
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
                              title={t('inspectMonthRecords')}
                            >
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-[11px] font-bold transition-colors", 
                                  idx === 0 
                                    ? (trendFilter === 'regular' ? "text-amber-600 dark:text-amber-400" :
                                       trendFilter === 'installments' ? "text-purple-600 dark:text-purple-400" :
                                       trendFilter === 'all' ? "text-emerald-600 dark:text-emerald-400" :
                                       "text-blue-600 dark:text-blue-400")
                                    : "text-gray-500 dark:text-gray-400"
                                )}>
                                  {data.name}
                                </span>
                                {idx === 0 && <span className="text-[9px] uppercase font-black tracking-tighter opacity-70">{t('latestMonth')}</span>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-gray-900 dark:text-white">{formatCurrency(data.value, profile?.currency)}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">{t('noDataAvailable')}</p>
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
                                content={({ active, payload, label }) => {
                                  if (!active || !payload || !payload.length) return null;
                                  const item = payload[0].payload as any;
                                  return (
                                    <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 text-xs space-y-1.5 min-w-[170px]">
                                      <p className="font-extrabold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-1">
                                        {label}
                                      </p>
                                      <div className={cn(
                                        "flex justify-between items-center font-black text-sm",
                                        trendFilter === 'regular' ? "text-amber-600 dark:text-amber-400" :
                                        trendFilter === 'installments' ? "text-purple-600 dark:text-purple-400" :
                                        trendFilter === 'all' ? "text-emerald-600 dark:text-emerald-400" :
                                        "text-blue-600 dark:text-blue-400"
                                      )}>
                                        <span>{t('total')}:</span>
                                        <span>{formatCurrency(item.value, profile?.currency)}</span>
                                      </div>
                                      {trendFilter === 'subscriptions' && (
                                        <div className="pt-1.5 space-y-1 text-[11px] text-gray-500 font-semibold border-t border-gray-100 dark:border-gray-800">
                                          <div className="flex justify-between">
                                            <span>{t('actualPaid')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.subsActual, profile?.currency)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>{t('plannedBudget')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.subsPlanned, profile?.currency)}</span>
                                          </div>
                                        </div>
                                      )}
                                      {trendFilter === 'regular' && (
                                        <div className="pt-1.5 space-y-1 text-[11px] text-gray-500 font-semibold border-t border-gray-100 dark:border-gray-800">
                                          <div className="flex justify-between">
                                            <span>{t('actualPaid')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.regularPaid, profile?.currency)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>{t('plannedBudget')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.regularPlanned, profile?.currency)}</span>
                                          </div>
                                        </div>
                                      )}
                                      {trendFilter === 'installments' && (
                                        <div className="pt-1.5 space-y-1 text-[11px] text-gray-500 font-semibold border-t border-gray-100 dark:border-gray-800">
                                          <div className="flex justify-between">
                                            <span>{t('actualPaid')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.installmentsPaid, profile?.currency)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>{t('plannedBudget')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.installmentsPlanned, profile?.currency)}</span>
                                          </div>
                                        </div>
                                      )}
                                      {trendFilter === 'all' && (
                                        <div className="pt-1.5 space-y-1 text-[11px] text-gray-500 font-semibold border-t border-gray-100 dark:border-gray-800">
                                          <div className="flex justify-between">
                                            <span>💳 {t('subscriptions')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.subsTotal, profile?.currency)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>🏠 {t('regularPayments')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.regularTotal, profile?.currency)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>🛍️ {t('installments')}:</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(item.installmentsTotal, profile?.currency)}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }}
                              />
                              <Bar 
                                dataKey="value" 
                                fill={
                                  trendFilter === 'subscriptions' ? '#3b82f6' :
                                  trendFilter === 'regular' ? '#f59e0b' :
                                  trendFilter === 'installments' ? '#a855f7' :
                                  '#10b981'
                                }
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                                animationDuration={1000}
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
                            <p className="font-medium text-[11px]">{t('trendChartPreparing')}</p>
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
                          <span>{hideInactive ? t('activeSubscriptions') : t('allSubscriptions')}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold">
                            {sortedSubscriptions.length}
                          </span>
                        </h2>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {inactiveCount > 0 && (
                          <button
                            type="button"
                            onClick={handleToggleHideInactive}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                              hideInactive
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 shadow-xs hover:bg-amber-500/20"
                                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-900"
                            )}
                          >
                            {hideInactive ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>{t('closedHidden')} ({inactiveCount})</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>{t('hideClosed')} ({inactiveCount})</span>
                              </>
                            )}
                          </button>
                        )}
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-r border-gray-100 dark:border-gray-800">
                            <ArrowUpDown className="w-3 h-3" />
                            <span>{t('sortBy')}</span>
                          </div>
                          <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as keyof Subscription)}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-transparent outline-none cursor-pointer"
                          >
                            <option value="nextPaymentDate">{t('nextDate')}</option>
                            <option value="name">{t('name')}</option>
                            <option value="amount">{t('amount')}</option>
                            <option value="category">{t('category')}</option>
                          </select>
                          <button 
                            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors mr-1 cursor-pointer"
                            title={`${t('sortBy')}: ${sortOrder}`}
                          >
                            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleRestoreDefaultSubscriptions}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 cursor-pointer shadow-xs"
                          title={t('restoreDefaults')}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{t('restoreDefaults')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Recovery Banner for Missing Subscriptions */}
                    {subscriptions.length > 0 && subscriptions.length <= 4 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                              {language === 'tr' ? 'Önceki abonelikleriniz kayıp mı oldu?' : 'Did previous subscriptions disappear?'}
                            </h4>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300">
                              {language === 'tr' ? 'Önceki abonelikleri (Netflix, Youtube vb.) tek tıkla geri getirebilirsiniz.' : 'You can restore previous subscriptions (Netflix, Youtube, etc.) with 1 click.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRestoreDefaultSubscriptions}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('restoreDefaults')}</span>
                        </button>
                      </motion.div>
                    )}

                    {sortedSubscriptions.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                          {sortedSubscriptions.map((sub) => (
                            <SubscriptionCard
                              key={sub.id}
                              sub={sub}
                              payments={allPayments.filter(p => p.subscriptionId === sub.id)}
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
                        <h3 className="text-xl font-bold mb-2 dark:text-white">{t('noSubscriptionsYet')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('addFirstSubscriptionDesc')}</p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button 
                            onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg cursor-pointer flex items-center gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            <span>{t('addFirstSubscription')}</span>
                          </button>
                          <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-5 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer flex items-center gap-2"
                            title={t('importBackupTitle')}
                          >
                            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>{t('importFromBackup')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar - Upcoming Bills */}
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                      <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      {t('upcomingBills')}
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
                                      ? t('limitDepleted')
                                      : daysRemaining < 0
                                        ? t('overdue')
                                        : daysRemaining === 0
                                          ? t('dueToday')
                                          : `${daysRemaining} ${t('daysRemaining')}`}
                                  </p>
                                </div>
                              </div>
                              <p className="font-black text-sm text-gray-900 dark:text-white">{formatCurrency(sub.amount, profile?.currency)}</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-gray-400 dark:text-gray-500 italic text-sm">
                          {t('noUpcomingBills')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
          </div>

          {/* Dialogs and Popups */}
          <AddEditModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            sub={editingSub} 
            onSave={handleSaveSubscription}
            existingSubscriptions={subscriptions}
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
            regularPayments={regularPayments}
            installments={installments}
            defaultCategory={trendFilter}
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
            payments={allPayments}
            installments={installments}
            regularPayments={regularPayments}
            onConfirmAction={confirm}
            onUpdateSubscription={(updatedSub) => {
              setSubscriptions(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
            }}
            onUpdateInstallment={(updatedInst) => {
              setInstallments(prev => prev.map(i => i.id === updatedInst.id ? updatedInst : i));
            }}
            onUpdateRegularPayment={(updatedReg) => {
              setRegularPayments(prev => prev.map(r => r.id === updatedReg.id ? updatedReg : r));
            }}
            onPayRegularPayment={handlePayRegularPayment}
            onPayInstallment={handlePayInstallment}
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

          <AddEditInstallmentModal
            isOpen={isInstallmentModalOpen}
            onClose={() => {
              setIsInstallmentModalOpen(false);
              setEditingInstallment(null);
            }}
            onSave={handleSaveInstallment}
            installment={editingInstallment}
            currencyCode={profile?.currency || 'USD'}
          />

          <AddEditRegularPaymentModal
            isOpen={isRegularPaymentModalOpen}
            onClose={() => {
              setIsRegularPaymentModalOpen(false);
              setEditingRegularPayment(null);
            }}
            onSave={handleSaveRegularPayment}
            payment={editingRegularPayment}
            currencyCode={profile?.currency || 'USD'}
          />

          <AddEditIncomeModal
            isOpen={isIncomeModalOpen}
            onClose={() => {
              setIsIncomeModalOpen(false);
              setEditingIncome(null);
            }}
            onSave={handleSaveIncome}
            income={editingIncome}
            currencyCode={profile?.currency || 'USD'}
          />

          <AddEditSavingsModal
            isOpen={isSavingsModalOpen}
            onClose={() => {
              setIsSavingsModalOpen(false);
              setEditingSavings(null);
            }}
            onSave={handleSaveSavings}
            savings={editingSavings}
            currencyCode={profile?.currency || 'USD'}
          />

          <TaxSettingsModal
            isOpen={isTaxModalOpen}
            onClose={() => setIsTaxModalOpen(false)}
            onSave={handleSaveTaxProfile}
            taxProfile={taxProfile}
            currencyCode={profile?.currency || 'USD'}
          />

          <NotificationSettingsModal 
            isOpen={isNotificationSettingsOpen} 
            onClose={() => setIsNotificationSettingsOpen(false)} 
          />
        </div>
      </ErrorBoundary>
    </AuthContext.Provider>
  );
}
