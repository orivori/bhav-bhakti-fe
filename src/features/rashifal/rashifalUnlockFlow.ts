import { AppState } from 'react-native';
import { useAdFlowStore } from '@/store/adFlowStore';
import {
  logAdClosedNoReward,
  logAdFailed,
  logAdRewardEarned,
  logAdUnavailable,
  logAdUnlockDeclined,
  logAdUnlockOffered,
  logAdWatchTapped,
  type AdEventContext,
} from '@/utils/analytics/adEvents';
import { logMetaAdWatched, logMetaAdWatchTapped } from '@/utils/analytics/metaAdEvents';
import { logRashifalLockShown, logRashifalUnlockCompleted } from '@/utils/analytics/rashifalEvents';
import { pushCampaignParam } from '@/utils/notifications/pushAttribution';
import { pauseMediaForAd, resumeMediaAfterAd } from '@/features/ads/pauseMediaForAd';
import {
  AD_LOAD_TIMEOUT_MS,
  isAppInForeground,
  noteAdShownAndMaybePreload,
  prepareRewardedAd,
  type AdLoadOutcome,
} from '@/features/ads/rewardedAd';
import { recordRashifalUnlock, type RashifalUnlockSource } from './rashifalUnlockApi';
import type { RashifalTrigger } from './rashifalLock';

// The Rashifal ad-unlock flow on the existing ad engine (same opt-in card,
// loading state and media pause as wallpapers - features/ads/adUnlockFlow.ts),
// for ONE zodiac sign for the rest of today (IST). Guardrails (Revenue Model
// §5d): the ad starts only after "Watch ad" on our own card; nothing is
// unlocked if the ad is closed before the reward; no ad available = unlocked
// silently as no_fill (never counted as a reward), no retry, no notice.
//
//   unlocked   - recorded (reward or no_fill): open the reading
//   disabled   - the server's gate is off: open the reading as before
//   no_reading - today's reading is missing: open it, the screen shows its error
//   declined   - "Not now", back, closed early, or the app went to background
//   failed     - recording failed (network etc.): stay, the caller may say so
//   busy       - another ad flow is already running
export type RashifalUnlockFlowResult = 'unlocked' | 'disabled' | 'no_reading' | 'declined' | 'failed' | 'busy';

export function shouldOpenAfterFlow(result: RashifalUnlockFlowResult): boolean {
  return result === 'unlocked' || result === 'disabled' || result === 'no_reading';
}

export interface RashifalUnlockTarget {
  zodiacSign: string;
  trigger: RashifalTrigger;
  isOwnSign?: boolean;
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

async function record(target: RashifalUnlockTarget, source: RashifalUnlockSource): Promise<RashifalUnlockFlowResult> {
  const outcome = await recordRashifalUnlock({ zodiacSign: target.zodiacSign, source });
  switch (outcome) {
    case 'granted':
      logRashifalUnlockCompleted({ trigger: target.trigger, isOwnSign: target.isOwnSign }, source);
      return 'unlocked';
    case 'disabled':
      return 'disabled';
    case 'no_reading':
      return 'no_reading';
    default:
      return 'failed';
  }
}

let flowRunning = false;

async function runFlowSteps(target: RashifalUnlockTarget): Promise<RashifalUnlockFlowResult> {
  const context: AdEventContext = {
    content_type: 'rashifal',
    action: 'view',
    trigger: target.trigger,
    ...pushCampaignParam(),
  };
  if (useAdFlowStore.getState().phase !== 'idle') return 'busy';

  logRashifalLockShown({ trigger: target.trigger, isOwnSign: target.isOwnSign });

  const ad = prepareRewardedAd();
  if (!ad) {
    logAdUnavailable(context, 'load_error');
    return await record(target, 'no_fill');
  }

  logAdUnlockOffered(context);
  const answer = await useAdFlowStore.getState().requestOptIn('rashifalLock.adBody');
  if (answer === 'decline') {
    ad.release();
    logAdUnlockDeclined(context);
    return 'declined';
  }
  logAdWatchTapped(context);
  logMetaAdWatchTapped(context);

  const paused = pauseMediaForAd();
  try {
    const loaded = await waitForAdOrAbort(ad.waitForLoad(AD_LOAD_TIMEOUT_MS));
    if (!loaded.ok) {
      ad.release();
      if (loaded.reason === 'cancelled' || loaded.reason === 'backgrounded') {
        logAdFailed(context, loaded.reason);
        return 'declined';
      }
      logAdUnavailable(context, loaded.reason);
      return await record(target, 'no_fill');
    }

    if (!isAppInForeground()) {
      ad.release();
      logAdFailed(context, 'not_foreground', loaded.loadMs);
      return 'declined';
    }

    useAdFlowStore.getState().setPhase('showing');
    const outcome = await ad.show();
    noteAdShownAndMaybePreload();

    if (outcome === 'rewarded') {
      logAdRewardEarned(context, loaded.loadMs);
      logMetaAdWatched(context);
      return await record(target, 'reward');
    }
    if (outcome === 'closed_no_reward') {
      logAdClosedNoReward(context, loaded.loadMs);
      return 'declined';
    }
    logAdFailed(context, 'show_error', loaded.loadMs);
    return await record(target, 'no_fill');
  } finally {
    useAdFlowStore.getState().setPhase('idle');
    resumeMediaAfterAd(paused);
  }
}

export async function runRashifalUnlockFlow(target: RashifalUnlockTarget): Promise<RashifalUnlockFlowResult> {
  if (flowRunning) return 'busy';
  flowRunning = true;
  try {
    return await runFlowSteps(target);
  } finally {
    flowRunning = false;
  }
}
