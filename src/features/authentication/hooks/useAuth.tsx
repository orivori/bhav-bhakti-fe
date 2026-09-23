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
  getAutoVerifiedUser,
  clearFirebaseConfirmation,
} from '../utils/firebaseConfirmation';
import { getJwtExpiryMs } from '../utils/jwt';
import { logOtpSent, logLoginCompleted, logLoginFailed } from '@/utils/analytics/activationEvents';

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
  sendOTP: (
    data: SendOTPRequest,
    options?: { isResend?: boolean }
  ) => Promise<{ success: boolean; sessionId: string; orderId: string }>;
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

  const sendOTP = async (data: SendOTPRequest, options?: { isResend?: boolean }) => {
    try {
      setLoading(true);

      // Firebase needs a single E.164 string; the UI still collects/sends
      // these as separate fields (see verifyOTP below for why that split is
      // kept, not just here).
      const fullPhoneNumber = `${data.countryCode}${data.phoneNumber.replace(/\D/g, '')}`;
      const confirmation = await signInWithPhoneNumber(getAuth(), fullPhoneNumber);
      setFirebaseConfirmation(confirmation);

      // is_resend distinguishes phone-login.tsx's initial send (false) from
      // verify-otp.tsx's "Resend Code" tap (true) - both funnel through this
      // same function, but login_started (phone-login.tsx only) doesn't fire
      // again on a resend, so this parameter is what keeps the two visible
      // in the data instead of otp_sent silently over-counting resends as if
      // they were fresh funnel entries.
      logOtpSent({ is_resend: !!options?.isResend });

      return {
        success: true,
        sessionId: '', // vestigial - API never returned this even before Firebase
        orderId: '', // vestigial - OTPless-specific, Firebase has no equivalent; the confirmation object itself is what verifyOTP now needs, held via firebaseConfirmation.ts instead of passed through here
      };
    } catch (error: any) {
      logLoginFailed({ stage: 'otp_request', reason: error?.code || 'unknown_error' });
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

      // Android's native phone-auth flow always also runs its own
      // auto-retrieval/instant-verification path (SMS Retriever) alongside
      // this manual confirm() call - react-native-firebase's JS API never
      // surfaces that native path directly, so it's tracked separately via
      // firebaseConfirmation.ts's onIdTokenChanged listener instead.
      // Confirmed via a real device logcat capture (Play Store build):
      // Firebase's own SDK logs
      // "signInWithPhoneNumber:autoVerified:signInWithCredential:onComplete:
      // success" several seconds BEFORE this "confirmationResultConfirm:...
      // :onComplete:failure" for the exact same login attempt - the native
      // auto path had already signed the user in for real by the time our
      // explicit confirm(otp) lost the race and got rejected as stale. Only
      // reachable once Play Integrity attestation succeeds, which is why
      // this never showed up on any pre-Play-Store sideloaded build (Play
      // Integrity was structurally unavailable there).
      //
      // This function runs either once the user's visible OTP input reaches
      // 6 digits (verify-otp.tsx's auto-submit/manual-tap gate), OR
      // immediately the moment this background signal itself fires, via
      // verify-otp.tsx's registerAutoVerifiedListener subscription -
      // deliberately NOT gated on 6 digits in that second path, since
      // waiting there is exactly what let a user's mistyped digits appear to
      // "succeed" once a background win already existed (see
      // firebaseConfirmation.ts's own comment on registerAutoVerifiedListener).
      // Either way, whatever's actually in data.otp is irrelevant once
      // backgroundWinner matches below - not compared against the real code
      // (deliberately deferred, see CLAUDE.md).
      const expectedPhoneNumber = `${data.countryCode}${data.phoneNumber.replace(/\D/g, '')}`;
      let firebaseUser = null;

      const backgroundWinner = getAutoVerifiedUser();
      if (backgroundWinner?.phoneNumber === expectedPhoneNumber) {
        // Background auto-verification already completed for this attempt -
        // confirm() would only fail against the now-consumed session (per
        // the evidence above), so skip it entirely rather than force a
        // guaranteed-failing round trip.
        firebaseUser = backgroundWinner;
      } else {
        try {
          const userCredential = await confirmation.confirm(data.otp);
          firebaseUser = userCredential?.user ?? null;
        } catch (confirmError: any) {
          // Narrow timing window: the background path could have won in the
          // moments while this confirm() call was in flight. Re-check the
          // same signal before giving up.
          const isStaleCodeError =
            confirmError?.code === 'auth/code-expired' || confirmError?.code === 'auth/session-expired';
          const raceWinner = getAutoVerifiedUser();
          if (isStaleCodeError && raceWinner?.phoneNumber === expectedPhoneNumber) {
            firebaseUser = raceWinner;
          } else {
            throw confirmError;
          }
        }
      }

      if (!firebaseUser) {
        throw new Error('Firebase did not return a verified user.');
      }
      const idToken = await firebaseUser.getIdToken();
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
      if (__DEV__) {
        console.log('📨 OTP verification response:', response);
      }

      if (response.success) {
        console.log('✅ OTP verification successful, processing login...');

        // Convert token to tokens format expected by the store. expiresAt is read
        // straight from the JWT's own exp claim so the local session check matches
        // the backend's real, server-enforced expiry (JWT_EXPIRES_IN, currently 10d)
        // instead of a separately-maintained guess going stale (see CLAUDE.md §83/87).
        // A malformed token or a missing exp claim is treated as already-expired
        // (0), never as long-lived.
        const expiresAt = getJwtExpiryMs(response.data.token) ?? 0;
        const tokens: AuthTokens = {
          accessToken: response.data.token,
          refreshToken: '', // API doesn't provide refresh token
          expiresAt,
        };

        if (__DEV__) {
          console.log('👤 User to login:', response.data.user);
          console.log('🔑 Tokens to save:', tokens);
        }

        await login(response.data.user, tokens);
        console.log('🎉 Login completed successfully!');

        // is_new_user reused directly from the backend's own real signal
        // (see CLAUDE.md §83/87 - computed correctly for months, never once
        // read by the frontend until now). Also arms the three "new user's
        // first X" Activation milestones (home_first_viewed,
        // first_navigation_choice, first_content_completed) - see
        // logLoginCompleted's own comment.
        logLoginCompleted({ is_new_user: !!response.data.isNewUser });

        // Force navigation to main after successful login
        router.replace('/(main)');
      } else {
        console.log('❌ OTP verification failed:', response.message);
        logLoginFailed({ stage: 'otp_verify', reason: 'verification_unsuccessful' });
      }
    } catch (error: any) {
      console.error('💥 OTP verification error:', error);
      logLoginFailed({ stage: 'otp_verify', reason: error?.code || 'unknown_error' });
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