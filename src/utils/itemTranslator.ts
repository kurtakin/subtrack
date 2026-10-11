/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Dictionary of known default/seed names and titles
const TITLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Savings Targets
  'Acil Durum Fonu (6 Aylık Güvence)': {
    en: 'Emergency Fund (6 Months Buffer)',
    fr: 'Fonds d\'urgence (réserve de 6 mois)',
    es: 'Fondo de emergencia (colchón de 6 meses)',
    de: 'Notfallfonds (6 Monate Puffer)',
    it: 'Fondo di emergenza (riserva di 6 mesi)',
    tr: 'Acil Durum Fonu (6 Aylık Güvence)'
  },
  'Ev Peşinatı & Gelecek Yatırımı': {
    en: 'House Down Payment & Future Investment',
    fr: 'Apport pour la maison & Investissement futur',
    es: 'Pago inicial de la casa e inversión futura',
    de: 'Eigenkapital für Hauskauf & Zukunftsinvestition',
    it: 'Anticipo per la casa & Investimento futuro',
    tr: 'Ev Peşinatı & Gelecek Yatırımı'
  },
  'Yıllık Tatil & Seyahat Fonu': {
    en: 'Annual Vacation & Travel Fund',
    fr: 'Fonds annuel pour les vacances et les voyages',
    es: 'Fondo anual para vacaciones y viajes',
    de: 'Jährlicher Urlaubs- & Reisefonds',
    it: 'Fondo annuale per vacanze e viaggi',
    tr: 'Yıllık Tatil & Seyahat Fonu'
  },
  'Araba / Taşıt': {
    en: 'Car / Vehicle Fund',
    fr: 'Fonds pour voiture / véhicule',
    es: 'Fondo para coche / vehículo',
    de: 'Auto- / Fahrzeugfonds',
    it: 'Fondo auto / veicolo',
    tr: 'Araba / Taşıt'
  },
  'Yatırım Sermayesi': {
    en: 'Investment Capital Fund',
    fr: 'Fonds de capital d\'investissement',
    es: 'Fondo de capital de inversión',
    de: 'Investitionskapitalfonds',
    it: 'Fondo capitale di investimento',
    tr: 'Yatırım Sermayesi'
  },
  'Diğer Hedef': {
    en: 'Other Savings Goal',
    fr: 'Autre objectif d\'épargne',
    es: 'Otro objetivo de ahorro',
    de: 'Anderes Sparziel',
    it: 'Altro obiettivo di risparmio',
    tr: 'Diğer Hedef'
  },

  // Incomes
  'Ana Maaş / Profesyonel Gelir': {
    en: 'Primary Salary / Professional Income',
    fr: 'Salaire principal / Revenu professionnel',
    es: 'Salario principal / Ingresos profesionales',
    de: 'Hauptgehalt / Berufliches Einkommen',
    it: 'Stipendio principale / Reddito professionale',
    tr: 'Ana Maaş / Profesyonel Gelir'
  },
  'Yazılım & Danışmanlık Projeleri': {
    en: 'Software & Consulting Projects',
    fr: 'Projets de logiciels et de conseil',
    es: 'Proyectos de software y consultoría',
    de: 'Software- & Beratungsprojekte',
    it: 'Progetti software e consulenza',
    tr: 'Yazılım & Danışmanlık Projeleri'
  },
  'Temettü & Yatırım Getirisi': {
    en: 'Dividends & Investment Returns',
    fr: 'Dividendes et revenus de placement',
    es: 'Dividendos y rendimientos de inversión',
    de: 'Dividenden & Kapitalerträge',
    it: 'Dividendi e rendimenti di investimento',
    tr: 'Temettü & Yatırım Getirisi'
  },
  'Maaş / Ana Gelir': {
    en: 'Salary / Main Income',
    fr: 'Salaire / Revenu principal',
    es: 'Salario / Ingreso principal',
    de: 'Gehalt / Haupteinkommen',
    it: 'Stipendio / Reddito principale',
    tr: 'Maaş / Ana Gelir'
  },
  'Freelance & Danışmanlık': {
    en: 'Freelance & Consulting',
    fr: 'Freelance & Conseil',
    es: 'Freelance y consultoría',
    de: 'Freiberuflich & Beratung',
    it: 'Freelance e consulenza',
    tr: 'Freelance & Danışmanlık'
  },
  'Yatırım & Temettü': {
    en: 'Investment & Dividends',
    fr: 'Investissements & Dividendes',
    es: 'Inversión y dividendos',
    de: 'Investitionen & Dividenden',
    it: 'Investimenti e dividendi',
    tr: 'Yatırım & Temettü'
  },
  'Kira / Gayrimenkul Geliri': {
    en: 'Rental / Real Estate Income',
    fr: 'Revenus locatifs / immobiliers',
    es: 'Ingresos por alquiler / bienes raíces',
    de: 'Miet- / Immobilieneinkünfte',
    it: 'Redditi da locazione / immobiliari',
    tr: 'Kira / Gayrimenkul Geliri'
  },
  'Ticari / Şirket Geliri': {
    en: 'Business / Company Revenue',
    fr: 'Revenus d\'entreprise / commerciaux',
    es: 'Ingresos comerciales / de empresa',
    de: 'Geschäfts- / Unternehmenseinnahmen',
    it: 'Entrate aziendali / societarie',
    tr: 'Ticari / Şirket Geliri'
  },
  'Prim & İkramiye': {
    en: 'Bonus & Incentive',
    fr: 'Prime & Gratification',
    es: 'Bono e incentivo',
    de: 'Bonus & Prämie',
    it: 'Bonus e incentivi',
    tr: 'Prim & İkramiye'
  },
  'Diğer Gelir': {
    en: 'Other Income',
    fr: 'Autre revenu',
    es: 'Otros ingresos',
    de: 'Sonstige Einnahmen',
    it: 'Altri redditi',
    tr: 'Diğer Gelir'
  },

  // Regular Payments
  'Ev Kirası': {
    en: 'Home Rent',
    fr: 'Loyer du logement',
    es: 'Alquiler de vivienda',
    de: 'Wohnungsmiete',
    it: 'Affitto di casa',
    tr: 'Ev Kirası'
  },
  'Elektrik Faturası': {
    en: 'Electricity Bill',
    fr: 'Facture d\'électricité',
    es: 'Factura de electricidad',
    de: 'Stromrechnung',
    it: 'Bolletta della luce',
    tr: 'Elektrik Faturası'
  },
  'Doğalgaz & Isınma': {
    en: 'Natural Gas & Heating',
    fr: 'Gaz naturel et chauffage',
    es: 'Gas natural y calefacción',
    de: 'Erdgas & Heizung',
    it: 'Gas naturale e riscaldamento',
    tr: 'Doğalgaz & Isınma'
  },
  'Su Faturası': {
    en: 'Water Bill',
    fr: 'Facture d\'eau',
    es: 'Factura del agua',
    de: 'Wasserrechnung',
    it: 'Bolletta dell\'acqua',
    tr: 'Su Faturası'
  },
  'Ev İnterneti & Cep Telefonu': {
    en: 'Home Internet & Mobile Phone',
    fr: 'Internet à domicile et téléphone portable',
    es: 'Internet doméstico y teléfono móvil',
    de: 'Heiminternet & Mobiltelefon',
    it: 'Internet a casa e cellulare',
    tr: 'Ev İnterneti & Cep Telefonu'
  },
  'İnternet & Telefon': {
    en: 'Internet & Phone',
    fr: 'Internet & Téléphone',
    es: 'Internet y teléfono',
    de: 'Internet & Telefon',
    it: 'Internet e telefono',
    tr: 'İnternet & Telefon'
  },
  'Apartman & Bina Aidatı': {
    en: 'Building & Condo Fee',
    fr: 'Charges de copropriété',
    es: 'Cuota de mantenimiento del edificio',
    de: 'Haus- & Wohnungsverwaltungsumlage',
    it: 'Spese condominiali',
    tr: 'Apartman & Bina Aidatı'
  },
  'Apartman Aidatı': {
    en: 'Condo / Building Fee',
    fr: 'Charges de copropriété',
    es: 'Cuota de comunidad',
    de: 'Hausgeld',
    it: 'Spese condominiali',
    tr: 'Apartman Aidatı'
  },
  'Aile Destek & Harçlık': {
    en: 'Family Support & Allowance',
    fr: 'Soutien familial et argent de poche',
    es: 'Apoyo familiar y asignación',
    de: 'Familienunterstützung & Taschengeld',
    it: 'Sostegno familiare e paghetta',
    tr: 'Aile Destek & Harçlık'
  },
  'Kişisel Destek / Borç': {
    en: 'Personal Support / Loan Repayment',
    fr: 'Soutien personnel / Remboursement de prêt',
    es: 'Apoyo personal / Pago de deuda',
    de: 'Persönliche Unterstützung / Darlehensrückzahlung',
    it: 'Sostegno personale / Rimborso debito',
    tr: 'Kişisel Destek / Borç'
  },
  'Özel Sağlık & Tamamlayıcı Sigorta': {
    en: 'Private Health & Supplemental Insurance',
    fr: 'Assurance santé privée et complémentaire',
    es: 'Seguro de salud privado y complementario',
    de: 'Private Kranken- & Zusatzversicherung',
    it: 'Assicurazione sanitaria privata e integrativa',
    tr: 'Özel Sağlık & Tamamlayıcı Sigorta'
  },
  'Resmi / Kurumsal Ödeme': {
    en: 'Official / Institutional Payment',
    fr: 'Paiement officiel / institutionnel',
    es: 'Pago oficial / institucional',
    de: 'Offizielle / Institutionelle Zahlung',
    it: 'Pagamento ufficiale / istituzionale',
    tr: 'Resmi / Kurumsal Ödeme'
  },

  // Installments
  'Honda Pilot': {
    en: 'Honda Pilot Auto Loan',
    fr: 'Prêt auto Honda Pilot',
    es: 'Préstamo para automóvil Honda Pilot',
    de: 'Autokredit Honda Pilot',
    it: 'Prestito auto Honda Pilot',
    tr: 'Honda Pilot'
  }
};

