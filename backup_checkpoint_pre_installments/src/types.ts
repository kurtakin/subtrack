import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  currency: string;
  darkMode?: boolean;
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
