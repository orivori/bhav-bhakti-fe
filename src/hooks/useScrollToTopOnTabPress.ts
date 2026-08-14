import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ParamListBase } from '@react-navigation/native';

/**
 * Standard React Navigation bottom-tabs pattern: 'tabPress' fires whenever
 * the tab's own bar button is pressed, including while it's already the
 * active tab. isFocused() is what narrows that down to a genuine re-tap
 * (as opposed to switching into this tab from elsewhere) - only then do we
 * scroll. Purely visual - no data refetch, no reordering.
 *
 * useNavigation()'s default generic only knows core (stack-level) events,
 * not bottom-tabs-specific ones like 'tabPress' - hence the explicit
 * BottomTabNavigationProp type param, matching what expo-router's <Tabs>
 * actually renders under the hood.
 */
export function useScrollToTopOnTabPress(onTabPress: () => void) {
  const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();

  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        onTabPress();
      }
    });
  }, [navigation, onTabPress]);
}
