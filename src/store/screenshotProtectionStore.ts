import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScreenshotProtectionState {
  // Global toggle for screenshot protection
  isScreenshotProtectionEnabled: boolean;

  // Actions
  enableScreenshotProtection: () => void;
  disableScreenshotProtection: () => void;
  toggleScreenshotProtection: () => void;
  setScreenshotProtection: (enabled: boolean) => void;
}

export const useScreenshotProtectionStore = create<ScreenshotProtectionState>()(
  persist(
    (set, get) => ({
      // Default: enabled for security
      isScreenshotProtectionEnabled: false,

      enableScreenshotProtection: () => {
        
        set({ isScreenshotProtectionEnabled: true });
        console.log('✅ Screenshot protection enabled globally');
      },

      disableScreenshotProtection: () => {
        set({ isScreenshotProtectionEnabled: false });
        console.log('⚠️ Screenshot protection disabled globally');
      },

      toggleScreenshotProtection: () => {
        const currentState = get().isScreenshotProtectionEnabled;
        const newState = !currentState;
        set({ isScreenshotProtectionEnabled: newState });
        console.log(`📱 Screenshot protection ${newState ? 'enabled' : 'disabled'} globally`);
      },

      setScreenshotProtection: (enabled: boolean) => {
        set({ isScreenshotProtectionEnabled: enabled });
        console.log(`📱 Screenshot protection ${enabled ? 'enabled' : 'disabled'} globally`);
      },
    }),
    {
      name: 'screenshot-protection-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

// Export a utility to get the current state without subscribing to store updates
export const getScreenshotProtectionState = () => {
  return useScreenshotProtectionStore.getState().isScreenshotProtectionEnabled;
};