import { create } from 'zustand';
import { getCrashlytics, setUserId } from '@react-native-firebase/crashlytics';
import { getAnalytics, setUserId as setAnalyticsUserId } from '@react-native-firebase/analytics';
import { AuthState, User, AuthTokens } from '@/features/authentication/types';
import { secureStorage } from '@/shared/utils/secureStorage';
import { deriveSupportId } from '@/shared/utils/supportId';

interface AuthActions {
  login: (user: User, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

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
      console.log('👤 User to save:', user);
      console.log('🔑 Tokens to save:', tokens);

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

      setUserId(getCrashlytics(), deriveSupportId(user.firebaseUid) ?? '').catch(console.error);
      // Same Support ID as Crashlytics, so a user's Activation funnel can be
      // connected to their later Engagement/Conversion behavior in Firebase
      // Console - null (not '', unlike Crashlytics above) is Analytics' own
      // documented way to clear a user ID, used symmetrically in logout().
      setAnalyticsUserId(getAnalytics(), deriveSupportId(user.firebaseUid) ?? null).catch(console.error);

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

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  initializeAuth: async () => {
    try {
      set({ isLoading: true });

      // Use a timeout to prevent blocking the UI for too long
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 1500); // 1.5 second timeout
      });

      const storagePromise = Promise.all([
        secureStorage.getUser(),
        secureStorage.getTokens(),
      ]);

      // Race between storage read and timeout
      const result = await Promise.race([storagePromise, timeoutPromise]);

      if (!result) {
        // Timeout occurred, assume no auth and continue loading storage in background
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const [savedUser, savedTokens] = result;

      if (savedUser && savedTokens) {
        // Check if tokens are still valid
        const isTokenValid = savedTokens.expiresAt > Date.now();

        if (isTokenValid) {
          set({
            user: savedUser,
            tokens: savedTokens,
            isAuthenticated: true,
            isLoading: false,
          });

          setUserId(getCrashlytics(), deriveSupportId(savedUser.firebaseUid) ?? '').catch(console.error);
          setAnalyticsUserId(getAnalytics(), deriveSupportId(savedUser.firebaseUid) ?? null).catch(console.error);
        } else {
          // Tokens expired, clear storage (non-blocking)
          secureStorage.clearAll().catch(console.error);
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));