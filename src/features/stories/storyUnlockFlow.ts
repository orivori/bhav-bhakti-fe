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
import {
  logStoryLockShown,
  logStoryUnlockClosedNoReward,
  logStoryUnlockCompleted,
  logStoryUnlockNoFill,
  logStoryUnlockTapped,
  type StoryEventContext,
  type StoryTrigger,
} from '@/utils/analytics/storyEvents';
import { pauseMediaForAd, resumeMediaAfterAd } from '@/features/ads/pauseMediaForAd';
import {
  AD_LOAD_TIMEOUT_MS,
  isAppInForeground,
  noteAdShownAndMaybePreload,
  prepareRewardedAd,
  prepareRewardedAdRetry,
  type AdLoadOutcome,
  type RewardedAdHandle,
} from '@/features/ads/rewardedAd';
import { showStoryNotice } from '@/store/storyNoticeStore';
import { storyMessageKey } from './storyLock';
import { recordStoryUnlock, type StoryUnlockRecordSource } from './storyUnlockApi';

// The rewarded-ad unlock flow for a story episode or single story
// (Bhav_Bhakti_Stories_Ad_Lock_Plan_2026-11-15.md; backend CLAUDE.md §144).
// Same engine as the wallpaper flow (adUnlockFlow.ts): the opt-in card, the
// lazy ads module, pauseMediaForAd - but a separate ad unit ('story'
// placement), its own endpoint, and:
//
// 1. Card "Watch a short ad to unlock this episode". "Not now" -> declined.
// 2. "Watch ad" -> loading overlay; audio paused.
// 3. Reward -> POST /story-unlocks source=reward (permanent) -> 'unlocked'.
//    Closed before the reward -> nothing recorded -> 'declined'.
// 4. No ad (timeout, no fill, load error): ONE more load attempt, then
//    source=no_fill -> 'unlocked'. Since 2026-11-15 a no-fill unlock is
//    PERMANENT, like a reward (no fill is AdMob's fault, not the
//    listener's); the listener is told "No ad was available right now, so
//    we've unlocked this episode for you." A show error also counts as no ad.
// Back on the overlay, or the app leaving the foreground -> 'declined',
// nothing recorded.
//
// Server answers: 409 -> 'refused' ("previous episode first"); 403
// STORY_LOCK_DISABLED -> 'disabled' (the lock is off: play it); 429 ->
// 'cap_reached' (daily limit); anything else -> 'failed' ("Couldn't
// unlock, please try again").
//
// Every message is the centred StoryNotice (storyNoticeStore), shown only
// after the ad card/overlay are gone, and this function resolves only once
// it's dismissed - so the caller plays the episode AFTER the listener taps
// OK (or outside). The caller refetches and plays on 'unlocked' / 'disabled'.

export interface StoryUnlockTarget {
  feedId: string;
  seriesId?: number | null;
  episodeNumber?: number | null;
  trigger: StoryTrigger;
}

export type StoryUnlockFlowResult =
  | 'unlocked'
  | 'disabled'
  | 'declined'
  | 'refused'
  | 'cap_reached'
  | 'failed'
  | 'busy';

// True when the item may now be played (refetch first: the audio link only
// comes with a fresh response).
export function isStoryUnlockPlayable(result: StoryUnlockFlowResult): boolean {
  return result === 'unlocked' || result === 'disabled';
}

// The message to show once the flow's ad screens are gone (flows never
// overlap, so one slot is enough).
let pendingNotice: string | null = null;
function queueNotice(messageKey: string): void {
  pendingNotice = messageKey;
}