const NOTE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Kanada CRA Vergi Beyanı son tarihi: 30 Nisan (Serbest meslek: 15 Haziran)': {
    en: 'Canada CRA Tax Return deadline: April 30 (Self-employed: June 15)',
    fr: 'Date limite de déclaration CRA Canada : 30 avril (Travailleurs autonomes : 15 juin)',
    es: 'Fecha límite de declaración CRA Canadá: 30 de abril (Autónomos: 15 de junio)',
    de: 'Kanada CRA Steuererklärungsfrist: 30. April (Selbstständige: 15. Juni)',
    it: 'Scadenza dichiarazione dei redditi CRA Canada: 30 aprile (Lavoratori autonomi: 15 giugno)',
    tr: 'Kanada CRA Vergi Beyanı son tarihi: 30 Nisan (Serbest meslek: 15 Haziran)'
  },
  'Honda Pilot Taşıt Kredisi (36/48 ödendi, 12 taksit kaldı)': {
    en: 'Honda Pilot Auto Loan (36/48 paid, 12 installments remaining)',
    fr: 'Prêt auto Honda Pilot (36/48 payés, 12 mensualités restantes)',
    es: 'Préstamo auto Honda Pilot (36/48 pagadas, quedan 12 cuotas)',
    de: 'Honda Pilot Autokredit (36/48 bezahlt, 12 Raten verbleibend)',
    it: 'Prestito auto Honda Pilot (36/48 pagate, 12 rate rimanenti)',
    tr: 'Honda Pilot Taşıt Kredisi (36/48 ödendi, 12 taksit kaldı)'
  },
  'Plan Yenilemesi': {
    en: 'Plan Renewal',
    fr: 'Renouvellement du forfait',
    es: 'Renovación del plan',
    de: 'Tarifverlängerung',
    it: 'Rinnovo del piano',
    tr: 'Plan Yenilemesi'
  },
  'Cloud sunucu + kullanım limiti': {
    en: 'Cloud server + usage limit',
    fr: 'Serveur cloud + limite d\'utilisation',
    es: 'Servidor en la nube + límite de uso',
    de: 'Cloud-Server + Nutzungslimit',
    it: 'Server cloud + limite di utilizzo',
    tr: 'Cloud sunucu + kullanım limiti'
  },
  'Her ayın 1\'inde ev sahibine gönderilen kira bedeli': {
    en: 'Rent sent to landlord on the 1st of every month',
    fr: 'Loyer envoyé au propriétaire le 1er de chaque mois',
    es: 'Alquiler enviado al propietario el día 1 de cada mes',
    de: 'Miete, die jeden 1. des Monats an den Vermieter überwiesen wird',
    it: 'Affitto inviato al proprietario il 1° di ogni mese',
    tr: 'Her ayın 1\'inde ev sahibine gönderilen kira bedeli'
  },
  'Sayaç tüketimine göre aylık gelen fatura': {
    en: 'Monthly bill based on meter consumption',
    fr: 'Facture mensuelle basée sur la consommation du compteur',
    es: 'Factura mensual basada en el consumo del medidor',
    de: 'Monatliche Rechnung nach Zählerverbrauch',
    it: 'Bolletta mensile basata sui consumi del contatore',
    tr: 'Sayaç tüketimine göre aylık gelen fatura'
  },
  'Kış aylarında mevsime göre değişkenlik gösterebilir': {
    en: 'May vary seasonally during winter months',
    fr: 'Peut varier selon la saison en hiver',
    es: 'Puede variar según la estación durante el invierno',
    de: 'Kann im Winter saisonal variieren',
    it: 'Può variare stagionalmente durante i mesi invernali',
    tr: 'Kış aylarında mevsime göre değişkenlik gösterebilir'
  },
  'Aylık su tüketimi ve çevre temizlik payı': {
    en: 'Monthly water consumption and sanitation fee',
    fr: 'Consommation d\'eau mensuelle et taxe d\'assainissement',
    es: 'Consumo mensual de agua y tasa de saneamiento',
    de: 'Monatlicher Wasserverbrauch und Abwassergebühr',
    it: 'Consumo mensile di acqua e tassa di depurazione',
    tr: 'Aylık su tüketimi ve çevre temizlik payı'
  },
  'Sınırsız 500Mbps Fiber + 50GB Mobil Hat Paketi': {
    en: 'Unlimited 500Mbps Fiber + 50GB Mobile Plan',
    fr: 'Fibre 500 Mbps illimitée + forfait mobile 50 Go',
    es: 'Fibra ilimitada 500Mbps + plan móvil de 50GB',
    de: 'Unbegrenzte 500 Mbit/s Glasfaser + 50 GB Mobilfunktarif',
    it: 'Fibra illimitata 500Mbps + piano mobile da 50GB',
    tr: 'Sınırsız 500Mbps Fiber + 50GB Mobil Hat Paketi'
  },
  'Ortak alan temizlik, asansör ve kapıcı giderleri': {
    en: 'Common area cleaning, elevator, and caretaker expenses',
    fr: 'Nettoyage des parties communes, ascenseur et gardiennage',
    es: 'Limpieza de áreas comunes, ascensor y gastos de conserjería',
    de: 'Gemeinschaftsflächenreinigung, Aufzug und Hausmeisterkosten',
    it: 'Pulizia aree comuni, ascensore e spese di portierato',
    tr: 'Ortak alan temizlik, asansör ve kapıcı giderleri'
  },
  'Aylık düzenli eğitim/harçlık desteği': {
    en: 'Monthly education and allowance support',
    fr: 'Soutien mensuel pour l\'éducation et l\'argent de poche',
    es: 'Apoyo mensual para educación y asignación',
    de: 'Monatliche Unterstützung für Ausbildung und Taschengeld',
    it: 'Sostegno mensile per istruzione e paghetta',
    tr: 'Aylık düzenli eğitim/harçlık desteği'
  },
  'Yıllık sağlık poliçesi taksit/prim ödemesi': {
    en: 'Annual health policy installment / premium payment',
    fr: 'Mensualité / prime d\'assurance maladie annuelle',
    es: 'Cuota / prima de la póliza de salud anual',
    de: 'Jährliche Krankenversicherungsrate / Beitragszahlung',
    it: 'Rata / premio della polizza sanitaria annuale',
    tr: 'Yıllık sağlık poliçesi taksit/prim ödemesi'
  },
  'Net aylık banka hesabına yatan maaş': {
    en: 'Net monthly salary deposited into bank account',
    fr: 'Salaire mensuel net versé sur le compte bancaire',
    es: 'Salario neto mensual depositado en cuenta bancaria',
    de: 'Nettomonatsgehalt auf das Bankkonto überwiesen',
    it: 'Stipendio mensile netto accreditato sul conto corrente',
    tr: 'Net aylık banka hesabına yatan maaş'
  },
  'Düzenli freelance ve danışmanlık hizmet gelirleri': {
    en: 'Regular freelance and consulting service income',
    fr: 'Revenus réguliers de services freelance et de conseil',
    es: 'Ingresos regulares por servicios de freelance y consultoría',
    de: 'Regelmäßige Einnahmen aus Freiberufler- und Beratungsleistungen',
    it: 'Entrate regolari da servizi freelance e consulenza',
    tr: 'Düzenli freelance ve danışmanlık hizmet gelirleri'
  },
  'Borsa ve fon temettü / getiri ödemeleri': {
    en: 'Stock market and fund dividends / yield payouts',
    fr: 'Dividendes et rendements d\'actions et de fonds',
    es: 'Dividendos y pagos de rendimientos de bolsa y fondos',
    de: 'Dividenden- und Ertragsausschüttungen aus Aktien und Fonds',
    it: 'Dividendi e rendimenti da borsa e fondi',
    tr: 'Borsa ve fon temettü / getiri ödemeleri'
  }
};

