import React from 'react';
import { useIsFocused } from '@react-navigation/native';
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
  landingFor,
  raceWithTimeout,
  shouldHandleLink,
  stepBudgetMs,
  type LinkKind,
  type LinkLanding,
  type PinOutcome,
} from '@/utils/deepLinks/homePin';
import {
  logDeferredLinkPinned,
  logDeferredLinkPinSkipped,
  logStoryLinkLanded,
} from '@/utils/analytics/deepLinkEvents';
import { openStoryPage } from '@/features/stories/openStoryPage';
import { storyKind } from '@/features/stories/storyLock';

// Home's link landing: on the first Home load, the pending content link (a
// deferred link from a Meta install ad, or a bhavbhakti:// link that opened
// the app - see pendingContentLinkStore.ts) is acted on once:
// - pin form (bhavbhakti://open/<type>/<id>): the item becomes the FIRST card;
// - page form (bhavbhakti://story/<id>, stories only): the story's page opens
//   over Home, and back returns to Home.
// Decided once per Home mount; Home itself only exists after login (a guest
// session starts silently on a fresh install), so a link simply waits until
// then. Links that arrive while the app is already running are not handled
// here (they wait for the next cold start).
//
// Switches: the code constant DEFERRED_LINK_PIN_ENABLED gates all of it. A
// pin link also needs the backend flag deferredLinkPinEnabled (a real `true`
// from a settled /feature-flags fetch when Home mounts); with that flag off a
// pin link is left untouched - no clear, no event - exactly as before. A page
// link needs no flag: the link form is the decision (founder, 2026-11-18).
//
// The decision: wait for this launch's deferred-link probe only on an install
// less than a day old (at most PROBE_WAIT_MAX_MS), read the pending link,
// load it with GET /feed/:id (login, active items only; at most
// PIN_FETCH_TIMEOUT_MS) and check the item matches the link (for stories: a
// series or a single story - never an episode). The whole decision is capped
// at PIN_DECISION_MAX_MS. The link is removed after a definitive answer
// (used, 404, wrong type, expired) and kept on a network error, timeout, 5xx
// or 401. Any failure = the normal Home.
//
// Safety (CLAUDE.md §133): the link's text never becomes a route or a param.
// Its id reaches the API only through feedIdForApi(); the story page opens
// only through openStoryPage, with the id from the API's answer.

function isPinSwitchedOn(): boolean {
  const { status, flags } = useFeatureFlagStore.getState();
  return status === 'ok' && flags.deferredLinkPinEnabled === true;
}

// One decision's progress, shared with the overall cap in runLinkDecision.
interface LinkRun {
  // Set by the cap: the decision gave up; nothing may be cleared or logged.
  cancelled: boolean;
  // The link found and acted on (so a timeout can report it).
  link: { kind: LinkKind; type: string } | null;
  // The outcome has been acted on (set with no await in between).
  finished: boolean;
}

async function decideLink(run: LinkRun, deadline: number, isPinOn: boolean): Promise<LinkLanding<Feed> | null> {
  const installTime = await getAppInstallTime();
  if (isFreshInstall(installTime, Date.now())) {
    const wait = stepBudgetMs(PROBE_WAIT_MAX_MS, deadline, Date.now());
    if (wait > 0) await waitForDeferredLinkProbe(wait);
  }

  const pending = await peekPendingContentLink();
  if (pending.status === 'none' || run.cancelled) return null;

  if (pending.status === 'expired') {
    // An expired link of unknown kind counts as a pin link.
    const kind: LinkKind = pending.kind ?? 'pin';
    if (!shouldHandleLink(kind, isPinOn)) return null;
    run.link = { kind, type: pending.type ?? 'other' };
    run.finished = true;
    void clearPendingContentLink();
    if (kind === 'pin') logDeferredLinkPinSkipped({ reason: 'expired' });
    logStoryLinkLanded(run.link, 'expired');
    return null;
  }

  const { link } = pending;
  if (!shouldHandleLink(link.kind, isPinOn)) return null;
  run.link = { kind: link.kind, type: link.type };

  if (isFromOtherInstall(link.installTime, installTime)) {
    run.finished = true;
    void clearPendingContentLink();
    if (link.kind === 'pin') logDeferredLinkPinSkipped({ reason: 'expired' });
    logStoryLinkLanded(link, 'expired');
    return null;
  }

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
  const landing = landingFor(link.kind, outcome);
  if (landing) {
    void clearPendingContentLink();
    if (landing.kind === 'pin') {
      logDeferredLinkPinned({ content_type: link.type });
      logStoryLinkLanded(link, 'opened');
    }
    // A page landing reports 'opened' only once the page really opens (below).
    return landing;
  }
  if (outcome.kind === 'skip') {
    if (outcome.consume) void clearPendingContentLink();
    if (link.kind === 'pin') logDeferredLinkPinSkipped({ reason: outcome.reason });
    logStoryLinkLanded(link, outcome.reason);
  }
  return null;
}

