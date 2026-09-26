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
 * Returns true to go ahead, false when the caller must stop. Which
 * types/actions are gated, and whether gating is on at all
 * (PREMIUM_GATING_ENABLED), is decided entirely by the backend.
 *
 * Two definitive answers block:
 * - 403 PREMIUM_REQUIRED: the paywall is shown here.
 * - 401: the server says there is no valid login. apiClient has already
 *   cleared the session and shown the session-expired prompt
 *   (sessionExpiry.ts). Going ahead would let a dead or missing token skip
 *   the premium check entirely, since the backend checks the login first.
 *
 * Fail-open for everything ambiguous - no network, a timeout, a server error
 * (5xx), a missing feed (404): the action goes ahead rather than blocking the
 * user on a check that couldn't be made.
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
    const apiError = error as ApiError | undefined;
    if (apiError?.code === 'PREMIUM_REQUIRED') {
      logPaywallHit({ trigger_feature: options.triggerFeature ?? action });
      usePremiumStore.getState().setShowPaywall(true);
      return false;
    }
    if (apiError?.statusCode === 401) {
      // The session-expired prompt is already showing (apiClient).
      return false;
    }
    if (__DEV__) {
      console.warn(`authorizeMediaAction: ${action} check for feed ${feedId} failed - allowing (fail-open)`, error);
    }
    return true;
  }
}
