import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '@/features/authentication/types';

const TOKENS_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

export const secureStorage = {
  // Token management
  async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to save tokens:', error);
      throw new Error('Failed to save authentication tokens');
    }
  },

  async getTokens(): Promise<AuthTokens | null> {
    try {
      const tokensString = await SecureStore.getItemAsync(TOKENS_KEY);
      return tokensString ? JSON.parse(tokensString) : null;
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return null;
    }
  },

  async removeTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKENS_KEY);
    } catch (error) {
      console.error('Failed to remove tokens:', error);
    }
  },

  // User data management
  async saveUser(user: any): Promise<void> {
    try {
      console.log('Saving user:', user);
      console.log('User type:', typeof user);
      console.log('User keys:', Object.keys(user || {}));

      // Clean the user object to remove any non-serializable values
      const cleanUser = this.cleanObjectForStorage(user);
      const userString = JSON.stringify(cleanUser);

      await SecureStore.setItemAsync(USER_KEY, userString);
    } catch (error) {
      console.error('Failed to save user:', error);
      throw new Error('Failed to save user data');
    }
  },

  // Helper function to clean objects for storage
  cleanObjectForStorage(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObjectForStorage(item));
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && typeof value !== 'function' && typeof value !== 'symbol') {
        cleaned[key] = this.cleanObjectForStorage(value);
      }
    }

    return cleaned;
  },

  async getUser(): Promise<any | null> {
    try {
      const userString = await SecureStore.getItemAsync(USER_KEY);
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  },

  // Clear all data
  async clearAll(): Promise<void> {
    await Promise.all([
      this.removeTokens(),
      this.removeUser(),
    ]);
  },
};