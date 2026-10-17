/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { CountryTaxRegion } from '../types';

export interface TaxKeyDate {
  id: string;
  title: string;
  date: string;
  isoDate?: string; // Standardized ISO YYYY-MM-DD date for strict calendar sync without hallucinating dates
  description: string;
}

export interface TaxRegionInfo {
  code: CountryTaxRegion;
  countryName: string;
  flag: string;
  currency: string;
  filingDeadline: string; // Beyan son tarihi
  taxAuthority: string; // Tax Authority (CRA, IRS, GIB etc.)
  refundPeriod: string; // Tax refund processing period
  refundTips: string[];
  keyDates: TaxKeyDate[];
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
      { id: 'ca_rrsp_deadline_2026', title: 'RRSP Contribution Deadline', date: 'March 1, 2026', isoDate: '2026-03-01', description: 'Deadline to contribute for previous tax year deduction' },
      { id: 'ca_individual_filing_2026', title: 'Individual Filing Deadline', date: 'April 30, 2026', isoDate: '2026-04-30', description: 'CRA personal income tax return and balance due' },
      { id: 'ca_self_employed_filing_2026', title: 'Self-Employed Filing Deadline', date: 'June 15, 2026', isoDate: '2026-06-15', description: 'Return filing deadline for self-employed individuals' }
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
      { id: 'us_irs_season_open_2026', title: 'IRS Filing Season Opens', date: 'January 27, 2026', isoDate: '2026-01-27', description: 'Electronic tax return acceptance begins' },
      { id: 'us_tax_day_2026', title: 'Tax Day (Deadline)', date: 'April 15, 2026', isoDate: '2026-04-15', description: 'Form 1040 federal return filing deadline' },
      { id: 'us_extension_deadline_2026', title: 'Extension Deadline', date: 'October 15, 2026', isoDate: '2026-10-15', description: 'Final date for taxpayers with 6-month extension' }
    ]
  },
  TR: {
    code: 'TR',
    countryName: 'Turkey',
    flag: '🇹🇷',
    currency: 'TRY',
    filingDeadline: 'March 31 (1st Installment) / July 31 (2nd Installment)',
    taxAuthority: 'GIB (Turkish Revenue Administration)',
    refundPeriod: 'Within 1-3 months following annual return review',
    refundTips: [
      'Taxes withheld at source are offset or refunded in annual income tax returns.',
      'Education and health expenses up to 10% of declared income can be deducted.',
      'Personal insurance and BES pension contributions are deductible within statutory limits.',
      'Actual expense method for rental income allows itemized expense deductions.'
    ],
    keyDates: [
      { id: 'tr_annual_return_2026', title: 'Annual Income Tax Return', date: 'March 1 - 31, 2026', isoDate: '2026-03-31', description: 'Return filing and 1st installment payment' },
      { id: 'tr_installment_2_2026', title: '2nd Installment Payment', date: 'July 31, 2026', isoDate: '2026-07-31', description: 'Second income tax installment due' },
      { id: 'tr_mtv_installment_1_2026', title: 'Motor Vehicle Tax (MTV)', date: 'January & July 2026', isoDate: '2026-01-31', description: 'Semi-annual vehicle tax periods' }
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
      { id: 'eu_tax_season_open_2026', title: 'EU Tax Season Opens', date: 'March 1, 2026', isoDate: '2026-03-01', description: 'Pre-filled tax returns available for review' },
      { id: 'eu_general_deadline_2026', title: 'General Filing Deadline', date: 'July 31, 2026', isoDate: '2026-07-31', description: 'Standard individual tax return submission deadline' },
      { id: 'eu_advisor_extension_2027', title: 'Tax Advisor Extension', date: 'February 28, 2027', isoDate: '2027-02-28', description: 'Extended deadline for returns prepared by certified tax advisors' }
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
      { id: 'uk_tax_year_end_2026', title: 'Tax Year End', date: 'April 5, 2026', isoDate: '2026-04-05', description: 'Official end of the UK tax year' },
      { id: 'uk_paper_return_2026', title: 'Paper Return Deadline', date: 'October 31, 2026', isoDate: '2026-10-31', description: 'Postal paper tax return submission deadline' },
      { id: 'uk_online_assessment_2027', title: 'Online Self Assessment Deadline', date: 'January 31, 2027', isoDate: '2027-01-31', description: 'Online tax return and balancing payment deadline' }
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
      { id: 'other_fiscal_year_end_2026', title: 'Fiscal Year End', date: 'December 31', isoDate: '2026-12-31', description: 'Annual aggregation of income and business deductions' },
      { id: 'other_general_filing_2026', title: 'General Filing Period', date: 'April - June', isoDate: '2026-06-30', description: 'Standard annual filing season in most jurisdictions' }
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
    taxAuthority: 'CRA (Kanada Vergi Idaresi)',
    refundPeriod: 'Genellikle beyandan sonra 2-4 hafta icinde',
    refundTips: [
      'RRSP (Emeklilik Birikimi) katkilari vergi matrahindan dogrudan dusulur ve yuksek iade saglar.',
      'FHSA (Ilk Ev Birikimi) yillik 8.000 CAD vergiden dusulebilir limit saglar.',
      'Tibbi harcamalar (Medical Expenses) ve hayir kurumu bagislari (Donations) iadeyi artirir.',
      'Evden calisma (Home Office) giderleri calisanlar icin indirim konusu yapilabilir.'
    ],
    keyDates: [
      { id: 'ca_rrsp_deadline_2026', title: 'RRSP Katki Son Gunu', date: '1 Mart 2026', isoDate: '2026-03-01', description: 'Onceki yil matrahindan dusmek icin son tarih' },
      { id: 'ca_individual_filing_2026', title: 'Bireysel Beyan Son Gunu', date: '30 Nisan 2026', isoDate: '2026-04-30', description: 'CRA gelir vergisi beyani ve borc odemesi' },
      { id: 'ca_self_employed_filing_2026', title: 'Self-Employed Beyan', date: '15 Haziran 2026', isoDate: '2026-06-15', description: 'Serbest calisanlar icin beyan teslim tarihi' }
    ]
  },
  US: {
    code: 'US',
    countryName: 'Amerika Birlesik Devletleri',
    flag: '🇺🇸',
    currency: 'USD',
    filingDeadline: '15 Nisan (Tax Day)',
    taxAuthority: 'IRS (Amerikan Vergi Dairesi)',
    refundPeriod: 'Elektronik beyanla 21 gun icinde dogrudan hesaba',
    refundTips: [
      '401(k) ve Traditional IRA katkilari taxable income tutarini dusurur.',
      'Child Tax Credit ve Earned Income Tax Credit (EITC) iade tutarini dogrudan yukseltir.',
      'Egitim kredileri (AOTC ve Lifetime Learning Credit) binlerce dolar vergi avantaji saglar.',
      'HSA (Health Savings Account) uclu vergi avantaji sunar.'
    ],
    keyDates: [
      { id: 'us_irs_season_open_2026', title: 'IRS Beyan Acilisi', date: '27 Ocak 2026', isoDate: '2026-01-27', description: 'Elektronik vergi beyanlarinin kabulu baslar' },
      { id: 'us_tax_day_2026', title: 'Tax Day (Son Gun)', date: '15 Nisan 2026', isoDate: '2026-04-15', description: 'Form 1040 federal beyan son teslimi' },
      { id: 'us_extension_deadline_2026', title: 'Uzatma Son Gunu', date: '15 Ekim 2026', isoDate: '2026-10-15', description: 'Extension alanlar icin son bildirim gunu' }
    ]
  },
  TR: {
    code: 'TR',
    countryName: 'Turkiye',
    flag: '🇹🇷',
    currency: 'TRY',
    filingDeadline: '31 Mart (1. Taksit) / 31 Temmuz (2. Taksit)',
    taxAuthority: 'GIB (Gelir Idaresi Baskanligi)',
    refundPeriod: 'Yillik beyanname incelemesini takiben 1-3 ay icinde',
    refundTips: [
      'Stopaj yoluyla kesilen vergiler, yillik gelir vergisi beyannamesinde mahsup veya iade edilir.',
      'Egitim ve saglik harcamalari beyan edilen gelirin %10 una kadar matrahtan indirilebilir.',
      'Sahis sigorta ve BES katki paylari belirli oranlarda vergi matrahindan dusulebilir.',
      'Kira geliri beyaninda gercek gider yontemi tercih edilirse faturali giderler gelirden dusulur.'
    ],
    keyDates: [
      { id: 'tr_annual_return_2026', title: 'Yillik Gelir Vergisi Beyani', date: '1 - 31 Mart 2026', isoDate: '2026-03-31', description: 'GIB Hazir Beyan uzerinden beyan ve 1. taksit' },
      { id: 'tr_installment_2_2026', title: '2. Taksit Odemesi', date: '31 Temmuz 2026', isoDate: '2026-07-31', description: 'Gelir vergisi ikinci taksit odemesi' },
      { id: 'tr_mtv_installment_1_2026', title: 'MTV 1. ve 2. Taksit', date: 'Ocak ve Temmuz 2026', isoDate: '2026-01-31', description: 'Motorlu Tasitlar Vergisi donemleri' }
    ]
  },
  EU: {
    code: 'EU',
    countryName: 'Avrupa Birligi',
    flag: '🇪🇺',
    currency: 'EUR',
    filingDeadline: 'Ulkeye gore 31 Mayis - 31 Temmuz',
    taxAuthority: 'National Tax Offices (Finanzamt vb.)',
    refundPeriod: 'Beyandan sonra ortalama 6-12 hafta',
    refundTips: [
      'Almanya (Finanzamt): Ortalama vergi iadesi 1.050 EUR civarindadir (Pendlerpauschale yol giderleri).',
      'Isle ilgili harcamalar (Werbungskosten), tasinma masraflari ve profesyonel egitimler iade saglar.',
      'Hollanda: 1 Nisan - 8 Mayis tarihleri arasinda beyan verenler 1 Temmuz oncesi iade alir.',
      'Cocuk bakim masraflari ve bagislar matrahtan indirilebilir.'
    ],
    keyDates: [
      { id: 'eu_tax_season_open_2026', title: 'AB Vergi Sezonu Baslangici', date: '1 Mart 2026', isoDate: '2026-03-01', description: 'Onceden doldurulmus beyanlarin kontrolu' },
      { id: 'eu_general_deadline_2026', title: 'Genel Beyan Bitisi', date: '31 Temmuz 2026', isoDate: '2026-07-31', description: 'Bireysel vergi beyannamesi teslim son tarihi' },
      { id: 'eu_advisor_extension_2027', title: 'Vergi Danismanli Uzatma', date: '28 Subat 2027', isoDate: '2027-02-28', description: 'Steuerberater / Mali musavirle yapilan beyanlar' }
    ]
  },
  UK: {
    code: 'UK',
    countryName: 'Birlesik Krallik',
    flag: '🇬🇧',
    currency: 'GBP',
    filingDeadline: '31 Ocak (Online Self Assessment)',
    taxAuthority: 'HMRC (Ingiltere Vergi Idaresi)',
    refundPeriod: 'Online bildirimlerde 2-4 hafta icinde',
    refundTips: [
      'Self Assessment beyaninda is masraflari ve pension katkilari iade hakki dogurur.',
      'Personal Allowance ust sinirina dikkat edilerek yardim bagislari (Gift Aid) beyan edilebilir.',
      'Is amacli arac kullanimi milaj indirimi (Mileage Allowance) saglar.'
    ],
    keyDates: [
      { id: 'uk_tax_year_end_2026', title: 'Mali Yil Bitisi', date: '5 Nisan 2026', isoDate: '2026-04-05', description: 'UK mali yilinin resmi kapanisi' },
      { id: 'uk_paper_return_2026', title: 'Kagit Beyan', date: '31 Ekim 2026', isoDate: '2026-10-31', description: 'Posta ile beyan gonderim son gunu' },
      { id: 'uk_online_assessment_2027', title: 'Online Self Assessment', date: '31 Ocak 2027', isoDate: '2027-01-31', description: 'Online beyan ve vergi odemesi son tarihi' }
    ]
  },
  OTHER: {
    code: 'OTHER',
    countryName: 'Diger Ulkeler / Uluslararasi',
    flag: '🌐',
    currency: 'USD',
    filingDeadline: 'Yerel mevzuata gore degisken',
    taxAuthority: 'Yerel Vergi Otoritesi',
    refundPeriod: 'Yerel takvime gore',
    refundTips: [
      'Yil boyunca yapilan isle ilgili gider makbuzlarini ve faturalari saklayin.',
      'Cifte vergilendirmeyi onleme anlasmalarini (DTA) kontrol edin.',
      'Emeklilik ve saglik prim odemelerini vergi matrahindan dusmek icin belgeleyin.'
    ],
    keyDates: [
      { id: 'other_fiscal_year_end_2026', title: 'Yil Sonu Mali Kapanis', date: '31 Aralik', isoDate: '2026-12-31', description: 'Yillik gelir ve harcamalarin toplanmasi' },
      { id: 'other_general_filing_2026', title: 'Genel Beyan Donemi', date: 'Nisan - Haziran', isoDate: '2026-06-30', description: 'Standart yillik beyan donemi' }
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
