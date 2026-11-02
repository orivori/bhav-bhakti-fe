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
  PIN_FETCH_TIMEOUT_MS,
  PROBE_WAIT_MAX_MS,
  classifyPinFetchError,
  classifyPinnedFeed,
  isFreshInstall,
  isFromOtherInstall,
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
// load it with GET /feed/:id (login, active items only), and pin it if its
// type matches the link. Removed after a definitive answer (shown, 404, type
// mismatch, expired); kept on a network error, timeout, 5xx or 401. Any
// failure = normal Home. Only reads the pending link; never navigates.

function isPinSwitchedOn(): boolean {
  if (!DEFERRED_LINK_PIN_ENABLED) return false;
  const { status, flags } = useFeatureFlagStore.getState();
  return status === 'ok' && flags.deferredLinkPinEnabled === true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Pin fetch timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function decidePin(): Promise<Feed | null> {
  const installTime = await getAppInstallTime();
  if (isFreshInstall(installTime, Date.now())) {
    await waitForDeferredLinkProbe(PROBE_WAIT_MAX_MS);
  }

  const pending = await peekPendingContentLink();
  if (pending.status === 'none') return null;
  if (pending.status === 'expired' || isFromOtherInstall(pending.link.installTime, installTime)) {
    await clearPendingContentLink();
    logDeferredLinkPinSkipped({ reason: 'expired' });
    return null;
  }

  const { link } = pending;
  let outcome: PinOutcome<Feed>;
  try {
    const feed = await withTimeout(feedService.getFeedById(feedIdForApi(link)), PIN_FETCH_TIMEOUT_MS);
    outcome = classifyPinnedFeed(link.type, feed);
  } catch (error) {
    outcome = classifyPinFetchError(error);
  }

  if (outcome.kind === 'pin') {
    await clearPendingContentLink();
    logDeferredLinkPinned({ content_type: link.type });
    return outcome.feed;
  }
  if (outcome.consume) await clearPendingContentLink();
  logDeferredLinkPinSkipped({ reason: outcome.reason });
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
    decidePin()
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
