import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// State for the soft "update available" prompt (UpdatePromptModal). Same
// persisted, AsyncStorage-backed Zustand pattern as chantHintStore.ts.
//
// Persisted: what "Later" (or "Update") last dismissed - the latest build it
// was for and when - and whether this install has ever launched before.
// Not persisted: everything about the current session.
interface UpdatePromptState {
  dismissedForLatest: number | null;
  dismissedAt: number | null;
  hasLaunchedBefore: boolean;

  // Session-only.
  hasHydrated: boolean;
  // True when this session is the install's first launch (decided once, at
  // hydration). The prompt never shows then.
  isFirstSession: boolean;
  hasShownThisSession: boolean;
  isVisible: boolean;

  show: () => void;
  dismiss: (latestBuild: number) => void;
}

export const useUpdatePromptStore = create<UpdatePromptState>()(
  persist(
    (set) => ({
      dismissedForLatest: null,
      dismissedAt: null,
      hasLaunchedBefore: false,

      hasHydrated: false,
      isFirstSession: false,
      hasShownThisSession: false,
      isVisible: false,

      show: () => set({ isVisible: true, hasShownThisSession: true }),
      dismiss: (latestBuild) =>
        set({ isVisible: false, dismissedForLatest: latestBuild, dismissedAt: Date.now() }),
    }),
    {
      name: 'update-prompt-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dismissedForLatest: state.dismissedForLatest,
        dismissedAt: state.dismissedAt,
        hasLaunchedBefore: state.hasLaunchedBefore,
      }),
      // Runs once per cold start, after the stored values are loaded (or
      // failed to load - then this install is treated as new, which only
      // delays the prompt by one launch). Every install that already had the
      // app before this feature also counts its first launch with it as
      // "first" - the same one-launch delay.
      onRehydrateStorage: () => (state) => {
        const isFirstSession = !state?.hasLaunchedBefore;
        useUpdatePromptStore.setState({
          hasHydrated: true,
          isFirstSession,
          hasLaunchedBefore: true,
        });
      },
    }
  )
);