/**
 * Returns a localized name/title for known default and user items.
 * If language is Turkish ('tr'), returns the original Turkish title.
 * If language is English or others, translates recognized items to English/target language.
 */
export function getLocalizedItemTitle(rawTitle: string | undefined | null, lang: string): string {
  if (!rawTitle) return '';
  const trimmed = rawTitle.trim();
  const lower = trimmed.toLowerCase();

  // If Turkish requested
  if (lang === 'tr') {
    // Reverse check: English to Turkish
    if (lower.includes('emergency fund')) return 'Acil Durum Fonu (6 Aylık Güvence)';
    if (lower.includes('house down payment') || lower.includes('home down payment')) return 'Ev Peşinatı & Gelecek Yatırımı';
    if (lower.includes('vacation') || lower.includes('travel fund')) return 'Yıllık Tatil & Seyahat Fonu';
    if (lower.includes('primary salary') || lower.includes('professional income')) return 'Ana Maaş / Profesyonel Gelir';
    if (lower.includes('software & consulting')) return 'Yazılım & Danışmanlık Projeleri';
    if (lower.includes('dividends') || lower.includes('investment return')) return 'Temettü & Yatırım Getirisi';
    if (lower.includes('home rent')) return 'Ev Kirası';
    if (lower.includes('electricity bill')) return 'Elektrik Faturası';
    if (lower.includes('natural gas') || lower.includes('heating')) return 'Doğalgaz & Isınma';
    if (lower.includes('water bill')) return 'Su Faturası';
    if (lower.includes('internet') && (lower.includes('phone') || lower.includes('mobile'))) return 'Ev İnterneti & Cep Telefonu';
    if (lower.includes('condo') || lower.includes('building fee')) return 'Apartman & Bina Aidatı';
    if (lower.includes('family support') || lower.includes('allowance')) return 'Aile Destek & Harçlık';
    if (lower.includes('health insurance') || lower.includes('supplemental')) return 'Özel Sağlık & Tamamlayıcı Sigorta';
    if (lower.includes('honda pilot')) return 'Honda Pilot Araç Kredisi';
    if (lower.includes('car / vehicle') || lower.includes('vehicle fund')) return 'Araba / Taşıt';
    if (lower.includes('investment capital')) return 'Yatırım Sermayesi';
    return trimmed;
  }

  // Exact match in dictionary
  if (TITLE_TRANSLATIONS[trimmed]) {
    return TITLE_TRANSLATIONS[trimmed][lang] || TITLE_TRANSLATIONS[trimmed].en || trimmed;
  }

  // Substring matching for flexible detection (Turkish to English/other)
  if (lower.includes('acil durum') || lower.includes('emergency')) {
    return lang === 'en' ? 'Emergency Fund (6 Months Buffer)' : (TITLE_TRANSLATIONS['Acil Durum Fonu (6 Aylık Güvence)']?.[lang] || 'Emergency Fund');
  }
  if (lower.includes('ev peşinatı') || lower.includes('ev pesinati') || lower.includes('down payment')) {
    return lang === 'en' ? 'House Down Payment & Future Investment' : (TITLE_TRANSLATIONS['Ev Peşinatı & Gelecek Yatırımı']?.[lang] || 'House Down Payment');
  }
  if (lower.includes('tatil') || lower.includes('seyahat') || lower.includes('vacation')) {
    return lang === 'en' ? 'Annual Vacation & Travel Fund' : (TITLE_TRANSLATIONS['Yıllık Tatil & Seyahat Fonu']?.[lang] || 'Vacation Fund');
  }
  if (lower.includes('araba') || lower.includes('taşıt') || lower.includes('tasit') || lower.includes('vehicle')) {
    return lang === 'en' ? 'Car / Vehicle Fund' : (TITLE_TRANSLATIONS['Araba / Taşıt']?.[lang] || 'Car Fund');
  }
  if (lower.includes('yatırım sermayesi') || lower.includes('yatirim sermayesi')) {
    return lang === 'en' ? 'Investment Capital Fund' : (TITLE_TRANSLATIONS['Yatırım Sermayesi']?.[lang] || 'Investment Capital');
  }
  if (lower.includes('diğer hedef') || lower.includes('diger hedef')) {
    return lang === 'en' ? 'Other Savings Goal' : (TITLE_TRANSLATIONS['Diğer Hedef']?.[lang] || 'Other Goal');
  }
  if (lower.includes('ana maaş') || lower.includes('ana maas') || lower.includes('profesyonel gelir') || lower.includes('primary salary')) {
    return lang === 'en' ? 'Primary Salary / Professional Income' : 'Primary Salary';
  }
  if (lower.includes('yazılım & danışmanlık') || lower.includes('yazilim & danismanlik') || lower.includes('software & consulting')) {
    return lang === 'en' ? 'Software & Consulting Projects' : 'Software & Consulting';
  }
  if (lower.includes('temettü') || lower.includes('temettu') || lower.includes('yatırım getirisi') || lower.includes('dividends')) {
    return lang === 'en' ? 'Dividends & Investment Returns' : 'Dividends & Returns';
  }
  if (lower === 'ev kirası' || lower === 'ev kirasi' || lower === 'kira') {
    return lang === 'en' ? 'Home Rent' : 'Home Rent';
  }
  if (lower.includes('elektrik')) {
    return lang === 'en' ? 'Electricity Bill' : 'Electricity Bill';
  }
  if (lower.includes('doğalgaz') || lower.includes('dogalgaz') || lower.includes('ısınma') || lower.includes('isinma')) {
    return lang === 'en' ? 'Natural Gas & Heating' : 'Natural Gas & Heating';
  }
  if (lower.includes('su faturası') || lower.includes('su faturasi')) {
    return lang === 'en' ? 'Water Bill' : 'Water Bill';
  }
  if (lower.includes('internet') || lower.includes('telefon') || lower.includes('mobil')) {
    return lang === 'en' ? 'Home Internet & Mobile Phone' : 'Internet & Phone';
  }
  if (lower.includes('aidat') || lower.includes('apartman')) {
    return lang === 'en' ? 'Building & Condo Fee' : 'Building Fee';
  }
  if (lower.includes('aile') || lower.includes('harçlık') || lower.includes('harclik')) {
    return lang === 'en' ? 'Family Support & Allowance' : 'Family Support';
  }
  if (lower.includes('sağlık') || lower.includes('saglik') || lower.includes('sigorta')) {
    return lang === 'en' ? 'Private Health & Supplemental Insurance' : 'Health Insurance';
  }
  if (lower.includes('honda')) {
    return lang === 'en' ? 'Honda Pilot Auto Loan' : 'Honda Pilot Auto Loan';
  }
  if (lower.includes('ticari') || lower.includes('şirket')) {
    return lang === 'en' ? 'Business / Company Revenue' : 'Business Revenue';
  }
  if (lower.includes('prim') || lower.includes('ikramiye') || lower.includes('bonus')) {
    return lang === 'en' ? 'Bonus & Incentive' : 'Bonus';
  }

  return trimmed;
}

