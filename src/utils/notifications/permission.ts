import { PermissionsAndroid, Platform } from 'react-native';
import { getMessaging, subscribeToTopic } from '@react-native-firebase/messaging';
import { FCM_ALL_USERS_TOPIC } from '@/shared/config/notificationChannel';
import { useNotificationPermissionStore } from '@/store/notificationPermissionStore';

// iOS is entirely out of scope for this app (no native ios/ project exists -
// see CLAUDE.md §18), so this is Android-only by construction, matching every
// other permission flow already in the app.
//
// POST_NOTIFICATIONS is a real runtime-requestable permission only from
// Android 13 (API 33) onward - below that, notification display is granted
// implicitly by the OS, so PermissionsAndroid.request has nothing to ask and
// this branch just subscribes directly.
//
// Returns true once there's nothing left to ask: Android answered, or the phone
// is subscribed. False means the request itself failed, so it can be tried again.
export async function requestNotificationPermissionAndSubscribe(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }
    }

    await subscribeToTopic(getMessaging(), FCM_ALL_USERS_TOPIC);
    return true;
  } catch (error) {
    // Never block app startup/login over this - worst case, this user simply
    // isn't subscribed yet and can be reconsidered in a future session.
    console.error('Notification permission/topic subscription failed:', error);
    return false;
  }
}

// Called after the user's first finished audio (audio-player.tsx), wallpaper
// download (saveFeedToGallery.ts), wallpaper share (shareContent.ts) or saved
// ringtone (saveRingtoneToDevice.ts). At most once, ever, per install. The flag
// is set only after Android answers, so a failed request doesn't use up the one
// chance; isRequestInFlight stops a second dialog opening in the meantime.
let isRequestInFlight = false;

export function requestNotificationPermissionOnce(): void {
  const { hasRequestedPermission, markRequested } = useNotificationPermissionStore.getState();
  if (hasRequestedPermission || isRequestInFlight) {
    return;
  }
  isRequestInFlight = true;
  requestNotificationPermissionAndSubscribe()
    .then((isDone) => {
      if (isDone) {
        markRequested();
      }
    })
    .finally(() => {
      isRequestInFlight = false;
    });
}
