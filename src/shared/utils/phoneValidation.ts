// Lightweight phone validation for Indian numbers
const PHONE_PATTERNS = {
  '+91': /^[6-9]\d{9}$/, // Indian mobile numbers
  '+1': /^\d{10}$/, // US numbers
  '+44': /^\d{10,11}$/, // UK numbers
};

export const validatePhoneNumber = (phoneNumber: string, countryCode: string): boolean => {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    const pattern = PHONE_PATTERNS[countryCode as keyof typeof PHONE_PATTERNS];

    if (!pattern) {
      // Basic validation for other countries
      return cleanPhone.length >= 6 && cleanPhone.length <= 15;
    }

    return pattern.test(cleanPhone);
  } catch {
    return false;
  }
};

export const formatPhoneNumber = (phoneNumber: string, countryCode: string): string => {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Format Indian numbers as +91 XXXXX XXXXX
    if (countryCode === '+91' && cleanPhone.length === 10) {
      return `${countryCode} ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }

    // Default formatting
    return `${countryCode} ${cleanPhone}`;
  } catch {
    return `${countryCode} ${phoneNumber}`;
  }
};

export const extractPhoneNumber = (formattedNumber: string): { phoneNumber: string; countryCode: string } | null => {
  try {
    const match = formattedNumber.match(/^(\+\d+)\s+(.+)$/);
    if (!match) return null;

    const [, countryCode, phoneNumber] = match;
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    return {
      phoneNumber: cleanPhone,
      countryCode,
    };
  } catch {
    return null;
  }
};