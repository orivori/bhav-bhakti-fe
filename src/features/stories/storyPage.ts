// The story page (app/(main)/story-series.tsx): pure helpers, no imports, so
// Node's test runner reads this file directly (storyPage.test.mjs).

// The route of the ONE story page (series and single stories alike). The
// file keeps its old name; every caller goes through openStoryPage().
export const STORY_PAGE_PATH = '/(main)/story-series';

// Where the story page was opened from (story_page_opened's source).
export type StoryPageSource = 'home_card' | 'stories_tab' | 'player';

const SOURCES: readonly string[] = ['home_card', 'stories_tab', 'player'];

export function parseStoryPageSource(value: unknown): StoryPageSource | null {
  return typeof value === 'string' && SOURCES.includes(value) ? (value as StoryPageSource) : null;
}

// Where an episode's playback started (story_episode_started's entry).
export type StoryEpisodeEntry = 'home_card_listen' | 'story_page' | 'queue' | 'auto_advance' | 'player_series_name';

const ENTRIES: readonly string[] = ['home_card_listen', 'story_page', 'queue', 'auto_advance', 'player_series_name'];

export function parseStoryEpisodeEntry(value: unknown): StoryEpisodeEntry | null {
  return typeof value === 'string' && ENTRIES.includes(value) ? (value as StoryEpisodeEntry) : null;
}

// A row started from the page counts as 'player_series_name' when the page
// itself was opened from the series name in the player, else 'story_page'.
export function storyEntryForPageSource(source: unknown): StoryEpisodeEntry {
  return source === 'player' ? 'player_series_name' : 'story_page';
}

/**
 * The page's route params. EVERY key is always sent (returnParams as '' when
 * there are none), so a value from an earlier visit can never stick: the
 * page is a hidden tab screen that stays mounted, and these replace its
 * params wholesale.
 */
export function buildStoryPageParams(options: {
  storyId: number | string;
  source: StoryPageSource;
  returnTo: string;
  returnParams?: Record<string, string> | null;
}): { storyId: string; source: StoryPageSource; returnTo: string; returnParams: string } {
  const { storyId, source, returnTo, returnParams } = options;
  return {
    storyId: String(storyId),
    source,
    returnTo,
    returnParams: returnParams && Object.keys(returnParams).length > 0 ? JSON.stringify(returnParams) : '',
  };
}

// returnParams as sent by buildStoryPageParams: a JSON object of strings.
// Anything else (empty, broken, not an object) = no params.
export function parseReturnParams(raw: unknown): Record<string, string> | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  try {
    const value = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const result: Record<string, string> = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string') result[key] = item;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The page's rows: a series' episodes (in the order the server sent them),
 * or a single story as its own one row. `kind` comes from storyKind().
 * Anything else (still loading, an episode id, not a story) = no rows.
 */
export function storyPageRows<T>(kind: 'series' | 'single' | 'episode' | null, story: T | null | undefined, episodes: T[] | null | undefined): T[] {
  if (!story) return [];
  if (kind === 'series') return episodes ?? [];
  if (kind === 'single') return [story];
  return [];
}
