import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isContentLinkType,
  isValidFeedId,
  toContentLinkKind,
  type ContentLink,
  type ContentLinkKind,
  type ContentLinkType,
} from '@/utils/deepLinks/contentLink';

// The one content link waiting to be shown (bhavbhakti://open/<type>/<id> or
// bhavbhakti://story/<id>, see contentLink.ts) - saved by app/+native-intent.tsx when a link opens the
// app, and by the deferred-link probe. Read by the Home pin (useHomePin.ts)
// through peekPendingContentLink(), which removes it only after a definitive
// result.
//
// Plain AsyncStorage functions rather than a Zustand store: nothing renders
// it, and it must survive the app being closed before login. Only the type
// and the numeric id are kept - never the raw link.
//
// - Read-once: takePendingContentLink() removes it before returning it.
// - Expires after PENDING_CONTENT_LINK_MAX_AGE_MS.
// - A newer link replaces an older one.
// - Cleared on a real logout (authStore.logout). A dead session isn't one:
//   sessionExpiry.ts silently starts a guest on the same phone and keeps the
//   link, which holds only a content id and expires by itself.
// - Every function swallows its own errors: a storage failure means "no
//   pending link", never a crash.

const STORAGE_KEY = 'pending-content-link';
export const PENDING_CONTENT_LINK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingContentLink {
  // 'pin' or 'page' (stories only). A link stored before the page form
  // existed has no kind and reads back as 'pin' (toContentLinkKind).
  kind: ContentLinkKind;
  type: ContentLinkType;
  feedId: string;
  receivedAt: number;
  // The app's installation time (ms) when the link was saved, if known.
  installTime?: number;
}

export async function savePendingContentLink(link: ContentLink, installTime?: number): Promise<void> {
  try {
    const pending: PendingContentLink = {
      kind: link.kind,
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

export type PendingContentLinkPeek =
  | { status: 'none' }
  // Older than 7 days, or stored data that isn't a valid link. type/kind are
  // set when the stored type is still a valid one (to tell a story link apart
  // in analytics); never used to open anything.
  | { status: 'expired'; type?: ContentLinkType; kind?: ContentLinkKind }
  | { status: 'valid'; link: PendingContentLink };

// Reads the pending link WITHOUT removing it - the caller clears it once it
// has a definitive answer (clearPendingContentLink).
export async function peekPendingContentLink(): Promise<PendingContentLinkPeek> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) return { status: 'none' };
    const value: unknown = JSON.parse(stored);
    const link = toValidPendingLink(value, Date.now());
    if (link) return { status: 'valid', link };
    const { type, kind } = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
    return isContentLinkType(type) ? { status: 'expired', type, kind: toContentLinkKind(kind, type) } : { status: 'expired' };
  } catch (error) {
    if (__DEV__) console.warn('pendingContentLinkStore: peek failed', error);
    return { status: 'none' };
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
  const { kind, type, feedId, receivedAt, installTime } = value as Record<string, unknown>;
  if (!isContentLinkType(type) || !isValidFeedId(feedId)) return null;
  if (typeof receivedAt !== 'number' || !Number.isFinite(receivedAt)) return null;
  const age = now - receivedAt;
  if (age < 0 || age > PENDING_CONTENT_LINK_MAX_AGE_MS) return null;
  return {
    kind: toContentLinkKind(kind, type),
    type,
    feedId,
    receivedAt,
    ...(typeof installTime === 'number' && Number.isFinite(installTime) ? { installTime } : {}),
  };
}
