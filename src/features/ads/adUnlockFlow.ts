import { AppState } from 'react-native';
import { useAdFlowStore } from '@/store/adFlowStore';
import type { ApiError } from '@/features/authentication/types';
import {
  logAdClosedNoReward,
  logAdFailed,
  logAdRewardEarned,
  logAdUnavailable,
  logAdUnlockDeclined,
  logAdUnlockOffered,
  type AdEventContext,
  type AdUnlockAction,
} from '@/utils/analytics/adEvents';
import { logMetaAdWatched } from '@/utils/analytics/metaAdEvents';
import { recordAdUnlock, type AdUnlockSource } from './adUnlockApi';
import { pauseMediaForAd, resumeMediaAfterAd } from './pauseMediaForAd';
import {
  AD_LOAD_TIMEOUT_MS,
  isAppInForeground,
  noteAdShownAndMaybePreload,
  prepareRewardedAd,
  type AdLoadOutcome,
} from './rewardedAd';

// The rewarded-ad unlock flow (Revenue Model §5e section 3), run by
// authorizeMediaAction when the backend answers a gated call with 403
// PREMIUM_REQUIRED + unlock: 'ad'. Returns true to go ahead with the action,
// false to stop.
//
// 1. Opt-in card (the ad starts loading as it appears). "Not now" -> stop.
// 2. "Watch ad" -> blocking "Loading ad..." overlay; audio paused.
// 3. Ad loaded and the app in the foreground -> show it.
//    - Google's earned-reward event -> record source 'reward', repeat the
//      gated call once, go ahead.
//    - Closed before the reward -> stop, nothing recorded.
// 4. No ad within 8 s, a load error, or a show error -> record 'no_fill'
//    (never a reward), repeat the call, go ahead (fail-open).
// Back on the overlay, or the app leaving the foreground while loading ->
// stop, nothing recorded, no ad shown later.
//
// At most one ad per tap. The repeated call is the one that records the
// download/share (the 403 recorded nothing); if it fails anyway the action
// still goes ahead, except on a 401 (dead session - stop, as today).

export interface AdUnlockFlowInput {
  feedId: string;
  feedType: string | undefined;
  action: AdUnlockAction;
  trigger: string;
  // The same backend call that just returned the 403.
  retry: () => Promise<unknown>;
}

type LoadWaitResult = AdLoadOutcome | { ok: false; reason: 'cancelled' | 'backgrounded' };

function waitForAdOrAbort(waitForLoad: Promise<AdLoadOutcome>): Promise<LoadWaitResult> {
  return new Promise((resolve) => {
    let settled = false;
    const cleanups: (() => void)[] = [];
    const finish = (result: LoadWaitResult) => {
      if (settled) return;
      settled = true;
      cleanups.forEach((cleanup) => cleanup());
      resolve(result);
    };
    cleanups.push(useAdFlowStore.getState().onLoadingCancelled(() => finish({ ok: false, reason: 'cancelled' })));
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') finish({ ok: false, reason: 'backgrounded' });
    });
    cleanups.push(() => appState.remove());
    waitForLoad.then(finish, () => finish({ ok: false, reason: 'load_error' }));
  });
}

async function recordAndRetry(input: AdUnlockFlowInput, source: AdUnlockSource): Promise<boolean> {
  const recorded = await recordAdUnlock({ feedId: input.feedId, kind: input.action, source });
  if (recorded === 'unauthorized') return false;
  try {
    await input.retry();
  } catch (error) {
    if ((error as ApiError | undefined)?.statusCode === 401) return false;
    // Still 403, no network, 5xx: the user did what was asked - go ahead.
  }
  return true;
}

export async function runAdUnlockFlow(input: AdUnlockFlowInput): Promise<boolean> {
  const context: AdEventContext = {
    content_type: input.feedType ?? 'unknown',
    action: input.action,
    trigger: input.trigger,
  };
  const store = useAdFlowStore.getState();
  if (store.phase !== 'idle') return false; // another unlock is already running

  const ad = prepareRewardedAd();
  if (!ad) {
    // Ads can't run in this build after all - behave like no fill.
    logAdUnavailable(context, 'load_error');
    return recordAndRetry(input, 'no_fill');
  }

  logAdUnlockOffered(context);
  const answer = await store.requestOptIn();
  if (answer === 'decline') {
    ad.release();
    logAdUnlockDeclined(context);
    return false;
  }

  // phase is now 'loading' (set by answerOptIn) - media holds still.
  const paused = pauseMediaForAd();
  try {
    const loaded = await waitForAdOrAbort(ad.waitForLoad(AD_LOAD_TIMEOUT_MS));
    if (!loaded.ok) {
      ad.release();
      if (loaded.reason === 'cancelled' || loaded.reason === 'backgrounded') {
        logAdFailed(context, loaded.reason);
        return false;
      }
      logAdUnavailable(context, loaded.reason);
      return await recordAndRetry(input, 'no_fill');
    }

    if (!isAppInForeground()) {
      ad.release();
      logAdFailed(context, 'not_foreground', loaded.loadMs);
      return false;
    }

    useAdFlowStore.getState().setPhase('showing');
    const outcome = await ad.show();
    noteAdShownAndMaybePreload();

    if (outcome === 'rewarded') {
      logAdRewardEarned(context, loaded.loadMs);
      logMetaAdWatched();
      return await recordAndRetry(input, 'reward');
    }
    if (outcome === 'closed_no_reward') {
      logAdClosedNoReward(context, loaded.loadMs);
      return false;
    }
    logAdFailed(context, 'show_error', loaded.loadMs);
    return await recordAndRetry(input, 'no_fill');
  } finally {
    useAdFlowStore.getState().setPhase('idle');
    resumeMediaAfterAd(paused);
  }
}
