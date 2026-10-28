import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { logScreenshotTaken } from '@/utils/analytics/screenshotEvents';

// Logs screenshot_taken for every screenshot, app-wide. Detection only - this
// never blocks screenshots (that's useScreenshotProtection, off by default).
//
// Works on Android 14+ only: there expo-screen-capture uses Android's own
// screenshot callback (DETECT_SCREEN_CAPTURE, a normal permission, no
// prompt). Below 14 the library watches the gallery instead, which needs
// gallery-read permission: on 13 that's READ_MEDIA_IMAGES, blocked in
// app.config.js (§122); on 12 and below only a phone that already granted
// storage access would report. Treat the numbers as Android 14+ only.
export function useScreenshotTracking(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let subscription: { remove: () => void } | null = null;
    try {
      subscription = ScreenCapture.addScreenshotListener(logScreenshotTaken);
    } catch (error) {
      console.error('Screenshot listener failed to start:', error);
    }
    return () => {
      try {
        subscription?.remove();
      } catch {
        // already gone
      }
    };
  }, []);
}
