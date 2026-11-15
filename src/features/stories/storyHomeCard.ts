// The Home story card (StoryHomeCard / AutoplayFeedCard's `story` option):
// pure decisions, no imports, so Node's test runner reads this file directly
// (storyHomeCard.test.mjs). Plan: Bhav_Bhakti_Stories_Ad_Lock_Plan_2026-11-15.md
// sections 11 and 14; backend §145.

export interface StoryCardPreview {
  feedId: number;
  episodeNumber: number | null;
  url: string;
  duration: number | null;
}

export interface StoryCardModel {
  storyId: number;
  isSingle: boolean;
  // The preview episode (a series' first free episode, or the single story
  // itself) - its id is the audio cache key, NEVER the series row's id.
  previewFeedId: string | null;
  previewUrl: string | null;
  previewEpisodeNumber: number | null;
  // Series only (the "N episodes" line); null for a single story.
  episodeCount: number | null;
  // What Listen (and the play button) does: open the player on the preview,
  // or - when nothing is free to preview - open the story page (no ad on
  // Home: the page's own rows carry the unlock).
  listenTarget: 'player' | 'page';
}

/**
 * The card's model from the row the server sent. `kind` comes from
 * storyKind() and `preview` from parseStoryPreview(). Only a series or a
 * single story makes a card; anything else = null (not a story card).
 */
export function storyCardModel(
  kind: 'series' | 'single' | 'episode' | null,
  feed: { id: number | string; episodeCount?: number | null },
  preview: StoryCardPreview | null
): StoryCardModel | null {
  if (kind !== 'series' && kind !== 'single') return null;
  const storyId = Number(feed.id);
  if (!Number.isInteger(storyId) || storyId <= 0) return null;
  const isSingle = kind === 'single';
  return {
    storyId,
    isSingle,
    previewFeedId: preview ? String(preview.feedId) : null,
    previewUrl: preview ? preview.url : null,
    previewEpisodeNumber: preview ? preview.episodeNumber : null,
    episodeCount: isSingle ? null : typeof feed.episodeCount === 'number' && feed.episodeCount > 0 ? feed.episodeCount : null,
    listenTarget: preview ? 'player' : 'page',
  };
}

/**
 * Listen on a series card: the whole series as the queue, starting at the
 * previewed episode. Null when the list didn't load or doesn't contain the
 * preview (then the player opens on that one episode, without a queue).
 */
export function homeListenQueue<T extends { id: number | string }>(
  episodes: T[] | null | undefined,
  previewFeedId: string | null
): { items: T[]; index: number } | null {
  if (!episodes || episodes.length === 0 || !previewFeedId) return null;
  const index = episodes.findIndex((episode) => String(episode.id) === previewFeedId);
  return index >= 0 ? { items: episodes, index } : null;
}

// story_home_card_shown fires once per card per app session, not per
// re-render or re-election. Returns true the first time for an id.
const shownThisSession = new Set<string>();
export function markStoryCardShown(storyId: number | string): boolean {
  const key = String(storyId);
  if (shownThisSession.has(key)) return false;
  shownThisSession.add(key);
  return true;
}
