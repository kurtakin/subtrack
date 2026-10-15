import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  currency: string;
  darkMode?: boolean;
  phone?: string;
  location?: string;
  occupation?: string;
  bio?: string;
  monthlyBudget?: number;
  defaultPaymentMethod?: string;
  notificationSettings?: {
    browserNotifications: boolean;
    emailNotifications: boolean;
    notifyDaysBefore: number;
  };
  calendarSettings?: {
    enabled?: boolean;
    calendarId?: string;
    calendarName?: string;
    autoSync?: boolean;
    lastSyncedAt?: string;
    lastConnectedAt?: string;
  };
}

export interface Subscription {
  id: string;
  uid: string;
  name: string;
  amount: number;
  category: string;
  billingCycle: 'monthly' | 'yearly';
  nextPaymentDate: string;
  icon: string;
  status: 'active' | 'cancelled';
  lastNotified?: string;
  pricingType?: 'fixed' | 'usage_based' | 'hybrid';
  calendarEventId?: string;
  calendarSyncedAt?: string;
  isAutoPayment?: boolean;
  lastPaidMonth?: string;
  lastPaidDate?: string;
  note?: string;
}

export interface Payment {
  id: string;
  uid: string;
  subscriptionId: string;
  amount: number;
  date: string;
  status: 'paid' | 'failed' | 'pending';
  type?: 'regular' | 'topup';
  note?: string;
}

export interface Installment {
  id: string;
  uid: string;
  name: string; // Ürün veya hizmet adı, örn: "iPhone 16 Pro Max 256GB"
  store: string; // Satıcı / Firma, örn: "Apple Store", "Hepsiburada", "MediaMarkt"
  totalAmount: number; // Toplam tutar, örn: 2400
  monthlyAmount: number; // Aylık taksit tutarı, örn: 100
  totalInstallments: number; // Toplam taksit sayısı, örn: 24
  paidInstallments: number; // Şimdiye kadar ödenen taksit sayısı, örn: 8
  remainingInstallments: number; // Kalan taksit sayısı (totalInstallments - paidInstallments)
  startDate: string; // Taksit başlangıç tarihi (YYYY-MM-DD)
  nextPaymentDate: string; // Bu ayki / sıradaki taksit ödeme tarihi (YYYY-MM-DD)
  category: string; // Elektronik, Ev Eşyası, Mobilya, vb.
  bankOrCard?: string; // Kart veya Banka bilgisi (Garanti Bonus, World vb.)
  status: 'active' | 'completed'; // Aktif veya Tamamlandı
  note?: string;
  isAutoPayment?: boolean; // Otomatik ödeme talimatı aktif mi (True: Otomatik ödeme, False: Manuel ödeme)
  calendarEventId?: string;
  calendarEventIds?: string[]; // Google Calendar event IDs for each remaining monthly installment
  calendarEventMap?: Record<number, string>; // Maps installment number to its Google Calendar event ID
  calendarSyncedAt?: string;
  lastPaidDate?: string; // YYYY-MM-DD
  lastPaidMonth?: string; // YYYY-MM
  lastPaidInstallmentNumber?: number;
  createdAt?: string;
}

export type RegularPaymentCategory =
  | 'rent'
  | 'electricity'
  | 'water'
  | 'gas'
  | 'phone_internet'
  | 'dues'
  | 'person'
  | 'institution'
  | 'insurance'
  | 'other';

