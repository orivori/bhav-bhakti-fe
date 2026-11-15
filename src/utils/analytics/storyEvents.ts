import { logAnalyticsEvent } from './logEvent';

// Stories ad-lock tracking (Bhav_Bhakti_Stories_Ad_Lock_Plan_2026-11-15.md
// section 7). Firebase only - Meta gets just the shared ad events with
// content_type 'stories' and action 'listen' (metaAdEvents.ts).
//
// Parameters, never a title or anything personal:
//   episode_number - the episode's number (0 for a single story)
//   free_episodes  - the series' free-episode count, when known (-1 unknown)
//   series_key     - the series' feed id as a string ('' for a single story).
//                    A content id, not personal data - Firebase only, never
//                    Meta (founder decision 2026-11-15).
//   is_single      - 1 for a single story, 0 for an episode
//   trigger        - where it happened: episode_list | end_of_episode |
//                    up_next | single_story | during_playback

export type StoryTrigger = 'episode_list' | 'end_of_episode' | 'up_next' | 'single_story' | 'during_playback';
export type StoryUnlockSource = 'reward' | 'no_fill';

export interface StoryEventContext {
  episodeNumber?: number | null;
  seriesId?: number | null;
  trigger: StoryTrigger;
}

// The free-episode count of each series seen this session (series screen),
// so episode events can carry it without another request.
const freeEpisodesBySeries = new Map<number, number>();

export function rememberSeriesFreeEpisodes(seriesId: number, freeEpisodes: number | null | undefined): void {
  if (typeof freeEpisodes === 'number') freeEpisodesBySeries.set(seriesId, freeEpisodes);
}

function params(context: Omit<StoryEventContext, 'trigger'> & { trigger?: StoryTrigger }): Record<string, string | number> {
  const seriesId = context.seriesId ?? null;
  return {
    episode_number: context.episodeNumber ?? 0,
    free_episodes: seriesId !== null ? freeEpisodesBySeries.get(seriesId) ?? -1 : -1,
    series_key: seriesId !== null ? String(seriesId) : '',
    is_single: seriesId === null ? 1 : 0,
    ...(context.trigger ? { trigger: context.trigger } : {}),
  };
}

// The lock prompt (ad card) or the "previous episode first" message was shown.
export function logStoryLockShown(context: StoryEventContext, kind: 'unlock_offer' | 'previous_first'): void {
  logAnalyticsEvent('story_lock_shown', { ...params(context), kind });
}

// "Watch ad" tapped on a story's ad card.
export function logStoryUnlockTapped(context: StoryEventContext): void {
  logAnalyticsEvent('story_unlock_tapped', params(context));
}

// The server recorded the unlock. Both sources are permanent unlocks
// (2026-11-15): reward = the listener watched the ad; no_fill = no ad was
// available, so the episode was unlocked anyway (never counted as a reward).
export function logStoryUnlockCompleted(context: StoryEventContext, source: StoryUnlockSource): void {
  logAnalyticsEvent('story_unlock_completed', { ...params(context), source });
}

export function logStoryUnlockClosedNoReward(context: StoryEventContext): void {
  logAnalyticsEvent('story_unlock_closed_no_reward', params(context));
}

export function logStoryUnlockNoFill(context: StoryEventContext): void {
  logAnalyticsEvent('story_unlock_no_fill', params(context));
}

// Playback of a story episode or single story began / reached its natural end.
// entry (started only): where the playback started - home_card_listen |
// story_page | queue | auto_advance | player_series_name (storyPage.ts);
// left out when unknown (e.g. reopened from the mini player).
export function logStoryEpisodeStarted(context: Omit<StoryEventContext, 'trigger'> & { entry?: string | null }): void {
  const { entry, ...rest } = context;
  logAnalyticsEvent('story_episode_started', { ...params(rest), ...(entry ? { entry } : {}) });
}

// ---- Stories on Home and the story page (backend §145). Firebase only;
// no titles; is_single / has_preview are 1 or 0; series_key is the series'
// feed id as a string ('' for a single story), as in the events above.

// A Home story card was shown (elected on screen) - once per card per app
// session (markStoryCardShown in storyHomeCard.ts).
export function logStoryHomeCardShown(card: { isSingle: boolean; hasPreview: boolean }): void {
  logAnalyticsEvent('story_home_card_shown', { is_single: card.isSingle ? 1 : 0, has_preview: card.hasPreview ? 1 : 0 });
}

// A Home story card was tapped: target 'page' = the cover or title, 'listen'
// = the Listen pill (or the play button when there is no preview).
export function logStoryHomeCardTapped(tap: { target: 'page' | 'listen'; isSingle: boolean }): void {
  logAnalyticsEvent('story_home_card_tapped', { target: tap.target, is_single: tap.isSingle ? 1 : 0 });
}

// The story page was opened: source home_card | stories_tab | player.
export function logStoryPageOpened(page: { source: string; isSingle: boolean; storyId: number | string }): void {
  logAnalyticsEvent('story_page_opened', {
    source: page.source,
    is_single: page.isSingle ? 1 : 0,
    series_key: page.isSingle ? '' : String(page.storyId),
  });
}

export function logStoryEpisodeCompleted(context: Omit<StoryEventContext, 'trigger'>): void {
  logAnalyticsEvent('story_episode_completed', params(context));
}
