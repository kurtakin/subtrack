/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getLocalizedCategoryName(rawCategory: string | undefined | null, t: (key: any) => string): string {
  if (!rawCategory) return '';

  const clean = rawCategory.trim();
  // Normalize Turkish characters so case-insensitive matching works reliably across locales
  const normalized = clean.replace(/İ/g, 'I').replace(/ı/g, 'i');
  const lower = normalized.toLowerCase();

  // Entertainment / Eğlence
  if (
    lower.includes('eğlence') || 
    lower.includes('eglence') || 
    lower.includes('entertainment') || 
    lower.includes('entertaınment') ||
    lower.includes('streaming') || 
    lower.includes('gaming') || 
    lower.includes('oyun')
  ) {
    return t('cat_entertainment');
  }

  // Software / Yazılım
  if (lower.includes('yazılım') || lower.includes('yazilim') || lower.includes('software') || lower.includes('cloud') || lower.includes('saas') || lower.includes('app')) {
    return t('cat_software');
  }

  // Utilities / Faturalar
  if (lower.includes('fatura') || lower.includes('utility') || lower.includes('utilities') || lower.includes('electric') || lower.includes('su') || lower.includes('gaz')) {
    return t('cat_utilities');
  }

  // Health / Sağlık
  if (lower.includes('sağlık') || lower.includes('saglik') || lower.includes('health') || lower.includes('fitness') || lower.includes('spor') || lower.includes('medikal')) {
    return t('cat_health');
  }

  // Finance / Finans
  if (lower.includes('finans') || lower.includes('finance') || lower.includes('bank') || lower.includes('kredi') || lower.includes('kart')) {
    return t('cat_finance');
  }

  // Food / Yiyecek
  if (lower.includes('yiyecek') || lower.includes('yemek') || lower.includes('food') || lower.includes('dining') || lower.includes('kahve') || lower.includes('market')) {
    return t('cat_food');
  }

  // Shopping / Alışveriş
  if (lower.includes('alışveriş') || lower.includes('alisveris') || lower.includes('shopping') || lower.includes('e-ticaret') || lower.includes('store')) {
    return t('cat_shopping');
  }

  // Education / Eğitim
  if (lower.includes('eğitim') || lower.includes('egitim') || lower.includes('education') || lower.includes('kurs') || lower.includes('course') || lower.includes('okul')) {
    return t('cat_education');
  }

  // Electronics / Elektronik
  if (lower.includes('elektronik') || lower.includes('electronic') || lower.includes('computer') || lower.includes('bilgisayar') || lower.includes('telefon')) {
    return t('cat_electronics');
  }

  // Appliances / Ev Eşyası
  if (lower.includes('ev eşyası') || lower.includes('beyaz eşya') || lower.includes('appliance') || lower.includes('home appliances')) {
    return t('cat_appliances');
  }

  // Furniture / Mobilya
  if (lower.includes('mobilya') || lower.includes('dekorasyon') || lower.includes('furniture')) {
    return t('cat_furniture');
  }

  // Clothing / Giyim
  if (lower.includes('giyim') || lower.includes('moda') || lower.includes('clothing') || lower.includes('fashion')) {
    return t('cat_clothing');
  }

  // Vacation / Tatil
  if (lower.includes('tatil') || lower.includes('seyahat') || lower.includes('vacation') || lower.includes('travel')) {
    return t('cat_vacation');
  }

  // Automotive / Taşıt
  if (lower.includes('taşıt') || lower.includes('tasit') || lower.includes('araç') || lower.includes('arac') || lower.includes('otomotiv') || lower.includes('automotive') || lower.includes('araba')) {
    return t('cat_automotive');
  }

  // Other / Diğer
  if (lower === 'diğer' || lower === 'diger' || lower === 'other' || lower === 'autres' || lower === 'otro' || lower === 'andere') {
    return t('cat_other');
  }

  return clean;
}
