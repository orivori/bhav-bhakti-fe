import { Linking } from 'react-native';
import { PLAY_STORE_MARKET_URL, PLAY_STORE_URL } from '@/shared/config/appStoreLink';

// The one "Update" action - both the soft prompt and the hard block call only
// this. When a build ships Google Play's in-app update module, its flow goes
// here first (loaded lazily, like installedBuild.ts), keeping the store link
// below as the fallback; the screens won't need to change.
//
// Play Store app first (market://), then the web listing. Linking.openURL
// needs no manifest <queries> entry (only canOpenURL does) and just rejects
// when nothing can open the link. Never throws.
export async function openStoreForUpdate(): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_MARKET_URL);
    return;
  } catch (error) {
    console.warn('openStoreForUpdate: Play Store app unavailable, trying the web listing:', error);
  }
  try {
    await Linking.openURL(PLAY_STORE_URL);
  } catch (error) {
    console.warn('openStoreForUpdate: could not open the web listing either:', error);
  }
}
