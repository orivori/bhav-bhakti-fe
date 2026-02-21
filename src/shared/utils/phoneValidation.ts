import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

export const validatePhoneNumber = (phoneNumber: string, countryCode: string): boolean => {
  try {
    const fullNumber = `${countryCode}${phoneNumber}`;
    return isValidPhoneNumber(fullNumber);
  } catch {
    return false;
  }
};

export const formatPhoneNumber = (phoneNumber: string, countryCode: string): string => {
  try {
    const fullNumber = `${countryCode}${phoneNumber}`;
    const parsed = parsePhoneNumber(fullNumber);
    return parsed?.formatInternational() || `${countryCode} ${phoneNumber}`;
  } catch {
    return `${countryCode} ${phoneNumber}`;
  }
};

export const extractPhoneNumber = (formattedNumber: string): { phoneNumber: string; countryCode: string } | null => {
  try {
    const parsed = parsePhoneNumber(formattedNumber);
    if (!parsed) return null;

    return {
      phoneNumber: parsed.nationalNumber,
      countryCode: `+${parsed.countryCallingCode}`,
    };
  } catch {
    return null;
  }
};