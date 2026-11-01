import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isContentLinkType,
  isValidFeedId,
  type ContentLink,
  type ContentLinkType,
} from '@/utils/deepLinks/contentLink';

// The one content link waiting to be shown (bhavbhakti://open/<type>/<id>,
// see contentLink.ts) - saved by app/+native-intent.tsx when a link opens the
// app, and later by the deferred-link probe. Nothing reads it yet: the
// future Home/hub pin will, through takePendingContentLink().
//
// Plain AsyncStorage functions rather than a Zustand store: nothing renders
// it, and it must survive the app being closed before login. Only the type
// and the numeric id are kept - never the raw link.
//
// - Read-once: takePendingContentLink() removes it before returning it.
// - Expires after PENDING_CONTENT_LINK_MAX_AGE_MS.
// - A newer link replaces an older one.
// - Cleared on logout (authStore.logout). Account deletion is an emailed
//   request deleted on the server; the app's next request then gets a 401,
//   and sessionExpiry.ts calls that same logout.
// - Every function swallows its own errors: a storage failure means "no
//   pending link", never a crash.

const STORAGE_KEY = 'pending-content-link';
export const PENDING_CONTENT_LINK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingContentLink {
  type: ContentLinkType;
  feedId: string;
  receivedAt: number;
  // The app's installation time (ms) when the link was saved, if known.
  installTime?: number;
}

export async function savePendingContentLink(link: ContentLink, installTime?: number): Promise<void> {
  try {
    const pending: PendingContentLink = {
      type: link.type,
      feedId: link.feedId,
      receivedAt: Date.now(),
      ...(typeof installTime === 'number' ? { installTime } : {}),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch (error) {
    if (__DEV__) console.warn('pendingContentLinkStore: save failed', error);
  }
}

// Returns the pending link once and removes it; null when there is none, it
// has expired, or what is stored isn't a valid link.
export async function takePendingContentLink(): Promise<PendingContentLink | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) return null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    return toValidPendingLink(JSON.parse(stored), Date.now());
  } catch (error) {
    if (__DEV__) console.warn('pendingContentLinkStore: read failed', error);
    return null;
  }
}

export async function clearPendingContentLink(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (__DEV__) console.warn('pendingContentLinkStore: clear failed', error);
  }
}

// Stored data is checked again with the same rules as a fresh link.
function toValidPendingLink(value: unknown, now: number): PendingContentLink | null {
  if (typeof value !== 'object' || value === null) return null;
  const { type, feedId, receivedAt, installTime } = value as Record<string, unknown>;
  if (!isContentLinkType(type) || !isValidFeedId(feedId)) return null;
  if (typeof receivedAt !== 'number' || !Number.isFinite(receivedAt)) return null;
  const age = now - receivedAt;
  if (age < 0 || age > PENDING_CONTENT_LINK_MAX_AGE_MS) return null;
  return {
    type,
    feedId,
    receivedAt,
    ...(typeof installTime === 'number' && Number.isFinite(installTime) ? { installTime } : {}),
  };
}
