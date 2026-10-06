import React, { useCallback, useEffect, useRef } from 'react';
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
import { useStorySeries, useSeriesEpisodes, isStorySeries } from '@/features/feed/hooks/useStories';
import { getFeedSubtitle, getFeedThumbnailUrl } from '@/utils/feedFields';
import { formatDuration } from '@/utils/formatDuration';
import { Feed } from '@/types/feed';

const { width } = Dimensions.get('window');
const COVER_SIZE = Math.min(width * 0.6, 280);

/**
 * One story series (Bhav_Bhakti_Stories_Plan.md, phase 4, the MVP series
 * screen): a header with the cover, title, subtitle and episode count, then
 * the episodes in order. Tapping an episode plays it with the whole series
 * as the playback queue. The header is one self-contained block on purpose,
 * so the richer streaming-style header (section 9) can replace it later.
 */
export default function StorySeriesScreen() {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { contentPadding } = useTabBarHeight();
  const params = useLocalSearchParams<{ seriesId?: string; returnTo?: string }>();
  const seriesId = Number(params.seriesId) || 0;
  const listRef = useRef<FlatList<Feed>>(null);

  const seriesQuery = useStorySeries(seriesId);
  const episodesQuery = useSeriesEpisodes(seriesId);
  const series = seriesQuery.data;
  const episodes = episodesQuery.data ?? [];

  // This screen stays mounted between visits (a hidden Tabs screen), so a
  // different series must start at the top.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [seriesId]);

  const handleBack = useCallback(() => {
    // navigate, not replace - see CLAUDE.md §115.
    router.navigate((params.returnTo || '/(main)/stories') as any);
  }, [params.returnTo]);

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
    seriesQuery.refetch();
    episodesQuery.refetch();
  }, [seriesQuery, episodesQuery]);

  const renderEpisode = useCallback(
    ({ item, index }: { item: Feed; index: number }) => (
      <AudioContentCard
        feed={item}
        queueItems={episodes}
        queueIndex={index}
        episodeNumber={item.episodeNumber}
        detail={formatDuration(item.duration)}
        showLike={false}
        returnTo="/(main)/story-series"
        returnParams={{ seriesId: String(seriesId) }}
      />
    ),
    [episodes, seriesId]
  );

  const renderHeader = () => {
    if (!series) return null;
    const title = series.title?.[language] || series.title?.en || '';
    const subtitle = getFeedSubtitle(series, language);
    const coverUrl = getFeedThumbnailUrl(series);
    const count = series.episodeCount ?? episodes.length;

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
        <Text variant="caption" weight="semibold" align="center" style={styles.episodeCount}>
          {count === 1 ? t('stories.episodeCountOne') : t('stories.episodeCountOther', { count })}
        </Text>
        <Text variant="h5" weight="semibold" style={styles.episodesHeading}>
          {t('stories.episodesHeading')}
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
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

  // Whole-screen states: the series itself is loading, failed, or isn't a
  // series (a bad or stale id).
  let screenState: React.ReactNode = null;
  if (!series) {
    if (seriesQuery.isLoading) {
      screenState = <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />;
    } else {
      screenState = (
        <>
          <Text variant="body" weight="medium" align="center" style={styles.stateText}>
            {seriesQuery.isError ? t('stories.seriesLoadError') : t('stories.seriesUnavailable')}
          </Text>
          {seriesQuery.isError ? (
            <TouchableOpacity style={styles.retryButton} onPress={() => seriesQuery.refetch()} activeOpacity={0.8}>
              <Text weight="semibold" style={styles.retryText}>
                {t('common.retry')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      );
    }
  } else if (!isStorySeries(series)) {
    screenState = (
      <Text variant="body" weight="medium" align="center" style={styles.stateText}>
        {t('stories.seriesUnavailable')}
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
          data={episodes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEpisode}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={seriesQuery.isRefetching || episodesQuery.isRefetching}
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
  topBarTitle: {
    color: goldenTempleTheme.colors.text.primary,
    lineHeight: 28,
    minHeight: 28,
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
  // §71 floors on every text line that can be Hindi.
  seriesTitle: {
    marginTop: goldenTempleTheme.spacing.md,
    color: goldenTempleTheme.colors.text.primary,
    lineHeight: 32,
  },
  seriesSubtitle: {
    marginTop: goldenTempleTheme.spacing.xs,
    color: goldenTempleTheme.colors.text.secondary,
    lineHeight: 22,
  },
  episodeCount: {
    marginTop: goldenTempleTheme.spacing.sm,
    color: goldenTempleTheme.colors.primary.DEFAULT,
    lineHeight: 18,
    minHeight: 18,
  },
  episodesHeading: {
    alignSelf: 'flex-start',
    marginTop: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.sm,
    color: goldenTempleTheme.colors.text.primary,
    lineHeight: 28,
    minHeight: 28,
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
    lineHeight: 22,
    minHeight: 22,
  },
});
