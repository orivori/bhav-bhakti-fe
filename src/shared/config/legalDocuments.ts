export type LegalDocType = 'terms' | 'privacy' | 'refund';

// Live URLs on orivori.com - confirmed real, published pages. Kept as one
// small lookup so a future URL change never needs touching
// LegalDocumentViewer/LegalDocumentSheet or any call site.
export const LEGAL_DOCUMENT_URLS: Record<LegalDocType, string> = {
  terms: 'https://www.orivori.com/terms-and-conditions',
  privacy: 'https://www.orivori.com/privacy-policy',
  refund: 'https://www.orivori.com/refund-policy',
};

export const LEGAL_DOCUMENT_TITLES: Record<LegalDocType, { en: string; hi: string }> = {
  terms: { en: 'Terms and Conditions', hi: 'नियम और शर्तें' },
  privacy: { en: 'Privacy Policy', hi: 'गोपनीयता नीति' },
  refund: { en: 'Refund Policy', hi: 'धनवापसी नीति' },
};