/**
 * Returns localized note text
 */
export function getLocalizedNote(rawNote: string | undefined | null, lang: string): string {
  if (!rawNote) return '';
  const trimmed = rawNote.trim();

  if (lang === 'tr') {
    // English CRA note translated back to Turkish
    if (trimmed.includes('CRA') && (trimmed.includes('Tax Return') || trimmed.includes('April 30') || trimmed.includes('June 15'))) {
      return 'Kanada CRA Vergi Beyanı son tarihi: 30 Nisan (Serbest meslek: 15 Haziran)';
    }
    return trimmed;
  }

  if (NOTE_TRANSLATIONS[trimmed]) {
    return NOTE_TRANSLATIONS[trimmed][lang] || NOTE_TRANSLATIONS[trimmed].en || trimmed;
  }

  // Flexible check for Canada note (in Turkish or English)
  if (trimmed.includes('CRA') || trimmed.includes('Kanada') || trimmed.includes('Canada') || (trimmed.includes('Vergi') && (trimmed.includes('Beyan') || trimmed.includes('İdare')))) {
    return lang === 'en' 
      ? 'Canada CRA Tax Return deadline: April 30 (Self-employed: June 15)' 
      : (NOTE_TRANSLATIONS['Kanada CRA Vergi Beyanı son tarihi: 30 Nisan (Serbest meslek: 15 Haziran)']?.[lang] || 'Canada CRA Tax Return deadline: April 30 (Self-employed: June 15)');
  }

  // Flexible check for IRS / USA note
  if (trimmed.includes('IRS') || trimmed.includes('Amerikan Vergi')) {
    return lang === 'en'
      ? 'IRS Tax Day deadline: April 15 (Extension: October 15)'
      : 'IRS Tax Day deadline: April 15';
  }

  // Flexible check for Honda loan
  if (trimmed.includes('Honda Pilot') && (trimmed.includes('taksit') || trimmed.includes('installment'))) {
    return lang === 'en' ? 'Honda Pilot Auto Loan (36/48 paid, 12 installments remaining)' : 'Honda Pilot Araç Kredisi (36/48 ödendi, 12 taksit kaldı)';
  }

  return trimmed;
}

export const translateTitle = getLocalizedItemTitle;
