import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/atoms';
import AudioContentCard from '@/components/molecules/AudioContentCard';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useStory, useSeriesEpisodes } from '@/features/feed/hooks/useStories';
import { getFeedSubtitle, getFeedThumbnailUrl } from '@/utils/feedFields';
import { formatDuration } from '@/utils/formatDuration';
import { Feed } from '@/types/feed';
import { useStoryOpener } from '@/features/stories/useStoryOpener';
import { parseStoryState, isStoryStatePlayable, unlockedSummary, storyKind } from '@/features/stories/storyLock';
import {
  buildStoryPageParams,
  parseReturnParams,
  parseStoryPageSource,
  storyPageRows,
  storyEntryForPageSource,
  STORY_PAGE_PATH,
} from '@/features/stories/storyPage';
import { rememberSeriesFreeEpisodes } from '@/utils/analytics/storyEvents';

const { width } = Dimensions.get('window');
const COVER_SIZE = Math.min(width * 0.6, 280);

/**
 * The story page - ONE screen for a series AND a single story
 * (Bhav_Bhakti_Stories_Ad_Lock_Plan_2026-11-15.md, section 11.1). Opened
 * with `storyId` (the old `seriesId` param is still read, for anything that
 * still sends it) through openStoryPage() (storyPage.ts), which always
 * passes returnTo/returnParams/source explicitly, so nothing stale from an
 * earlier visit can stick.
 *
 * Data: GET /feed/:id (it already carries the lock state). A series then
 * loads its episodes (shared cache, storiesQueryKeys.episodes); a single
 * story's list is just itself, with the same open/lock symbol, "Watch an ad
 * to unlock" row and unlock flow as an episode row.
 *
 * Header: cover, title, subtitle; a series adds the episode count, "N of M
 * unlocked" (lock on) and the "Episodes" heading - a single story shows none
 * of the three. The header is one self-contained block on purpose, so the
 * richer streaming-style header (Stories plan section 9) can replace it.
 */
