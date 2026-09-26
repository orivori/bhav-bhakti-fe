import { feedService } from './feedService';
import { usePremiumStore } from '@/store/premiumStore';
import { logPaywallHit } from '@/utils/analytics/conversionEvents';
import type { ApiError } from '@/features/authentication/types';

export type MediaAction = 'download' | 'share' | 'view';

export interface AuthorizeMediaActionOptions {
  // Analytics label for a blocked attempt (paywall_hit's trigger_feature).
  // Defaults to the action name.
  triggerFeature?: string;
  // Share platform recorded with a share. Defaults to 'native_share'.
  platform?: string;
}

/**
 * The single gate every download, share and enlarged view in the app goes
 * through, BEFORE the file is fetched, the share sheet opens, or the viewing
 * window appears. Any new download/share/view entry point must call this too.
 *
 * For download and share this is the same backend call that records the
 * action (POST /feed/:id/download|share), so it also counts it - callers must
 * not call feedService.downloadFeed/shareFeed themselves. For view it only
 * asks (GET /feed/:id/view-access).
 *
 * Returns true to go ahead, false when the backend's premium gate said no -
 * in which case the paywall has already been shown and the caller just stops.
 * Which types/actions are gated, and whether gating is on at all
 * (PREMIUM_GATING_ENABLED), is decided entirely by the backend.
 *
 * Fail-open: only an explicit PREMIUM_REQUIRED refusal blocks. Anything else
 * - no network, a timeout, a server error, an expired session - lets the
 * action go ahead rather than blocking the user on a check that couldn't be
 * made. (An expired session on a download still shows the login prompt, via
 * apiClient's promptOnAuthFailure, exactly as before.)
 */
export async function authorizeMediaAction(
  feed: { id: number | string },
  action: MediaAction,
  options: AuthorizeMediaActionOptions = {}
): Promise<boolean> {
  const feedId = feed.id.toString();
  try {
    if (action === 'download') {
      await feedService.downloadFeed(feedId);
    } else if (action === 'share') {
      await feedService.shareFeed(feedId, { platform: options.platform ?? 'native_share' });
    } else {
      await feedService.checkViewAccess(feedId);
    }
    return true;
  } catch (error) {
    if ((error as ApiError | undefined)?.code === 'PREMIUM_REQUIRED') {
      logPaywallHit({ trigger_feature: options.triggerFeature ?? action });
      usePremiumStore.getState().setShowPaywall(true);
      return false;
    }
    if (__DEV__) {
      console.warn(`authorizeMediaAction: ${action} check for feed ${feedId} failed - allowing (fail-open)`, error);
    }
    return true;
  }
}
