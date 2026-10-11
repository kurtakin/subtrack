import {
  Tv,
  Music,
  Zap,
  Wifi,
  Smartphone,
  Coffee,
  Dumbbell,
  ShoppingCart,
  Book,
  Shield,
  Cloud,
  Gamepad2,
  Car,
  Home,
  Heart,
  Briefcase,
  Tag
} from 'lucide-react';

export const CATEGORIES = [
  'Entertainment',
  'Utilities',
  'Software',
  'Health',
  'Finance',
  'Food',
  'Shopping',
  'Education',
  'Other'
];

export const CURRENCY_OPTIONS = [
  { code: 'TRY', symbol: '₺', name: 'Türk Lirası (TRY)' },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
];

export const getCurrencySymbol = (code: string = 'USD') => {
  return CURRENCY_OPTIONS.find(c => c.code === code)?.symbol || '$';
};

export const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (e) {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
  }
};

export const DEMO_KEYWORDS: string[] = [];

export const isDemoItem = (name: string): boolean => {
  return false;
};

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

export const ICON_OPTIONS = [
  { id: 'tv', icon: Tv, label: 'TV' },
  { id: 'music', icon: Music, label: 'Music' },
  { id: 'zap', icon: Zap, label: 'Utilities' },
  { id: 'wifi', icon: Wifi, label: 'Internet' },
  { id: 'smartphone', icon: Smartphone, label: 'Mobile' },
  { id: 'coffee', icon: Coffee, label: 'Food' },
  { id: 'dumbbell', icon: Dumbbell, label: 'Health' },
  { id: 'shopping-cart', icon: ShoppingCart, label: 'Shopping' },
  { id: 'book', icon: Book, label: 'Education' },
  { id: 'shield', icon: Shield, label: 'Security' },
  { id: 'cloud', icon: Cloud, label: 'Software' },
  { id: 'gamepad2', icon: Gamepad2, label: 'Gaming' },
  { id: 'car', icon: Car, label: 'Transport' },
  { id: 'home', icon: Home, label: 'Housing' },
  { id: 'heart', icon: Heart, label: 'Health' },
  { id: 'briefcase', icon: Briefcase, label: 'Work' },
  { id: 'tag', icon: Tag, label: 'Other' },
];

export const ICON_MAP: { [key: string]: any } = {
  tv: Tv,
  music: Music,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  coffee: Coffee,
  dumbbell: Dumbbell,
  'shopping-cart': ShoppingCart,
  book: Book,
  shield: Shield,
  cloud: Cloud,
  gamepad2: Gamepad2,
  car: Car,
  home: Home,
  heart: Heart,
  briefcase: Briefcase,
  tag: Tag,
};
