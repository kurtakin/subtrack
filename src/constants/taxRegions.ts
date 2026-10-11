/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { CountryTaxRegion } from '../types';

export interface TaxRegionInfo {
  code: CountryTaxRegion;
  countryName: string;
  flag: string;
  currency: string;
  filingDeadline: string; // Beyan son tarihi
  taxAuthority: string; // Vergi İdaresi (CRA, IRS, GİB vb.)
  refundPeriod: string; // İade alınma dönemi
  refundTips: string[];
  keyDates: { title: string; date: string; description: string }[];
}

export const COUNTRY_TAX_REGIONS: Record<CountryTaxRegion, TaxRegionInfo> = {
  CA: {
    code: 'CA',
    countryName: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    filingDeadline: 'April 30 (Individual) / June 15 (Self-Employed)',
    taxAuthority: 'CRA (Canada Revenue Agency)',
    refundPeriod: 'Usually within 2-4 weeks after filing',
    refundTips: [
      'RRSP contributions directly reduce taxable income and yield higher refunds.',
      'FHSA provides an annual $8,000 tax-deductible contribution limit.',
      'Medical expenses and charitable donations increase your eligible refund.',
      'Home office expenses can be claimed as a deduction for eligible remote workers.'
    ],
    keyDates: [
      { title: 'RRSP Contribution Deadline', date: 'March 1, 2026', description: 'Deadline to contribute for previous tax year deduction' },
      { title: 'Individual Filing Deadline', date: 'April 30, 2026', description: 'CRA personal income tax return and balance due' },
      { title: 'Self-Employed Filing Deadline', date: 'June 15, 2026', description: 'Return filing deadline for self-employed individuals' }
    ]
  },
  US: {
    code: 'US',
    countryName: 'United States (USA)',
    flag: '🇺🇸',
    currency: 'USD',
    filingDeadline: 'April 15 (Tax Day)',
    taxAuthority: 'IRS (Internal Revenue Service)',
    refundPeriod: 'Direct deposit within 21 days with e-file',
    refundTips: [
      '401(k) and Traditional IRA contributions reduce taxable income.',
      'Child Tax Credit and Earned Income Tax Credit (EITC) directly boost refund amounts.',
      'Education credits (AOTC and Lifetime Learning Credit) offer substantial tax savings.',
      'HSA (Health Savings Account) offers triple tax advantages.'
    ],
    keyDates: [
      { title: 'IRS Filing Season Opens', date: 'January 27, 2026', description: 'Electronic tax return acceptance begins' },
      { title: 'Tax Day (Deadline)', date: 'April 15, 2026', description: 'Form 1040 federal return filing deadline' },
      { title: 'Extension Deadline', date: 'October 15, 2026', description: 'Final date for taxpayers with 6-month extension' }
    ]
  },
  TR: {
    code: 'TR',
    countryName: 'Turkey',
    flag: '🇹🇷',
    currency: 'TRY',
    filingDeadline: 'March 31 (1st Installment) / July 31 (2nd Installment)',
    taxAuthority: 'GİB (Turkish Revenue Administration)',
    refundPeriod: 'Within 1-3 months following annual return review',
    refundTips: [
      'Taxes withheld at source are offset or refunded in annual income tax returns.',
      'Education and health expenses up to 10% of declared income can be deducted.',
      'Personal insurance and BES pension contributions are deductible within statutory limits.',
      'Actual expense method for rental income allows itemized expense deductions.'
    ],
    keyDates: [
      { title: 'Annual Income Tax Return', date: 'March 1 - 31, 2026', description: 'Return filing and 1st installment payment' },
      { title: '2nd Installment Payment', date: 'July 31, 2026', description: 'Second income tax installment due' },
      { title: 'Motor Vehicle Tax (MTV)', date: 'January & July 2026', description: 'Semi-annual vehicle tax periods' }
    ]
  },
  EU: {
    code: 'EU',
    countryName: 'European Union (Germany, France, Netherlands, etc.)',
    flag: '🇪🇺',
    currency: 'EUR',
    filingDeadline: 'May 31 - July 31 depending on member state',
    taxAuthority: 'National Tax Offices (Finanzamt, etc.)',
    refundPeriod: 'Average 6-12 weeks after filing',
    refundTips: [
      'Germany (Finanzamt): Average refund is ~€1,050 (commuter allowance Pendlerpauschale).',
      'Work-related expenses (Werbungskosten), relocation costs and courses yield refunds.',
      'Netherlands: Returns filed between April 1 and May 8 receive refunds before July 1.',
      'Childcare costs and charitable contributions can be deducted from tax base.'
    ],
    keyDates: [
      { title: 'EU Tax Season Opens', date: 'March 1, 2026', description: 'Pre-filled tax returns available for review' },
      { title: 'General Filing Deadline', date: 'July 31, 2026', description: 'Standard individual tax return submission deadline' },
      { title: 'Tax Advisor Extension', date: 'February 28, 2027', description: 'Extended deadline for returns prepared by certified tax advisors' }
    ]
  },
  UK: {
    code: 'UK',
    countryName: 'United Kingdom (UK)',
    flag: '🇬🇧',
    currency: 'GBP',
    filingDeadline: 'January 31 (Online Self Assessment)',
    taxAuthority: 'HMRC (HM Revenue and Customs)',
    refundPeriod: 'Usually within 2-4 weeks for online returns',
    refundTips: [
      'Self Assessment allows claiming employment expenses and private pension relief.',
      'Gift Aid donations can provide higher-rate tax relief.',
      'Business mileage allowance can be claimed if using personal vehicle for work.'
    ],
    keyDates: [
      { title: 'Tax Year End', date: 'April 5, 2026', description: 'Official end of the UK tax year' },
      { title: 'Paper Return Deadline', date: 'October 31, 2026', description: 'Postal paper tax return submission deadline' },
      { title: 'Online Self Assessment Deadline', date: 'January 31, 2027', description: 'Online tax return and balancing payment deadline' }
    ]
  },
  OTHER: {
    code: 'OTHER',
    countryName: 'Other Countries / International',
    flag: '🌐',
    currency: 'USD',
    filingDeadline: 'Varies by local tax jurisdiction',
    taxAuthority: 'Local Tax Authority',
    refundPeriod: 'According to local tax schedule',
    refundTips: [
      'Retain receipts and invoices for all deductible business expenses throughout the year.',
      'Check Double Taxation Agreements (DTA) between your countries of residence and income.',
      'Document pension and healthcare contributions to deduct from local taxable base.'
    ],
    keyDates: [
      { title: 'Fiscal Year End', date: 'December 31', description: 'Annual aggregation of income and business deductions' },
      { title: 'General Filing Period', date: 'April - June', description: 'Standard annual filing season in most jurisdictions' }
    ]
  }
};

