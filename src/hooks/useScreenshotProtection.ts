import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

export function useScreenshotProtection() {
  useEffect(() => {
    let subscription: any = null;

    const activateProtection = async () => {
      try {
        // Prevent screenshots on Android and iOS
        if (Platform.OS !== 'web') {
          await ScreenCapture.preventScreenCaptureAsync();

          // Listen for screenshot attempts (iOS only)
          subscription = ScreenCapture.addScreenshotListener(() => {
            console.log('Screenshot attempt detected!');
            // You can show an alert or take other action here
          });
        }
      } catch (error) {
        console.error('Failed to activate screenshot protection:', error);
      }
    };

    // Delay screenshot protection to not block initial render
    const timeoutId = setTimeout(() => {
      activateProtection();
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);

      if (Platform.OS !== 'web') {
        ScreenCapture.allowScreenCaptureAsync().catch((error) => {
          console.error('Failed to deactivate screenshot protection:', error);
        });

        if (subscription) {
          subscription.remove();
        }
      }
    };
  }, []);
}
