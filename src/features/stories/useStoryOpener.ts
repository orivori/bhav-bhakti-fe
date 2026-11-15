import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Feed } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
import { storiesQueryKeys } from '@/features/feed/hooks/useStories';
import { openAudioPlayer } from '@/utils/openAudioPlayer';
import { showStoryNotice } from '@/store/storyNoticeStore';
import type { StoryTrigger } from '@/utils/analytics/storyEvents';
import type { StoryEpisodeEntry } from './storyPage';
import { storyTapAction } from './storyLock';
import { isStoryUnlockPlayable, runStoryUnlockFlow, showPreviousEpisodeFirst } from './storyUnlockFlow';

/**
 * Tapping a story episode or single story (series screen, Stories page):
 * - playable (or no lock state at all - the lock is off) -> opens the player,
 *   exactly as before;
 * - `locked` -> "Unlock the previous episode first";
 * - `next` -> the ad unlock flow; once unlocked, the series/stories data is
 *   refetched (the audio link only comes with a fresh response) and the
 *   episode opens with the fresh list as its queue.
 */
export interface OpenStoryOptions {
  feed: Feed;
  language: string;
  // An episode's whole series, in order (seeds the queue); omitted for a
  // single story.
  queueItems?: Feed[];
  queueIndex?: number;
  trigger: StoryTrigger;
  // Where the playback starts from (story_episode_started's entry).
  entry?: StoryEpisodeEntry;
  returnTo: string;
  returnParams?: Record<string, string>;
}

export function useStoryOpener() {
  const queryClient = useQueryClient();

  // Refetches every Stories query (list, series rows, episode lists) and
  // waits for the active ones.
  const refreshStories = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['stories'] }),
    [queryClient]
  );

  const openStory = useCallback(
    async (options: OpenStoryOptions): Promise<void> => {
      const { feed } = options;
      const action = storyTapAction(feed.state);
      const target = {
        feedId: String(feed.id),
        seriesId: feed.seriesId ?? null,
        episodeNumber: feed.episodeNumber ?? null,
        trigger: options.trigger,
      };

      if (action === 'play') {
        openAudioPlayer(options);
        return;
      }
      if (action === 'previous_first') {
        void showPreviousEpisodeFirst(target);
        return;
      }

      const result = await runStoryUnlockFlow(target);
      if (result === 'refused') {
        await refreshStories();
        return;
      }
      if (!isStoryUnlockPlayable(result)) return;

      await refreshStories();
      if (feed.seriesId) {
        const episodes = queryClient.getQueryData<Feed[]>(storiesQueryKeys.episodes(feed.seriesId)) ?? [];
        const index = episodes.findIndex((episode) => episode.id === feed.id);
        const fresh = index >= 0 ? episodes[index] : null;
        if (fresh?.url) {
          openAudioPlayer({ ...options, feed: fresh, queueItems: episodes, queueIndex: index });
          return;
        }
      }
      // A single story, or an episode list that isn't loaded: fetch it.
      try {
        const fresh = await feedService.getFeedById(String(feed.id));
        if (fresh?.url) {
          // A single story is its own queue of one; an episode whose list
          // isn't loaded opens without a queue.
          const isSingle = !feed.seriesId;
          openAudioPlayer({ ...options, feed: fresh, queueItems: isSingle ? [fresh] : undefined, queueIndex: isSingle ? 0 : undefined });
          return;
        }
      } catch {
        // fall through to the message below
      }
      void showStoryNotice('storyLock.unlockFailed');
    },
    [queryClient, refreshStories]
  );

  return { openStory, refreshStories };
}