// The whole decision is capped at PIN_DECISION_MAX_MS. Past it: normal Home,
// the link is kept, and an error is reported if a link was found. The
// unfinished decision is cancelled, so it can't consume the link or log later.
async function runLinkDecision(isPinOn: boolean): Promise<LinkLanding<Feed> | null> {
  const run: LinkRun = { cancelled: false, link: null, finished: false };
  const decision = decideLink(run, Date.now() + PIN_DECISION_MAX_MS, isPinOn);
  const result = await raceWithTimeout(decision, PIN_DECISION_MAX_MS);
  if (!result.timedOut) return result.value;
  // Acted on just as the cap fired: its result is already settled.
  if (run.finished) return decision;
  run.cancelled = true;
  if (run.link?.kind === 'pin') logDeferredLinkPinSkipped({ reason: 'error' });
  if (run.link) logStoryLinkLanded(run.link, 'error');
  return null;
}

const HOME_PATH = '/(main)';
// What a page landing reports in story_link_landed (the page form is always stories).
const PAGE_LINK = { kind: 'page', type: 'stories' } as const;

export function useHomePin(): { pinnedFeed: Feed | null; isDecidingPin: boolean; dropPin: () => void } {
  // Read once, at mount: a flag that settles or changes later never pins.
  const [isPinOn] = React.useState(isPinSwitchedOn);
  const [isDecidingPin, setIsDecidingPin] = React.useState(DEFERRED_LINK_PIN_ENABLED);
  const [pinnedFeed, setPinnedFeed] = React.useState<Feed | null>(null);
  // The story to open (page form), set once by the decision.
  const [pageStory, setPageStory] = React.useState<Feed | null>(null);
  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (!DEFERRED_LINK_PIN_ENABLED) return;
    let isActive = true;
    runLinkDecision(isPinOn)
      .catch((error) => {
        if (__DEV__) console.warn('useHomePin: failed, showing the normal Home', error);
        return null;
      })
      .then((landing) => {
        if (!isActive) return;
        setPinnedFeed(landing?.kind === 'pin' ? landing.feed : null);
        setPageStory(landing?.kind === 'page' ? landing.feed : null);
        setIsDecidingPin(false);
      });
    return () => {
      isActive = false;
    };
  }, [isPinOn]);

  // Page form: open the story page once Home has rendered, and only if Home
  // is the screen in front at that moment - never later, and never pulling
  // someone off another screen (then the link is simply used up). The id and
  // the series/single choice come from the API's answer, never the link.
  React.useEffect(() => {
    if (!pageStory) return;
    const story = pageStory;
    setPageStory(null);
    const kind = storyKind(story);
    if (!isFocused || (kind !== 'series' && kind !== 'single')) {
      // Home was no longer in front (or, defensively, not a story): not opened.
      logStoryLinkLanded(PAGE_LINK, 'error');
      return;
    }
    openStoryPage({ storyId: story.id, source: 'link', isSingle: kind === 'single', returnTo: HOME_PATH });
    logStoryLinkLanded(PAGE_LINK, 'opened');
  }, [pageStory, isFocused]);

  // Pull-to-refresh: back to the normal Home (the link is already used).
  const dropPin = React.useCallback(() => setPinnedFeed(null), []);

  return { pinnedFeed, isDecidingPin, dropPin };
}