export default function StoryPageScreen() {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { contentPadding } = useTabBarHeight();
  const params = useLocalSearchParams<{
    storyId?: string;
    seriesId?: string;
    returnTo?: string;
    returnParams?: string;
    source?: string;
  }>();
  const storyId = Number(params.storyId || params.seriesId) || 0;
  const listRef = useRef<FlatList<Feed>>(null);

  const storyQuery = useStory(storyId);
  const story = storyQuery.data;
  const kind = storyKind(story);
  const episodesQuery = useSeriesEpisodes(storyId, { enabled: kind === 'series' });
  const rows = useMemo(() => storyPageRows(kind, story, episodesQuery.data), [story, episodesQuery.data]);
  const { openStory } = useStoryOpener();
  // Where an episode started from this page came from (story_episode_started's entry).
  const entry = storyEntryForPageSource(params.source);
  // The player's back returns here with exactly these, so the page comes
  // back as it was - including its own back target (Home, Stories, ...).
  const pageReturnParams = useMemo(
    () =>
      buildStoryPageParams({
        storyId,
        source: parseStoryPageSource(params.source) ?? 'stories_tab',
        returnTo: params.returnTo || '/(main)/stories',
        returnParams: parseReturnParams(params.returnParams),
      }),
    [storyId, params.source, params.returnTo, params.returnParams]
  );

  // Story events carry the series' free-episode count (storyEvents.ts).
  useEffect(() => {
    if (story && kind === 'series') rememberSeriesFreeEpisodes(story.id, story.freeEpisodes);
  }, [story, kind]);

  // This screen stays mounted between visits (a hidden Tabs screen), so a
  // different story must start at the top.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [storyId]);

  const handleBack = useCallback(() => {
    // navigate, not replace - see CLAUDE.md §115.
    router.navigate({
      pathname: (params.returnTo || '/(main)/stories') as any,
      params: parseReturnParams(params.returnParams),
    });
  }, [params.returnTo, params.returnParams]);

  // Hardware back and the edge-swipe gesture go through 'hardwareBackPress';
  // same handler as the on-screen arrow (pattern from horoscope-detail.tsx).
  // useFocusEffect, since this screen never unmounts.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  const refresh = useCallback(() => {
    storyQuery.refetch();
    if (kind === 'series') episodesQuery.refetch();
  }, [storyQuery, episodesQuery, kind]);

  // Stories ad-lock: each row's lock look comes from the server's state
  // (none = the lock is off: the row looks and plays exactly as before), and
  // a tap goes through openStory (play / ad / "previous episode first").
  // A single story is its own one-item queue.
  const renderRow = useCallback(
    ({ item, index }: { item: Feed; index: number }) => {
      const state = parseStoryState(item.state);
      const lockState = state === null ? null : isStoryStatePlayable(state) ? 'open' : state === 'next' ? 'next' : 'locked';
      const isSingle = kind === 'single';
      return (
        <AudioContentCard
          feed={item}
          queueItems={rows}
          queueIndex={index}
          episodeNumber={isSingle ? null : item.episodeNumber}
          detail={formatDuration(item.duration)}
          showLike={false}
          lockState={lockState}
          lockHint={t('storyLock.unlockToListen')}
          returnTo={STORY_PAGE_PATH}
          returnParams={pageReturnParams}
          onPress={() =>
            openStory({
              feed: item,
              language,
              queueItems: rows,
              queueIndex: index,
              trigger: isSingle ? 'single_story' : 'episode_list',
              entry,
              returnTo: STORY_PAGE_PATH,
              returnParams: pageReturnParams,
            })
          }
        />
      );
    },
    [rows, pageReturnParams, openStory, language, t, kind, entry]
  );

  const renderHeader = () => {
    if (!story) return null;
    const title = story.title?.[language] || story.title?.en || '';
    const subtitle = getFeedSubtitle(story, language);
    const coverUrl = getFeedThumbnailUrl(story);
    const isSeries = kind === 'series';
    const count = story.episodeCount ?? rows.length;
    // "N of M unlocked" - only for a series while the lock is on (the server sends both).
    const summary = isSeries ? unlockedSummary(story) : null;

    return (
      <View style={styles.seriesHeader}>
        <View style={styles.cover}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <Ionicons name="book-outline" size={48} color={goldenTempleTheme.colors.primary.DEFAULT} />
          )}
        </View>
        <Text variant="h4" weight="bold" align="center" style={styles.seriesTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" align="center" style={styles.seriesSubtitle}>
            {subtitle}
          </Text>
        ) : null}
        {isSeries ? (
          <Text variant="caption" weight="semibold" align="center" style={styles.episodeCount}>
            {count === 1 ? t('stories.episodeCountOne') : t('stories.episodeCountOther', { count })}
          </Text>
        ) : null}
        {summary ? (
          <Text variant="caption" align="center" style={styles.unlockedSummary}>
            {t('storyLock.unlockedSummary', summary)}
          </Text>
        ) : null}
        {isSeries ? (
          <Text variant="h5" weight="semibold" style={styles.episodesHeading}>
            {t('stories.episodesHeading')}
          </Text>
        ) : (
          <View style={styles.singleSpacer} />
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (kind !== 'series') return null;
    if (episodesQuery.isLoading) {
      return <ActivityIndicator style={styles.inlineState} color={goldenTempleTheme.colors.primary.DEFAULT} />;
    }
    if (episodesQuery.isError) {
      return (
        <View style={styles.inlineState}>
          <Text variant="body" align="center" style={styles.stateText}>
            {t('stories.seriesLoadError')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => episodesQuery.refetch()} activeOpacity={0.8}>
            <Text weight="semibold" style={styles.retryText}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <Text variant="body" align="center" style={[styles.inlineState, styles.stateText]}>
        {t('stories.noEpisodes')}
      </Text>
    );
  };

  // Whole-screen states: the story itself is loading, failed, or is neither
  // a series nor a single story (a bad or stale id, or an episode id).
  let screenState: React.ReactNode = null;
  if (!story) {
    if (storyQuery.isLoading) {
      screenState = <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />;
    } else {
      screenState = (
        <>
          <Text variant="body" weight="medium" align="center" style={styles.stateText}>
            {storyQuery.isError ? t('stories.storyLoadError') : t('stories.storyUnavailable')}
          </Text>
          {storyQuery.isError ? (
            <TouchableOpacity style={styles.retryButton} onPress={() => storyQuery.refetch()} activeOpacity={0.8}>
              <Text weight="semibold" style={styles.retryText}>
                {t('common.retry')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      );
    }
  } else if (kind !== 'series' && kind !== 'single') {
    screenState = (
      <Text variant="body" weight="medium" align="center" style={styles.stateText}>
        {t('stories.storyUnavailable')}
      </Text>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text variant="h5" weight="semibold" style={styles.topBarTitle}>
          {t('stories.title')}
        </Text>
      </View>

      {screenState ? (
        <View style={styles.screenState}>{screenState}</View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRow}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={storyQuery.isRefetching || (kind === 'series' && episodesQuery.isRefetching)}
              onRefresh={refresh}
              tintColor={goldenTempleTheme.colors.primary.DEFAULT}
              colors={[goldenTempleTheme.colors.primary.DEFAULT]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.primary[50],
  },
  // No lineHeight override: the Text atom already gives Devanagari a taller
  // line height, and a smaller fixed value clips Hindi (CLAUDE.md §71).
  topBarTitle: {
    color: goldenTempleTheme.colors.text.primary,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
  },
  seriesHeader: {
    alignItems: 'center',
    paddingTop: goldenTempleTheme.spacing.lg,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7ebc4',
    ...goldenTempleTheme.shadows.md,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  // The header centres its content (alignItems: 'center'), which makes
  // each text measure its own width - and Android under-measures
  // Devanagari, cutting off the end of a Hindi line (CLAUDE.md §71).
  // alignSelf: 'stretch' gives the title and subtitle the full width
  // (still centred by align="center"), with any number of lines. No
  // lineHeight overrides: the Text atom's own Devanagari line heights are
  // taller than the fixed values these used to set, which also clipped.
  seriesTitle: {
    alignSelf: 'stretch',
    marginTop: goldenTempleTheme.spacing.md,
    color: goldenTempleTheme.colors.text.primary,
  },
  seriesSubtitle: {
    alignSelf: 'stretch',
    marginTop: goldenTempleTheme.spacing.xs,
    paddingBottom: 2,
    color: goldenTempleTheme.colors.text.secondary,
  },
  episodeCount: {
    alignSelf: 'stretch',
    marginTop: goldenTempleTheme.spacing.sm,
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  // "N of M unlocked". Full width + a line-height floor (CLAUDE.md §71).
  unlockedSummary: {
    alignSelf: 'stretch',
    marginTop: 4,
    lineHeight: 20,
    minHeight: 20,
    color: goldenTempleTheme.colors.text.secondary,
  },
  // A single story has no "Episodes" heading: a little room before its one row.
  singleSpacer: {
    height: goldenTempleTheme.spacing.lg,
  },
  episodesHeading: {
    alignSelf: 'stretch',
    marginTop: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.sm,
    color: goldenTempleTheme.colors.text.primary,
  },
  screenState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    gap: goldenTempleTheme.spacing.sm,
  },
  inlineState: {
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.lg,
    gap: goldenTempleTheme.spacing.sm,
  },
  stateText: {
    color: goldenTempleTheme.colors.text.secondary,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderRadius: 20,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
  },
  retryText: {
    color: '#fff',
  },
});
