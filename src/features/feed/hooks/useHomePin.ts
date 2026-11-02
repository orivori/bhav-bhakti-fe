import React from 'react';
import { feedService } from '../services/feedService';
import type { Feed } from '@/types/feed';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { clearPendingContentLink, peekPendingContentLink } from '@/store/pendingContentLinkStore';
import { feedIdForApi } from '@/utils/deepLinks/contentLink';
import {
  DEFERRED_LINK_PIN_ENABLED,
  getAppInstallTime,
  waitForDeferredLinkProbe,
} from '@/utils/deepLinks/deferredAppLink';
import {
  PIN_DECISION_MAX_MS,
  PIN_FETCH_TIMEOUT_MS,
  PROBE_WAIT_MAX_MS,
  classifyPinFetchError,
  classifyPinnedFeed,
  isFreshInstall,
  isFromOtherInstall,
  raceWithTimeout,
  stepBudgetMs,
  type PinOutcome,
} from '@/utils/deepLinks/homePin';
import { logDeferredLinkPinned, logDeferredLinkPinSkipped } from '@/utils/analytics/deepLinkEvents';

// Home pin: on the first Home load, the pending content link's feed (a
// deferred link from a Meta install ad, or a bhavbhakti://open/... link -
// see pendingContentLinkStore.ts) becomes the FIRST card. Decided once per
// Home mount; Home itself only exists after login, so a logged-out user's
// link simply waits.
//
// Off unless BOTH switches are on: the code constant DEFERRED_LINK_PIN_ENABLED
// and the backend flag deferredLinkPinEnabled, already a real `true` from a
// settled /feature-flags fetch when Home mounts. Otherwise nothing at all
// happens - no wait, no store read, no event - and Home is exactly as before.
//
// When on: wait for this launch's deferred-link probe only on an install
// less than a day old (at most PROBE_WAIT_MAX_MS), read the pending link,
// load it with GET /feed/:id (login, active items only; at most
// PIN_FETCH_TIMEOUT_MS), and pin it if its type matches the link. The whole
// decision is capped at PIN_DECISION_MAX_MS. Removed after a definitive
// answer (shown, 404, type mismatch, expired); kept on a network error,
// timeout, 5xx or 401. Any failure = normal Home. Only reads the pending
// link; never navigates.

function isPinSwitchedOn(): boolean {
  if (!DEFERRED_LINK_PIN_ENABLED) return false;
  const { status, flags } = useFeatureFlagStore.getState();
  return status === 'ok' && flags.deferredLinkPinEnabled === true;
}

// One decision's progress, shared with the overall cap in runPinDecision.
interface PinRun {
  // Set by the cap: the decision gave up; nothing may be cleared or logged.
  cancelled: boolean;
  // A pending link was found (so a timeout reports skipped {error}).
  sawLink: boolean;
  // The outcome has been acted on (set with no await in between).
  finished: boolean;
}

async function decidePin(run: PinRun, deadline: number): Promise<Feed | null> {
  const installTime = await getAppInstallTime();
  if (isFreshInstall(installTime, Date.now())) {
    const wait = stepBudgetMs(PROBE_WAIT_MAX_MS, deadline, Date.now());
    if (wait > 0) await waitForDeferredLinkProbe(wait);
  }

  const pending = await peekPendingContentLink();
  if (pending.status === 'none' || run.cancelled) return null;
  run.sawLink = true;
  if (pending.status === 'expired' || isFromOtherInstall(pending.link.installTime, installTime)) {
    run.finished = true;
    void clearPendingContentLink();
    logDeferredLinkPinSkipped({ reason: 'expired' });
    return null;
  }

  const { link } = pending;
  let outcome: PinOutcome<Feed>;
  try {
    const budget = stepBudgetMs(PIN_FETCH_TIMEOUT_MS, deadline, Date.now());
    const fetched = await raceWithTimeout(feedService.getFeedById(feedIdForApi(link)), budget);
    // A timeout counts as a network error: the link is kept.
    outcome = fetched.timedOut ? classifyPinFetchError(null) : classifyPinnedFeed(link.type, fetched.value);
  } catch (error) {
    outcome = classifyPinFetchError(error);
  }

  // From here to the return there is no await, so the cap can't fire midway.
  if (run.cancelled) return null;
  run.finished = true;
  if (outcome.kind === 'pin') {
    void clearPendingContentLink();
    logDeferredLinkPinned({ content_type: link.type });
    return outcome.feed;
  }
  if (outcome.consume) void clearPendingContentLink();
  logDeferredLinkPinSkipped({ reason: outcome.reason });
  return null;
}

// The whole decision is capped at PIN_DECISION_MAX_MS. Past it: normal Home,
// the link is kept, and skipped {error} is sent if a link was found. The
// unfinished decision is cancelled, so it can't consume the link or log later.
async function runPinDecision(): Promise<Feed | null> {
  const run: PinRun = { cancelled: false, sawLink: false, finished: false };
  const decision = decidePin(run, Date.now() + PIN_DECISION_MAX_MS);
  const result = await raceWithTimeout(decision, PIN_DECISION_MAX_MS);
  if (!result.timedOut) return result.value;
  // Acted on just as the cap fired: its result is already settled.
  if (run.finished) return decision;
  run.cancelled = true;
  if (run.sawLink) logDeferredLinkPinSkipped({ reason: 'error' });
  return null;
}

export function useHomePin(): { pinnedFeed: Feed | null; isDecidingPin: boolean; dropPin: () => void } {
  // Read once, at mount: a flag that settles or changes later never pins.
  const [isSwitchedOn] = React.useState(isPinSwitchedOn);
  const [isDecidingPin, setIsDecidingPin] = React.useState(isSwitchedOn);
  const [pinnedFeed, setPinnedFeed] = React.useState<Feed | null>(null);

  React.useEffect(() => {
    if (!isSwitchedOn) return;
    let isActive = true;
    runPinDecision()
      .catch((error) => {
        if (__DEV__) console.warn('useHomePin: failed, showing the normal Home', error);
        return null;
      })
      .then((feed) => {
        if (!isActive) return;
        setPinnedFeed(feed);
        setIsDecidingPin(false);
      });
    return () => {
      isActive = false;
    };
  }, [isSwitchedOn]);

  // Pull-to-refresh: back to the normal Home (the link is already used).
  const dropPin = React.useCallback(() => setPinnedFeed(null), []);

  return { pinnedFeed, isDecidingPin, dropPin };
}
