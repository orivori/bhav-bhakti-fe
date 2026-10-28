import { apiClient } from '@/shared/services/apiClient';
import type { ApiError } from '@/features/authentication/types';

// POST /api/v1/ad-unlocks (backend A2, Revenue Model §5d-A2): records that
// this user may use one feed's gated actions for the next 30 minutes,
// because they watched a rewarded ad (source 'reward') or no ad could be
// loaded (source 'no_fill' - fail-open, never counted as a reward).
//
// The path lives here rather than in shared/config/api.ts, which differs
// between the dev and production branches - this file cherry-picks cleanly.
const AD_UNLOCKS_PATH = '/v1/ad-unlocks';
const AD_UNLOCK_TIMEOUT_MS = 6000;

// 'set_status' exists on the backend but the app records Set as Status as a
// share for now (§5e).
export type AdUnlockKind = 'view' | 'download' | 'share';
export type AdUnlockSource = 'reward' | 'no_fill';

// 'recorded' covers 201 (new) and 200 (already active). 'unauthorized' is a
// dead session (apiClient has already shown the session-expired prompt).
// Everything else - no network, 5xx, 429 (daily cap), 400 - is 'failed', and
// the caller goes ahead anyway.
export type RecordAdUnlockResult = 'recorded' | 'unauthorized' | 'failed';

export async function recordAdUnlock(params: {
  feedId: string;
  kind: AdUnlockKind;
  source: AdUnlockSource;
}): Promise<RecordAdUnlockResult> {
  try {
    await apiClient.post(
      AD_UNLOCKS_PATH,
      { feedId: Number(params.feedId), kind: params.kind, source: params.source },
      { timeout: AD_UNLOCK_TIMEOUT_MS }
    );
    return 'recorded';
  } catch (error) {
    const apiError = error as ApiError | undefined;
    if (apiError?.statusCode === 401) return 'unauthorized';
    console.warn(`recordAdUnlock: ${params.source} grant for feed ${params.feedId} failed - going ahead`, apiError?.statusCode);
    return 'failed';
  }
}
