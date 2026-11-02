import { logAnalyticsEvent } from './logEvent';
import { logMetaGateActionTap, type GateTapAction, type GateTapContentType } from './metaAppEvents';

// Gate-tap events (v10): a user tapped an action the ad gate can lock -
// wallpaper/thought download or share, Set as Ringtone. Logged at the tap,
// BEFORE the gate, any permission prompt or the "already saved" check, so
// the count means the same thing whether the gate is on or off.
//
// Firebase: gate_action_tap { action, content_type } (all builds).
// Meta: gate_action_tap + the specific event (production only, no params).
// No ids, titles or personal data in either.
//
// Called from shareContent.ts, saveFeedToGallery.ts and
// saveRingtoneToDevice.ts. Ringtone share, the enlarged view and other
// content types are deliberately not counted.

// The save helpers have no in-flight guard of their own (their callers'
// isDownloading/isSettingRingtone state can let a very fast double tap
// through before re-render), so a repeat of the same action on the same feed
// within this window counts once. The feed id is only the in-memory key -
// it is never sent.
const DOUBLE_TAP_WINDOW_MS = 1000;
const lastTapAt = new Map<string, number>();

function toGateContentType(feedType: string | undefined, action: GateTapAction): GateTapContentType | null {
  if (action === 'set_ringtone') return feedType === 'ringtone' ? 'ringtone' : null;
  if (feedType === 'wallpaper' || feedType === 'thought') return feedType;
  return null;
}

export function logGateActionTap(feed: { id: string | number; type?: string }, action: GateTapAction): void {
  try {
    const contentType = toGateContentType(feed.type, action);
    if (!contentType) return;

    const key = `${feed.id}:${action}`;
    const now = Date.now();
    const previous = lastTapAt.get(key);
    if (previous !== undefined && now - previous < DOUBLE_TAP_WINDOW_MS) return;
    lastTapAt.set(key, now);

    logAnalyticsEvent('gate_action_tap', { action, content_type: contentType });
    logMetaGateActionTap(contentType, action);
  } catch (error) {
    // Analytics must never break a download or share.
    console.error('gate_action_tap failed:', error);
  }
}
