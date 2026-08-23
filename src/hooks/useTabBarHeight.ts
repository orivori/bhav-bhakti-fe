import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook to get consistent tab bar height across all screens
 * This matches the tab bar height defined in app/(main)/_layout.tsx
 */
export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();

  // This matches the height calculation from the main layout (app/(main)/_layout.tsx's
  // tabBarStyle.height) - was Math.max(80 + insets.bottom, 88) until the layout's own
  // value was independently reduced to 75/83 ("Slightly reduced height") without this
  // hook being updated to match. That 5px drift positioned MiniPlayer's `bottom:
  // tabBarHeight` 5px above the real tab bar, leaving a visible gap - confirmed via a
  // real on-device screenshot.
  const tabBarHeight = Math.max(75 + insets.bottom, 83);

  return {
    tabBarHeight,
    // Content padding with minimal buffer - just enough to clear the tab bar
    contentPadding: tabBarHeight + 8,
  };
};