export interface RegularPayment {
  id: string;
  uid: string;
  name: string; // Örn: "Ev Kirası", "Elektrik (Enerjisa)", "Doğalgaz (İGDAŞ)", "Ahmet Bey Aylık Destek"
  category: RegularPaymentCategory;
  payee?: string; // Alıcı kişi veya kurum (örn: "Ev Sahibi Mehmet Bey", "İGDAŞ", "BEDAŞ")
  amount: number; // Aylık veya son fatura tutarı
  amountType: 'fixed' | 'variable'; // Sabit tutarlı (örn: Kira) mı, yoksa değişken fatura mı (örn: Elektrik)
  frequency: 'monthly' | 'irregular' | 'bimonthly' | 'quarterly' | 'annual'; // Düzenli aylık mı yoksa düzensiz/fatura geldikçe mi
  dueDay?: number; // Ayın kaçı (1-31)
  nextPaymentDate: string; // Sıradaki ödeme tarihi (YYYY-MM-DD)
  status: 'active' | 'paused' | 'cancelled';
  isAutoPayment?: boolean; // Otomatik ödeme talimatı aktif mi
  bankOrCard?: string; // Hangi karttan / hesaptan ödendiği
  accountOrSubscriberNo?: string; // Abone No, Tesisat No, IBAN vb.
  note?: string; // Not / açıklama
  lastPaidDate?: string; // YYYY-MM-DD
  lastPaidMonth?: string; // YYYY-MM
  paidMonths?: string[]; // Array of YYYY-MM strings for months marked as paid
  paymentHistory?: Array<{ month: string; date: string; amount: number; note?: string }>;
  calendarEventId?: string;
  calendarSyncedAt?: string;
  createdAt?: string;
}

export interface IncomeItem {
  id: string;
  uid: string;
  name: string; // Örn: "Maaş / Ana Gelir", "Freelance Projeler", "Yatırım Getirisi", "Kira Geliri", "Ek Gelir"
  category: 'salary' | 'freelance' | 'investment' | 'rental' | 'business' | 'bonus' | 'other';
  amount: number; // Aylık veya dönemsel tutar
  frequency: 'monthly' | 'biweekly' | 'irregular' | 'annual';
  receivedDay?: number; // Ayın kaçı (1-31)
  isRegular: boolean;
  status: 'active' | 'paused';
  currency?: string;
  note?: string;
  annualPayoutMonth?: number; // 1-12 for specific annual payout month, or undefined for evenly distributed
  targetMonth?: string; // YYYY-MM for irregular/one-time income in a specific month
  createdAt?: string;
}

export interface SavingsTarget {
  id: string;
  uid: string;
  title: string; // Örn: "Acil Durum Fonu (6 Aylık)", "Ev Peşinatı", "Tatil Birikimi", "Emeklilik Fonu"
  targetAmount: number; // Hedeflenen toplam birikim
  currentAmount: number; // Şu ana kadar biriken
  monthlyContribution: number; // Aylık birikime ayrılan miktar
  deadline?: string; // Hedef tarih (YYYY-MM-DD)
  category: 'emergency' | 'house' | 'vacation' | 'retirement' | 'investment' | 'vehicle' | 'other';
  createdAt?: string;
}

export type CountryTaxRegion = 'CA' | 'US' | 'TR' | 'EU' | 'UK' | 'OTHER';

export interface TaxProfile {
  id?: string;
  uid?: string;
  country: CountryTaxRegion;
  expectedAnnualTaxRefund: number; // Yıllık tahmini/alınan vergi iadesi
  actualReceivedTaxRefund?: number; // Gerçekleşen iade
  estimatedAnnualTaxPayable?: number; // Tahmini ödenecek vergi
  deductibleExpensesEstimate?: number; // Vergi matrahından düşülebilir tahmini giderler
  taxYear: number; // Örn: 2026
  taxPeriodReminderNote?: string;
  updatedAt?: string;
}

export interface TaxYearRecord {
  id: string;
  uid?: string;
  year: number; // Örn: 2026, 2025, 2024
  grossIncome: number; // Yıllık Brüt Gelir
  deductibleExpenses: number; // Düşülebilir Harcamalar / Katkılar
  taxPaid: number; // Ödenen / Kesilen Vergi
  taxRefund: number; // Alınan / Tahakkuk Eden Vergi İadesi
  effectiveTaxRate?: number; // Efektif Vergi Oranı %
  status: 'filed' | 'in_review' | 'pending' | 'refund_received';
  filingDate?: string; // Beyan Tarihi
  note?: string; // Açıklama / Vergi Dosyası Notu
  updatedAt?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  };
}

export interface AuthContextType {
  user: any;
  loading: boolean;
  profile: UserProfile | null;
  toggleDarkMode: () => void;
  darkMode: boolean;
  openAuthModal: () => void;
  signInWithLocalEmail?: (email: string, displayName?: string) => void;
}
