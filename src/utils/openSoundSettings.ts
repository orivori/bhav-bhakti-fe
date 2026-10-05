import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

// Opens the device's Sound settings - the "Open Sound Settings" button after
// a ringtone download (RingtoneFeedCard, and Home's AutoplayFeedCard).
// Linking.openSettings() only opens this app's own app-info page, never the
// real Sound settings - that was a reported bug, first fixed in
// RingtoneFeedCard after expo-intent-launcher was accidentally removed in an
// unrelated dependency cleanup (commit ba65ddc, 2026-04-03). It stays the
// fallback if the Sound settings screen can't be opened, and the only option
// outside Android, where no such intent exists.
export function openSoundSettings(): void {
  if (Platform.OS !== 'android') {
    Linking.openSettings();
    return;
  }
  IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SOUND_SETTINGS).catch(() =>
    Linking.openSettings()
  );
}
