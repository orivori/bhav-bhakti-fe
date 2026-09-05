import React, { createContext, useContext, useEffect } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useAuthStore } from '@/shared/stores/authStore';
import { authService } from '../services/authService';
import { SendOTPRequest, VerifyOTPRequest, AuthTokens } from '../types';
import {
  setFirebaseConfirmation,
  getFirebaseConfirmation,
  clearFirebaseConfirmation,
} from '../utils/firebaseConfirmation';

// True only for the .dev app variant (development/preview builds) - never
// true in production, since app.config.js's APP_VARIANT defaults to
// "production" and only the .dev variant sets it otherwise. Read from
// Constants.expoConfig.extra rather than an EXPO_PUBLIC_ env var, since it's
// tied directly to the same APP_VARIANT that already decides the app's
// package name/identity, not a separately-maintained duplicate.
const IS_TEST_ACCOUNT = Constants.expoConfig?.extra?.appVariant !== 'production';

// A handful of the Firebase phone-auth error codes actually likely to be hit
// in practice (invalid number, wrong/expired code, rate limiting) mapped to
// readable messages; anything else falls back to Firebase's own message
// rather than trying to enumerate every possible code up front.
const getFirebaseAuthErrorMessage = (error: any): string => {
  switch (error?.code) {
    case 'auth/invalid-phone-number':
      return "That phone number doesn't look valid. Please check and try again.";
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many attempts. Please wait a while before trying again.';
    case 'auth/invalid-verification-code':
      return 'Incorrect code. Please check and try again.';
    case 'auth/session-expired':
    case 'auth/code-expired':
      return 'This code has expired. Please request a new one.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
};

interface AuthContextType {
  // State
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  sendOTP: (data: SendOTPRequest) => Promise<{ success: boolean; sessionId: string; orderId: string }>;
  verifyOTP: (data: VerifyOTPRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout: storeLogout,
    initializeAuth,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const sendOTP = async (data: SendOTPRequest) => {
    try {
      setLoading(true);

      // Firebase needs a single E.164 string; the UI still collects/sends
      // these as separate fields (see verifyOTP below for why that split is
      // kept, not just here).
      const fullPhoneNumber = `${data.countryCode}${data.phoneNumber.replace(/\D/g, '')}`;
      const confirmation = await signInWithPhoneNumber(getAuth(), fullPhoneNumber);
      setFirebaseConfirmation(confirmation);

      return {
        success: true,
        sessionId: '', // vestigial - API never returned this even before Firebase
        orderId: '', // vestigial - OTPless-specific, Firebase has no equivalent; the confirmation object itself is what verifyOTP now needs, held via firebaseConfirmation.ts instead of passed through here
      };
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (data: VerifyOTPRequest) => {
    try {
      setLoading(true);
      console.log('🔄 Starting OTP verification...');

      const confirmation = getFirebaseConfirmation();
      if (!confirmation) {
        throw new Error('Verification session expired. Please request a new code.');
      }

      const userCredential = await confirmation.confirm(data.otp);
      if (!userCredential?.user) {
        throw new Error('Firebase did not return a verified user.');
      }
      const idToken = await userCredential.user.getIdToken();
      // Cleared as soon as it's been consumed - a confirmation is single-use
      // by nature (Firebase invalidates the verification session on
      // confirm() either way), so nothing legitimate needs it held any
      // longer, success or failure.
      clearFirebaseConfirmation();

      const response = await authService.verifyFirebasePhoneAuth({
        idToken,
        countryCode: data.countryCode,
        isTestAccount: IS_TEST_ACCOUNT,
      });
      console.log('📨 OTP verification response:', response);

      if (response.success) {
        console.log('✅ OTP verification successful, processing login...');

        // Convert token to tokens format expected by the store
        const tokens: AuthTokens = {
          accessToken: response.data.token,
          refreshToken: '', // API doesn't provide refresh token
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
        };

        console.log('👤 User to login:', response.data.user);
        console.log('🔑 Tokens to save:', tokens);

        await login(response.data.user, tokens);
        console.log('🎉 Login completed successfully!');

        // Force navigation to main after successful login
        router.replace('/(main)');
      } else {
        console.log('❌ OTP verification failed:', response.message);
      }
    } catch (error) {
      console.error('💥 OTP verification error:', error);
      // Covers all three real error shapes here: a missing-confirmation
      // Error, a Firebase auth/* error from confirm(), or an ApiError from
      // the backend call - the helper's fallback branch (error?.message)
      // handles ApiError and any unrecognized shape identically.
      throw new Error(getFirebaseAuthErrorMessage(error));
    } finally {
      setLoading(false);
      console.log('🏁 OTP verification process finished');
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // Call API to logout if needed
      // await authService.logout();

      await storeLogout();

      // Redirect to login screen
      router.replace('/(auth)/phone-login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      await storeLogout();
      // Ensure redirect happens even if there's an error
      router.replace('/(auth)/phone-login');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    sendOTP,
    verifyOTP,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}