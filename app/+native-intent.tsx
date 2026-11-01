import { parseContentLink } from '@/utils/deepLinks/contentLink';
import { savePendingContentLink } from '@/store/pendingContentLinkStore';

// Every link that opens the app through the bhavbhakti:// scheme passes
// through here first (Expo Router's +native-intent, both the link that
// cold-starts the app and one that arrives while it's open). Any other app
// or web page can fire that scheme, so the incoming path is never followed:
// without this file Expo Router opened whatever screen the link named
// (bhavbhakti://audio-player?audioUrl=..., bhavbhakti://delete-account),
// skipping the login check in app/index.tsx and the notification allow-list.
//
// Always returns '/', so the app opens through app/index.tsx - Home when
// logged in, the login screen otherwise. A valid content link
// (bhavbhakti://open/<type>/<id>, see contentLink.ts) is also saved as the
// pending link; nothing acts on it yet.
//
// Notification taps don't come through here (they arrive through
// @react-native-firebase/messaging, see app/_layout.tsx).
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const link = parseContentLink(path);
    if (link) {
      // Not awaited: the answer must not wait on storage, and the save
      // swallows its own errors.
      void savePendingContentLink(link);
    }
  } catch {
    // Throwing here can crash the app (Expo Router's own warning).
  }
  return '/';
}
