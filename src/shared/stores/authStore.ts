import { create } from 'zustand';
import { getCrashlytics, setUserId } from '@react-native-firebase/crashlytics';
import { getAnalytics, setUserId as setAnalyticsUserId, setUserProperty } from '@react-native-firebase/analytics';
import { AuthState, User, AuthTokens } from '@/features/authentication/types';
import { secureStorage } from '@/shared/utils/secureStorage';
import { getSupportId } from '@/shared/utils/supportId';
import { clearPendingContentLink } from '@/store/pendingContentLinkStore';

interface AuthActions {
  login: (user: User, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// A failed read is retried before it counts as "nothing stored", which would
// turn an existing user into a new guest.
const STORAGE_READ_ATTEMPTS = 3;
const STORAGE_READ_RETRY_MS = 500;

async function readStoredSession() {
  for (let attempt = 1; attempt < STORAGE_READ_ATTEMPTS; attempt += 1) {
    try {
      return await secureStorage.readSession();
    } catch (error) {
      console.error('Stored login read failed, retrying:', error);
      await new Promise((resolve) => setTimeout(resolve, STORAGE_READ_RETRY_MS));
    }
  }
  return secureStorage.readSession();
}

// Settles once the first stored-login read has finished, so nothing can start
// a guest over a login that just hasn't been read yet.
let markAuthInitialized: () => void;
const authInitialized = new Promise<void>((resolve) => {
  markAuthInitialized = resolve;
});
export const whenAuthInitialized = (): Promise<void> => authInitialized;

// The same Support ID for Crashlytics and Analytics, so a user's funnel can be
// connected to their crashes. Null is Analytics' documented way to clear its
// user id; Crashlytics takes ''.
function setAnalyticsIdentity(user: User): void {
  const supportId = getSupportId(user);
  setUserId(getCrashlytics(), supportId ?? '').catch(console.error);
  setAnalyticsUserId(getAnalytics(), supportId).catch(console.error);
  setUserProperty(getAnalytics(), 'account_type', user.authProvider === 'guest' ? 'guest' : 'phone').catch(console.error);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,

  // Actions
  login: async (user: User, tokens: AuthTokens) => {
    try {
      console.log('🔐 Starting login process...');
      if (__DEV__) {
        console.log('👤 User to save:', user);
        console.log('🔑 Tokens to save:', tokens);
      }

      await secureStorage.saveUser(user);
      console.log('✅ User saved to secure storage');

      await secureStorage.saveTokens(tokens);
      console.log('✅ Tokens saved to secure storage');

      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });

      setAnalyticsIdentity(user);

      console.log('✅ Auth state updated - user is now authenticated!');
      console.log('🎯 isAuthenticated:', true);
    } catch (error) {
      console.error('💥 Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    setUserId(getCrashlytics(), '').catch(console.error);
    setAnalyticsUserId(getAnalytics(), null).catch(console.error);
    // A link saved for this user mustn't be shown to the next one. Never
    // throws (see pendingContentLinkStore.ts), so it can't block the logout.
    void clearPendingContentLink();

    try {
      await secureStorage.clearAll();

      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if cleanup fails, update the state
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Drops a dead session without clearing the pending content link: the same
  // person is still on this phone, unlike a real logout.
  clearSession: async () => {
    try {
      await secureStorage.clearAll();
    } catch (error) {
      console.error('clearSession error:', error);
    }
    set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  initializeAuth: async () => {
    set({ isLoading: true });

    // No timeout here on purpose: a slow read used to count as "logged out",
    // which would now turn an existing user into a new guest. app/index.tsx
    // keeps showing a spinner, then a Retry, until the read really finishes.
    let savedUser = null;
    let savedTokens = null;
    try {
      ({ user: savedUser, tokens: savedTokens } = await readStoredSession());
    } catch (error) {
      console.error('Stored login could not be read:', error);
    }

    if (savedUser && savedTokens && savedTokens.expiresAt > Date.now()) {
      set({ user: savedUser, tokens: savedTokens, isAuthenticated: true, isLoading: false });
      setAnalyticsIdentity(savedUser);
    } else {
      // Finished before anything else runs: a late clear could wipe the new
      // session that a guest start is about to save.
      if (savedUser || savedTokens) {
        await secureStorage.clearAll().catch(console.error);
      }
      set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
    }

    markAuthInitialized();
  },
}));
