import AsyncStorage from '@react-native-async-storage/async-storage';

const PHONE_STORAGE_KEY = '@bhavbhakti:last_phone_number';
const COUNTRY_CODE_STORAGE_KEY = '@bhavbhakti:last_country_code';

export interface StoredPhoneData {
  phoneNumber: string;
  countryCode: string;
}

export class PhoneStorageService {
  static async savePhoneNumber(phoneNumber: string, countryCode: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(PHONE_STORAGE_KEY, phoneNumber),
        AsyncStorage.setItem(COUNTRY_CODE_STORAGE_KEY, countryCode),
      ]);
    } catch (error) {
      console.warn('Failed to save phone number:', error);
    }
  }

  static async getLastPhoneNumber(): Promise<StoredPhoneData | null> {
    try {
      const [phoneNumber, countryCode] = await Promise.all([
        AsyncStorage.getItem(PHONE_STORAGE_KEY),
        AsyncStorage.getItem(COUNTRY_CODE_STORAGE_KEY),
      ]);

      if (phoneNumber && countryCode) {
        return { phoneNumber, countryCode };
      }
      return null;
    } catch (error) {
      console.warn('Failed to retrieve phone number:', error);
      return null;
    }
  }

  static async clearPhoneNumber(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(PHONE_STORAGE_KEY),
        AsyncStorage.removeItem(COUNTRY_CODE_STORAGE_KEY),
      ]);
    } catch (error) {
      console.warn('Failed to clear phone number:', error);
    }
  }
}
