import { create } from 'zustand';
import { AuthState, User, AuthTokens } from '@/features/authentication/types';
import { secureStorage } from '@/shared/utils/secureStorage';

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
      await secureStorage.saveUser(user);
      await secureStorage.saveTokens(tokens);

      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
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