const TURKISH_TAX_REGIONS: Record<CountryTaxRegion, TaxRegionInfo> = {
  CA: {
    code: 'CA',
    countryName: 'Kanada',
    flag: '🇨🇦',
    currency: 'CAD',
    filingDeadline: '30 Nisan (Bireysel) / 15 Haziran (Serbest Meslek)',
    taxAuthority: 'CRA (Kanada Vergi İdaresi)',
    refundPeriod: 'Genellikle beyandan sonra 2-4 hafta içinde',
    refundTips: [
      'RRSP (Emeklilik Birikimi) katkıları vergi matrahından doğrudan düşülür ve yüksek iade sağlar.',
      'FHSA (İlk Ev Birikimi) yıllık 8.000 CAD vergiden düşülebilir limit sağlar.',
      'Tıbbi harcamalar (Medical Expenses) ve hayır kurumu bağışları (Donations) iadeyi artırır.',
      'Evden çalışma (Home Office) giderleri çalışanlar için indirim konusu yapılabilir.'
    ],
    keyDates: [
      { title: 'RRSP Katkı Son Günü', date: '1 Mart 2026', description: 'Önceki yıl matrahından düşmek için son tarih' },
      { title: 'Bireysel Beyan Son Günü', date: '30 Nisan 2026', description: 'CRA gelir vergisi beyanı ve borç ödemesi' },
      { title: 'Self-Employed Beyan', date: '15 Haziran 2026', description: 'Serbest çalışanlar için beyan teslim tarihi' }
    ]
  },
  US: {
    code: 'US',
    countryName: 'Amerika Birleşik Devletleri',
    flag: '🇺🇸',
    currency: 'USD',
    filingDeadline: '15 Nisan (Tax Day)',
    taxAuthority: 'IRS (Amerikan Vergi Dairesi)',
    refundPeriod: 'Elektronik beyanla 21 gün içinde doğrudan hesaba',
    refundTips: [
      '401(k) ve Traditional IRA katkıları taxable income tutarını düşürür.',
      'Child Tax Credit ve Earned Income Tax Credit (EITC) iade tutarını doğrudan yükseltir.',
      'Eğitim kredileri (AOTC ve Lifetime Learning Credit) binlerce dolar vergi avantajı sağlar.',
      'HSA (Health Savings Account) üçlü vergi avantajı sunar.'
    ],
    keyDates: [
      { title: 'IRS Beyan Açılışı', date: '27 Ocak 2026', description: 'Elektronik vergi beyanlarının kabulü başlar' },
      { title: 'Tax Day (Son Gün)', date: '15 Nisan 2026', description: 'Form 1040 federal beyan son teslimi' },
      { title: 'Uzatma Son Günü', date: '15 Ekim 2026', description: 'Extension alanlar için son bildirim günü' }
    ]
  },
  TR: {
    code: 'TR',
    countryName: 'Türkiye',
    flag: '🇹🇷',
    currency: 'TRY',
    filingDeadline: '31 Mart (1. Taksit) / 31 Temmuz (2. Taksit)',
    taxAuthority: 'GİB (Gelir İdaresi Başkanlığı)',
    refundPeriod: 'Yıllık beyanname incelemesini takiben 1-3 ay içinde',
    refundTips: [
      'Stopaj yoluyla kesilen vergiler, yıllık gelir vergisi beyannamesinde mahsup veya iade edilir.',
      'Eğitim ve sağlık harcamaları beyan edilen gelirin %10’una kadar matrahtan indirilebilir.',
      'Şahıs sigorta ve BES katkı payları belirli oranlarda vergi matrahından düşülebilir.',
      'Kira geliri beyanında gerçek gider yöntemi tercih edilirse faturalı giderler gelirden düşülür.'
    ],
    keyDates: [
      { title: 'Yıllık Gelir Vergisi Beyanı', date: '1 - 31 Mart 2026', description: 'GİB Hazır Beyan üzerinden beyan ve 1. taksit' },
      { title: '2. Taksit Ödemesi', date: '31 Temmuz 2026', description: 'Gelir vergisi ikinci taksit ödemesi' },
      { title: 'MTV 1. ve 2. Taksit', date: 'Ocak ve Temmuz 2026', description: 'Motorlu Taşıtlar Vergisi dönemleri' }
    ]
  },
  EU: {
    code: 'EU',
    countryName: 'Avrupa Birliği',
    flag: '🇪🇺',
    currency: 'EUR',
    filingDeadline: 'Ülkeye göre 31 Mayıs - 31 Temmuz',
    taxAuthority: 'National Tax Offices (Finanzamt vb.)',
    refundPeriod: 'Beyandan sonra ortalama 6-12 hafta',
    refundTips: [
      'Almanya (Finanzamt): Ortalama vergi iadesi 1.050 € civarındadır (Pendlerpauschale yol giderleri).',
      'İşle ilgili harcamalar (Werbungskosten), taşınma masrafları ve profesyonel eğitimler iade sağlar.',
      'Hollanda: 1 Nisan - 8 Mayıs tarihleri arasında beyan verenler 1 Temmuz öncesi iade alır.',
      'Çocuk bakım masrafları ve bağışlar matrahtan indirilebilir.'
    ],
    keyDates: [
      { title: 'AB Vergi Sezonu Başlangıcı', date: '1 Mart 2026', description: 'Önceden doldurulmuş beyanların kontrolü' },
      { title: 'Genel Beyan Bitişi', date: '31 Temmuz 2026', description: 'Bireysel vergi beyannamesi teslim son tarihi' },
      { title: 'Vergi Danışmanlı Uzatma', date: '28 Şubat 2027', description: 'Steuerberater / Mali müşavirle yapılan beyanlar' }
    ]
  },
  UK: {
    code: 'UK',
    countryName: 'Birleşik Krallık',
    flag: '🇬🇧',
    currency: 'GBP',
    filingDeadline: '31 Ocak (Online Self Assessment)',
    taxAuthority: 'HMRC (İngiltere Vergi İdaresi)',
    refundPeriod: 'Online bildirimlerde 2-4 hafta içinde',
    refundTips: [
      'Self Assessment beyanında iş masrafları ve pension katkıları iade hakkı doğurur.',
      'Personal Allowance üst sınırına dikkat edilerek yardım bağışları (Gift Aid) beyan edilebilir.',
      'İş amaçlı araç kullanımı milaj indirimi (Mileage Allowance) sağlar.'
    ],
    keyDates: [
      { title: 'Mali Yıl Bitişi', date: '5 Nisan 2026', description: 'UK mali yılının resmi kapanışı' },
      { title: 'Kağıt Beyan', date: '31 Ekim 2026', description: 'Posta ile beyan gönderim son günü' },
      { title: 'Online Self Assessment', date: '31 Ocak 2027', description: 'Online beyan ve vergi ödemesi son tarihi' }
    ]
  },
  OTHER: {
    code: 'OTHER',
    countryName: 'Diğer Ülkeler / Uluslararası',
    flag: '🌐',
    currency: 'USD',
    filingDeadline: 'Yerel mevzuata göre değişken',
    taxAuthority: 'Yerel Vergi Otoritesi',
    refundPeriod: 'Yerel takvime göre',
    refundTips: [
      'Yıl boyunca yapılan işle ilgili gider makbuzlarını ve faturaları saklayın.',
      'Çifte vergilendirmeyi önleme anlaşmalarını (DTA) kontrol edin.',
      'Emeklilik ve sağlık prim ödemelerini vergi matrahından düşmek için belgeleyin.'
    ],
    keyDates: [
      { title: 'Yıl Sonu Mali Kapanış', date: '31 Aralık', description: 'Yıllık gelir ve harcamaların toplanması' },
      { title: 'Genel Beyan Dönemi', date: 'Nisan - Haziran', description: 'Standart yıllık beyan dönemi' }
    ]
  }
};

