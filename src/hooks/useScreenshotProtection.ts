import { useEffect, useRef } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';
import { useScreenshotProtectionStore } from '@/store/screenshotProtectionStore';

export function useScreenshotProtection() {
  const { isScreenshotProtectionEnabled } = useScreenshotProtectionStore();
  const subscriptionRef = useRef<any>(null);
  const isProtectedRef = useRef<boolean>(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const activateProtection = async () => {
      if (isProtectedRef.current) return; // Already protected

      try {
        // Prevent screenshots on Android and iOS
        if (Platform.OS !== 'web') {
          await ScreenCapture.preventScreenCaptureAsync();
          isProtectedRef.current = true;

          // Listen for screenshot attempts (iOS only)
          subscriptionRef.current = ScreenCapture.addScreenshotListener(() => {
            console.log('🚫 Screenshot attempt detected and blocked!');
            // You can show an alert or take other action here
          });

          console.log('🔒 Screenshot protection activated');
        }
      } catch (error) {
        console.error('Failed to activate screenshot protection:', error);
      }
    };

    const deactivateProtection = async () => {
      if (!isProtectedRef.current) return; // Already deactivated

      try {
        if (Platform.OS !== 'web') {
          await ScreenCapture.allowScreenCaptureAsync();
          isProtectedRef.current = false;

          if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
          }

          console.log('🔓 Screenshot protection deactivated');
        }
      } catch (error) {
        console.error('Failed to deactivate screenshot protection:', error);
      }
    };

    // Apply protection based on global setting
    if (isScreenshotProtectionEnabled) {
      // Delay screenshot protection to not block initial render
      timeoutId = setTimeout(() => {
        activateProtection();
      }, 100);
    } else {
      // Deactivate if currently protected but global setting is disabled
      deactivateProtection();
    }

    // Cleanup timeout on effect cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isScreenshotProtectionEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web' && isProtectedRef.current) {
        ScreenCapture.allowScreenCaptureAsync().catch((error) => {
          console.error('Failed to cleanup screenshot protection:', error);
        });

        if (subscriptionRef.current) {
          subscriptionRef.current.remove();
        }
      }
    };
  }, []);
}
