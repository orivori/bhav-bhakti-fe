import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import AutoplayFeedCard, { type StoryCardOptions } from '../AutoplayFeedCard/AutoplayFeedCard';
import { Feed } from '@/types/feed';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { formatDuration } from '@/utils/formatDuration';
import { openAudioPlayer } from '@/utils/openAudioPlayer';
import { seriesEpisodesQuery } from '@/features/feed/hooks/useStories';
import { parseStoryPreview, storyKind } from '@/features/stories/storyLock';
import { homeListenQueue, markStoryCardShown, storyCardModel, type StoryCardModel } from '@/features/stories/storyHomeCard';
import { logStoryHomeCardShown, logStoryHomeCardTapped } from '@/utils/analytics/storyEvents';
import { openStoryPage } from '@/features/stories/openStoryPage';

interface StoryHomeCardProps {
  feed: Feed;
  isActive: boolean;
  shouldMountVideo?: boolean;
}

const HOME = '/(main)';

/**
 * A series row or single story on Home (backend §145; plan section 11):
 * AutoplayFeedCard in its audio layout, through its `story` option, so the
 * 30-second cap, play-when-visible and stop-on-background are the very same
 * code as every other Home card.
 * - cover / title -> the story page (returnTo Home);
 * - Listen -> the player on the previewed episode with the whole series as
 *   the queue (one shared episode-list request, the story page's cache), or
 *   the single story as a queue of one; back returns to Home;
 * - no preview (nothing free, or a locked single story) -> cover only, and
 *   Listen opens the story page: no ad moment on Home.
 * Renders nothing for a row that isn't a series or single story.
 */
export default function StoryHomeCard({ feed, isActive, shouldMountVideo }: StoryHomeCardProps) {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const queryClient = useQueryClient();
  const isListeningRef = useRef(false);

  const model = useMemo(
    () => storyCardModel(storyKind(feed), feed, parseStoryPreview(feed.preview)),
    [feed]
  );

  // story_home_card_shown: the first time this card is the elected (on
  // screen, playing) card - once per card per app session.
  useEffect(() => {
    if (!model || !isActive) return;
    if (markStoryCardShown(model.storyId)) {
      logStoryHomeCardShown({ isSingle: model.isSingle, hasPreview: model.previewUrl !== null });
    }
  }, [model, isActive]);

  const openPage = useCallback(() => {
    if (!model) return;
    openStoryPage({ storyId: model.storyId, source: 'home_card', isSingle: model.isSingle, returnTo: HOME });
  }, [model]);

  const tapCover = useCallback(() => {
    if (!model) return;
    logStoryHomeCardTapped({ target: 'page', isSingle: model.isSingle });
    openPage();
  }, [model, openPage]);

  const listen = useCallback(async () => {
    if (!model) return;
    logStoryHomeCardTapped({ target: 'listen', isSingle: model.isSingle });
    if (model.listenTarget === 'page') {
      openPage();
      return;
    }
    if (isListeningRef.current) return;
    isListeningRef.current = true;
    try {
      await openPreviewInPlayer(model, feed, language, (seriesId) => queryClient.fetchQuery(seriesEpisodesQuery(seriesId)));
    } finally {
      isListeningRef.current = false;
    }
  }, [model, feed, language, queryClient, openPage]);

  const seeAll = useCallback(() => {
    router.navigate('/(main)/stories' as any);
  }, []);

  const story: StoryCardOptions | null = useMemo(() => {
    if (!model) return null;
    let footerText: string | null = null;
    if (!model.isSingle && model.episodeCount !== null) {
      footerText =
        model.episodeCount === 1
          ? t('stories.episodeCountOne')
          : t('stories.episodeCountOther', { count: model.episodeCount });
    } else if (model.isSingle) {
      footerText = formatDuration(feed.duration) || null;
    }
    return {
      previewFeedId: model.previewFeedId,
      previewUrl: model.previewUrl,
      isSingle: model.isSingle,
      footerText,
      onOpenPage: tapCover,
      onListen: () => void listen(),
      onSeeAll: seeAll,
    };
  }, [model, feed.duration, t, tapCover, listen, seeAll]);

  if (!story) return null;
  return <AutoplayFeedCard feed={feed} isActive={isActive} shouldMountVideo={shouldMountVideo} story={story} />;
}

/**
 * Listen with a preview: the player on that episode, WITH the series as the
 * queue (locks follow the usual rules - queue items carry storyState). A
 * single story is a queue of one. If the episode list can't be loaded, the
 * player opens on that one episode without a queue.
 */
async function openPreviewInPlayer(
  model: StoryCardModel,
  feed: Feed,
  language: string,
  loadEpisodes: (seriesId: number) => Promise<Feed[]>
): Promise<void> {
  const common = { language, returnTo: HOME, entry: 'home_card_listen' as const };

  if (model.isSingle) {
    const single: Feed = { ...feed, url: feed.url || model.previewUrl || '' };
    openAudioPlayer({ ...common, feed: single, queueItems: [single], queueIndex: 0 });
    return;
  }

  let plan: { items: Feed[]; index: number } | null = null;
  try {
    plan = homeListenQueue(await loadEpisodes(model.storyId), model.previewFeedId);
  } catch {
    plan = null;
  }

  if (plan) {
    const episode = plan.items[plan.index];
    const playable: Feed = episode.url ? episode : { ...episode, url: model.previewUrl || '' };
    openAudioPlayer({ ...common, feed: playable, queueItems: plan.items, queueIndex: plan.index });
    return;
  }

  // No list: just the previewed episode (the player loads its own details).
  const episodeOnly: Feed = {
    ...feed,
    id: Number(model.previewFeedId),
    url: model.previewUrl || '',
    mediaType: 'audio',
    seriesId: model.storyId,
    episodeNumber: model.previewEpisodeNumber,
    state: null,
    preview: null,
  };
  openAudioPlayer({ ...common, feed: episodeOnly });
}