export function normalizeCountryCode(code: string | undefined | null): CountryTaxRegion {
  if (!code) return 'CA';
  const c = code.trim().toUpperCase();
  if (c === 'CA' || c === 'CANADA' || c === 'KANADA') return 'CA';
  if (c === 'US' || c === 'USA' || c === 'ABD' || c === 'UNITED STATES') return 'US';
  if (c === 'TR' || c === 'TURKEY' || c === 'TURKIYE' || c === 'TÜRKIYE') return 'TR';
  if (c === 'EU' || c === 'EUROPE' || c === 'AVRUPA') return 'EU';
  if (c === 'UK' || c === 'GB' || c === 'UNITED KINGDOM' || c === 'INGILTERE' || c === 'İNGİLTERE') return 'UK';
  return (['CA', 'US', 'TR', 'EU', 'UK'].includes(c) ? c : 'OTHER') as CountryTaxRegion;
}

export function getTaxRegion(code: CountryTaxRegion | string | undefined | null, lang: string = 'en'): TaxRegionInfo {
  const normalized = normalizeCountryCode(code as any);
  const dict = lang === 'tr' ? TURKISH_TAX_REGIONS : COUNTRY_TAX_REGIONS;
  return dict[normalized] || (lang === 'tr' ? TURKISH_TAX_REGIONS.OTHER : COUNTRY_TAX_REGIONS.OTHER) || COUNTRY_TAX_REGIONS.CA;
}

export function getAllTaxRegions(lang: string = 'en'): TaxRegionInfo[] {
  const dict = lang === 'tr' ? TURKISH_TAX_REGIONS : COUNTRY_TAX_REGIONS;
  return Object.values(dict);
}
