import { Alert, Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import i18n from 'i18next';

// Shared by every save-to-gallery/set-as-X feature in the app (generic feed
// download, Set as Ringtone x2, Set as Wallpaper, Wallpaper Hub download) -
// replaces 5 previously-duplicated, canAskAgain-blind copies of this same
// permission check (see the app's device-permission audit).
//
// `reasonKey` is an i18n key (under `common`) describing what THIS specific
// feature needs the permission for - each call site keeps its own existing
// wording via its own key, only the canAskAgain branching logic is shared.
//
// Returns true if permission is granted and the caller should proceed.
export async function ensureMediaLibraryPermission(reasonKey: string): Promise<boolean> {
  const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();

  if (status === 'granted') {
    return true;
  }

  if (!canAskAgain) {
    // Android will never show its own permission dialog again from here
    // (the user picked "Don't ask again", or this is a repeat denial) -
    // re-running requestPermissionsAsync() on a later tap just silently
    // returns 'denied' with no dialog at all, so the only real recovery
    // path left is a manual trip to Settings. Deep-link straight there
    // instead of repeating an alert with nowhere useful to go.
    Alert.alert(
      i18n.t('common.permissionRequired'),
      `${i18n.t(reasonKey)} ${i18n.t('common.permissionSettingsGuidance')}`,
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        { text: i18n.t('common.openSettings'), onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // First (or second) denial - canAskAgain is still true, so Android's own
  // dialog will show again on the next tap. This alert is just the
  // "why we're asking" explanation, same as every call site had before.
  Alert.alert(i18n.t('common.permissionRequired'), i18n.t(reasonKey));
  return false;
}
