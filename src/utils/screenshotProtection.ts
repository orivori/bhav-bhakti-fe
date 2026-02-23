/**
 * Utility functions for managing global screenshot protection
 * Use these functions to control screenshot protection throughout the app
 */

import { useScreenshotProtectionStore, getScreenshotProtectionState } from '@/store/screenshotProtectionStore';

/**
 * Global Screenshot Protection Utilities
 * These functions can be used anywhere in the app to control screenshot protection
 */

// Enable screenshot protection globally
export const enableScreenshotProtection = () => {
  const { enableScreenshotProtection } = useScreenshotProtectionStore.getState();
  enableScreenshotProtection();
};

// Disable screenshot protection globally
export const disableScreenshotProtection = () => {
  const { disableScreenshotProtection } = useScreenshotProtectionStore.getState();
  disableScreenshotProtection();
};

// Toggle screenshot protection globally
export const toggleScreenshotProtection = () => {
  const { toggleScreenshotProtection } = useScreenshotProtectionStore.getState();
  toggleScreenshotProtection();
};

// Set screenshot protection state (true/false)
export const setScreenshotProtection = (enabled: boolean) => {
  const { setScreenshotProtection } = useScreenshotProtectionStore.getState();
  setScreenshotProtection(enabled);
};

// Check if screenshot protection is currently enabled
export const isScreenshotProtectionEnabled = (): boolean => {
  return getScreenshotProtectionState();
};

/**
 * React Hook for components that need to access screenshot protection state
 */
export const useScreenshotProtectionSettings = () => {
  const store = useScreenshotProtectionStore();
  return {
    isEnabled: store.isScreenshotProtectionEnabled,
    enable: store.enableScreenshotProtection,
    disable: store.disableScreenshotProtection,
    toggle: store.toggleScreenshotProtection,
    set: store.setScreenshotProtection,
  };
};

/**
 * Constants for easy reference
 */
export const SCREENSHOT_PROTECTION_CONFIG = {
  DEFAULT_ENABLED: true,
  STORAGE_KEY: 'screenshot-protection-settings',
} as const;

/**
 * Debug functions (for development only)
 */
export const debugScreenshotProtection = () => {
  const isEnabled = isScreenshotProtectionEnabled();
  console.log('📱 Screenshot Protection Status:', {
    enabled: isEnabled,
    timestamp: new Date().toISOString(),
  });
  return isEnabled;
};