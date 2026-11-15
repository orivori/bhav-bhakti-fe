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
export type StoryUnlockSource = 'reward' | 'no_fill' | 'temporary';

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

// The server recorded the unlock. source reward = permanent; no_fill = no ad
// was available (24 h); temporary is reserved for a later 24-hour grant that
// isn't a no-fill.
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
export function logStoryEpisodeStarted(context: Omit<StoryEventContext, 'trigger'>): void {
  logAnalyticsEvent('story_episode_started', params(context));
}

export function logStoryEpisodeCompleted(context: Omit<StoryEventContext, 'trigger'>): void {
  logAnalyticsEvent('story_episode_completed', params(context));
}
