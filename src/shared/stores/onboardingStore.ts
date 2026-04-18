import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,

      setOnboardingCompleted: (completed: boolean) => {
        set({ hasCompletedOnboarding: completed });
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false });
      },
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);