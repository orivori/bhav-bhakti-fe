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

export type StoryKind = 'series' | 'single' | 'episode';

/**
 * THE way to tell story rows apart (use it everywhere; never a missing url):
 *   episode - has a series id or an episode number
 *   single  - neither, and has a media type (its own audio file)
 *   series  - neither, and no media type (its episodes carry the audio)
 * Null for anything that isn't a story. A locked single story has no url
 * (and the server may even send it episodeCount: 0) but keeps its media
 * type, so it is still 'single', never mistaken for a series.
 */
export function storyKind(
  feed: { type?: unknown; mediaType?: unknown; seriesId?: number | null; episodeNumber?: number | null } | null | undefined
): StoryKind | null {
  if (!feed || feed.type !== 'stories') return null;
  if (feed.seriesId || feed.episodeNumber) return 'episode';
  return feed.mediaType ? 'single' : 'series';
}

/**
 * The preview the server attaches to a series row or single story on Home
 * (and GET /feed/:id) when stories are on Home (backend §145): the first
 * episode free by the series' settings - the same for everyone - or null
 * when nothing is free (then no audio link exists at all).
 */
export interface StoryPreview {
  feedId: number;
  episodeNumber: number | null;
  url: string;
  duration: number | null;
}

// A usable preview, or null for anything else (missing, null, malformed).
export function parseStoryPreview(value: unknown): StoryPreview | null {
  if (typeof value !== 'object' || value === null) return null;
  const { feedId, episodeNumber, url, duration } = value as Record<string, unknown>;
  const id = typeof feedId === 'string' ? Number(feedId) : feedId;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null;
  if (typeof url !== 'string' || url.length === 0) return null;
  return {
    feedId: id,
    episodeNumber: typeof episodeNumber === 'number' && episodeNumber > 0 ? episodeNumber : null,
    url,
    duration: typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : null,
  };
}

// A single story (one-off, not part of a series) for the unlock prompts:
// no series and no episode number. Only ever called with something
// playable (an episode or a single story), never a series row - for
// telling all three apart use storyKind().
export function isSingleStory(item: { seriesId?: number | null; episodeNumber?: number | null }): boolean {
  return !item.seriesId && !item.episodeNumber;
}

// Prompt text that names what is being unlocked: "this story" for a single
// story, "this episode" for a series episode (translation keys).
export type StoryMessage = 'adBody' | 'noFillUnlocked';
export function storyMessageKey(
  message: StoryMessage,
  item: { seriesId?: number | null; episodeNumber?: number | null }
): string {
  return 'storyLock.' + message + (isSingleStory(item) ? 'Single' : '');
}
