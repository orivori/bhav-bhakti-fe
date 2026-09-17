import { PermissionsAndroid, Platform } from 'react-native';
import { getMessaging, subscribeToTopic } from '@react-native-firebase/messaging';
import { FCM_ALL_USERS_TOPIC } from '@/shared/config/notificationChannel';

// iOS is entirely out of scope for this app (no native ios/ project exists -
// see CLAUDE.md §18), so this is Android-only by construction, matching every
// other permission flow already in the app.
//
// POST_NOTIFICATIONS is a real runtime-requestable permission only from
// Android 13 (API 33) onward - below that, notification display is granted
// implicitly by the OS, so PermissionsAndroid.request has nothing to ask and
// this branch just subscribes directly.
export async function requestNotificationPermissionAndSubscribe(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return;
      }
    }

    await subscribeToTopic(getMessaging(), FCM_ALL_USERS_TOPIC);
  } catch (error) {
    // Never block app startup/login over this - worst case, this user simply
    // isn't subscribed yet and can be reconsidered in a future session.
    console.error('Notification permission/topic subscription failed:', error);
  }
}
