import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook to get consistent tab bar height across all screens
 * This matches the tab bar height defined in app/(main)/_layout.tsx
 */
export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();

  // This matches the height calculation from the main layout
  const tabBarHeight = Math.max(80 + insets.bottom, 88);

  return {
    tabBarHeight,
    // Content padding with minimal buffer - just enough to clear the tab bar
    contentPadding: tabBarHeight + 8,
  };
};
