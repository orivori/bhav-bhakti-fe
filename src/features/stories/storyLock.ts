// Stories ad-lock rules on the app side (Bhav_Bhakti_Stories_Ad_Lock_Plan_2026-11-15.md,
// backend CLAUDE.md §144). Pure: no React, no imports, so Node's test runner
// reads this file directly (storyLock.test.mjs).
//
// The backend sends each story a `state` when STORY_LOCK_ENABLED is on:
//   free / unlocked        - playable, the audio url is present (since
//                            2026-11-15 every unlock, ad or no ad, is
//                            permanent; 'temp' is no longer sent but is
//                            still read as playable, for old data)
//   next                   - the one item an ad unlocks now (url null)
//   locked                 - needs the previous item first (url null)
// No state at all (switch off, or old data) means playable - exactly as
// before the lock existed.

export type StoryState = 'free' | 'unlocked' | 'temp' | 'next' | 'locked';

const STORY_STATES: readonly string[] = ['free', 'unlocked', 'temp', 'next', 'locked'];
const LOCKED_STATES: readonly string[] = ['next', 'locked'];

// A known state, or null for anything else (missing, a future value).
export function parseStoryState(value: unknown): StoryState | null {
  return typeof value === 'string' && STORY_STATES.includes(value) ? (value as StoryState) : null;
}

// True unless the server explicitly said next/locked.
export function isStoryStatePlayable(state: unknown): boolean {
  const parsed = parseStoryState(state);
  return parsed === null || !LOCKED_STATES.includes(parsed);
}

export type StoryTapAction = 'play' | 'unlock' | 'previous_first';

/**
 * What a tap on a story (episode row, single-story tile, Up Next row) does.
 * `next` offers the ad; `locked` says "unlock the previous episode first";
 * everything else plays (including no state at all).
 */
export function storyTapAction(state: unknown): StoryTapAction {
  const parsed = parseStoryState(state);
  if (parsed === 'next') return 'unlock';
  if (parsed === 'locked') return 'previous_first';
  return 'play';
}

/**
 * Whether the player may move to a queue item on its own (auto-advance, the
 * Next button, the lock-screen Next): it needs an audio url and a playable
 * state. Never true for a locked item, so the player never tries to play an
 * episode it has no audio for.
 */
export function canPlayQueueItem(item: { audioUrl?: string | null; storyState?: unknown } | null | undefined): boolean {
  return !!item && !!item.audioUrl && isStoryStatePlayable(item.storyState);
}

export type StoryUnlockResponse = 'granted' | 'refused' | 'disabled' | 'cap_reached' | 'unauthorized' | 'failed';

/**
 * POST /story-unlocks outcome from the HTTP status (and error code):
 * 200/201 granted (or already playable); 409 previous episode first; 403
 * STORY_LOCK_DISABLED = the lock is off (treat as playable); 429 daily cap;
 * 401 dead session; anything else (no network, 5xx, 400) failed.
 */
export function classifyStoryUnlockResponse(status: number | undefined, code?: string): StoryUnlockResponse {
  if (status === 200 || status === 201) return 'granted';
  if (status === 409) return 'refused';
  if (status === 403 && code === 'STORY_LOCK_DISABLED') return 'disabled';
  if (status === 429) return 'cap_reached';
  if (status === 401) return 'unauthorized';
  return 'failed';
}

// Series rows carry the counts; "N of M unlocked" is shown only when the
// server sent both (lock on).
export function unlockedSummary(feed: { unlockedCount?: number | null; episodeCount?: number | null }): {
  unlocked: number;
  total: number;
} | null {
  const unlocked = feed.unlockedCount;
  const total = feed.episodeCount;
  if (typeof unlocked !== 'number' || typeof total !== 'number' || total <= 0) return null;
  return { unlocked: Math.min(unlocked, total), total };
}
