import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { getFeedThumbnailUrl } from '@/utils/feedFields';
import { formatDuration } from '@/utils/formatDuration';
import { isStorySeries } from '@/features/feed/hooks/useStories';

interface StoryTileProps {
  feed: Feed;
  width: number;
  onPress: (feed: Feed) => void;
}

/**
 * One story on the Stories page: a square cover, the title in the app
 * language, and a small label - the episode count for a series, the
 * duration for a one-off story. The cover is a plain image today; a looping
 * cover video (feed.coverVideoUrl) can replace it here later without
 * changing any caller.
 */
export default function StoryTile({ feed, width, onPress }: StoryTileProps) {
  const { t } = useTranslation();
  const { language } = useI18nStore();

  const isSeries = isStorySeries(feed);
  const title = feed.title?.[language] || feed.title?.en || '';
  const coverUrl = getFeedThumbnailUrl(feed);
  const episodeCount = feed.episodeCount ?? 0;
  const label = isSeries
    ? episodeCount === 1
      ? t('stories.episodeCountOne')
      : t('stories.episodeCountOther', { count: episodeCount })
    : formatDuration(feed.duration);

  return (
    <TouchableOpacity style={[styles.tile, { width }]} onPress={() => onPress(feed)} activeOpacity={0.85}>
      <View style={[styles.cover, { width, height: width }]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book-outline" size={36} color={goldenTempleTheme.colors.primary.DEFAULT} />
          </View>
        )}
        {/* What a tap does: a series opens its episode list, a one-off plays. */}
        <View style={styles.badge}>
          <Ionicons name={isSeries ? 'albums' : 'play'} size={14} color="#fff" />
        </View>
      </View>
      {/* minHeight keeps tiles in a row aligned whether a title takes one
          line or two. lineHeight 24 matches the Text atom's Devanagari
          value at this size, so Hindi isn't clipped (CLAUDE.md §71). */}
      <Text variant="body" weight="semibold" style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {label ? (
        <Text variant="caption" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  cover: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f7ebc4',
    ...goldenTempleTheme.shadows.md,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystemTheme.colors.primary,
  },
  title: {
    marginTop: goldenTempleTheme.spacing.sm,
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 24,
    minHeight: 48,
  },
  // No lineHeight override - see the title comment; "8 एपिसोड" needs the
  // atom's taller Devanagari line.
  label: {
    color: goldenTempleTheme.colors.text.secondary,
  },
});