// "Unlock the previous episode first" - shared by every caller; a centred
// notice (resolves when dismissed).
export function showPreviousEpisodeFirst(target: Omit<StoryUnlockTarget, 'feedId'> & { feedId?: string }): Promise<void> {
  logStoryLockShown({ episodeNumber: target.episodeNumber, seriesId: target.seriesId, trigger: target.trigger }, 'previous_first');
  return showStoryNotice('storyLock.previousFirst');
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

let flowRunning = false;

async function record(
  target: StoryUnlockTarget,
  storyContext: StoryEventContext,
  source: StoryUnlockRecordSource
): Promise<StoryUnlockFlowResult> {
  const { outcome } = await recordStoryUnlock({ feedId: target.feedId, source });
  switch (outcome) {
    case 'granted':
      logStoryUnlockCompleted(storyContext, source);
      // "...unlocked this story" for a single story, "...this episode" otherwise.
      if (source === 'no_fill') queueNotice(storyMessageKey('noFillUnlocked', target));
      return 'unlocked';
    case 'disabled':
      return 'disabled';
    case 'refused':
      queueNotice('storyLock.previousFirst');
      return 'refused';
    case 'cap_reached':
      queueNotice('storyLock.dailyLimit');
      return 'cap_reached';
    case 'unauthorized':
      // apiClient has already renewed or reset the session (§137).
      return 'failed';
    default:
      queueNotice('storyLock.unlockFailed');
      return 'failed';
  }
}

// Loads an ad, and on no ad (not a cancel) tries ONE more time.
async function loadWithOneRetry(
  first: RewardedAdHandle,
  context: AdEventContext
): Promise<{ ad: RewardedAdHandle; loaded: LoadWaitResult }> {
  const loaded = await waitForAdOrAbort(first.waitForLoad(AD_LOAD_TIMEOUT_MS));
  if (loaded.ok || loaded.reason === 'cancelled' || loaded.reason === 'backgrounded') {
    return { ad: first, loaded };
  }
  first.release();
  logAdUnavailable(context, loaded.reason);
  const second = prepareRewardedAdRetry('story', first);
  if (!second) return { ad: first, loaded };
  return { ad: second, loaded: await waitForAdOrAbort(second.waitForLoad(AD_LOAD_TIMEOUT_MS)) };
}

async function runFlowSteps(target: StoryUnlockTarget): Promise<StoryUnlockFlowResult> {
  const storyContext: StoryEventContext = {
    episodeNumber: target.episodeNumber,
    seriesId: target.seriesId,
    trigger: target.trigger,
  };
  const context: AdEventContext = { content_type: 'stories', action: 'listen', trigger: target.trigger };

  const ad = prepareRewardedAd('story');
  if (!ad) {
    // Ads can't run in this build - behave like no fill.
    logAdUnavailable(context, 'load_error');
    logStoryUnlockNoFill(storyContext);
    return await record(target, storyContext, 'no_fill');
  }

  logStoryLockShown(storyContext, 'unlock_offer');
  logAdUnlockOffered(context);
  const answer = await useAdFlowStore
    .getState()
    .requestOptIn(storyMessageKey('adBody', target));
  if (answer === 'decline') {
    ad.release();
    logAdUnlockDeclined(context);
    return 'declined';
  }
  logAdWatchTapped(context);
  logMetaAdWatchTapped(context);
  logStoryUnlockTapped(storyContext);

  const paused = pauseMediaForAd();
  try {
    const { ad: readyAd, loaded } = await loadWithOneRetry(ad, context);
    if (!loaded.ok) {
      readyAd.release();
      if (loaded.reason === 'cancelled' || loaded.reason === 'backgrounded') {
        logAdFailed(context, loaded.reason);
        return 'declined';
      }
      logAdUnavailable(context, loaded.reason);
      logStoryUnlockNoFill(storyContext);
      return await record(target, storyContext, 'no_fill');
    }

    if (!isAppInForeground()) {
      readyAd.release();
      logAdFailed(context, 'not_foreground', loaded.loadMs);
      return 'declined';
    }

    useAdFlowStore.getState().setPhase('showing');
    const outcome = await readyAd.show();
    noteAdShownAndMaybePreload('story');

    if (outcome === 'rewarded') {
      logAdRewardEarned(context, loaded.loadMs);
      logMetaAdWatched(context);
      return await record(target, storyContext, 'reward');
    }
    if (outcome === 'closed_no_reward') {
      logAdClosedNoReward(context, loaded.loadMs);
      logStoryUnlockClosedNoReward(storyContext);
      return 'declined';
    }
    logAdFailed(context, 'show_error', loaded.loadMs);
    logStoryUnlockNoFill(storyContext);
    return await record(target, storyContext, 'no_fill');
  } finally {
    useAdFlowStore.getState().setPhase('idle');
    resumeMediaAfterAd(paused);
  }
}

export async function runStoryUnlockFlow(target: StoryUnlockTarget): Promise<StoryUnlockFlowResult> {
  // Double taps: one flow at a time (the notice included), and never while
  // another ad flow runs.
  if (flowRunning || useAdFlowStore.getState().phase !== 'idle') return 'busy';
  flowRunning = true;
  pendingNotice = null;
  try {
    const result = await runFlowSteps(target);
    // The ad screens are gone now: show the message and wait for OK (or a
    // tap outside) before the caller plays anything.
    const notice = pendingNotice;
    pendingNotice = null;
    if (notice) await showStoryNotice(notice);
    return result;
  } finally {
    pendingNotice = null;
    flowRunning = false;
  }
}
