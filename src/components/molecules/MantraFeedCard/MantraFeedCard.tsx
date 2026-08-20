import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { MOOD_OPTIONS } from '@/data/moodData';

interface MantraFeedCardProps {
  feed: Feed;
  onPress?: (feed: Feed) => void;
  onLike?: (feedId: string) => void;
}

// The single, real mantra card design - ported from Mantra Explorer's own
// inline renderMantraCard (mantras.tsx, CLAUDE.md §56 Phase 4c), closing the
// fragmentation flagged since §16: FeedCard.tsx previously had its own,
// older, visually different mantra card used by Home/Search Results, while
// Mantra Explorer had this one. Both now render this same component.
//
// Deliberately presentational only, unlike AudioContentCard - navigation and
// like-handling are delegated entirely to onPress/onLike rather than baked
// in here, so each caller (Mantra Explorer, Home, Search Results) keeps
// building its own correct player-navigation params (in particular,
// search-results.tsx's own returnTo/returnParams back-navigation fix).
export default function MantraFeedCard({ feed, onPress, onLike }: MantraFeedCardProps) {
  const { language } = useI18nStore();

  // "Currently playing" indicator - narrow, read-only selectors so this only
  // re-renders on a feedId/playing-state change, not on every position tick.
  // Self-contained here (each card instance subscribes for itself) rather
  // than lifted to a parent list screen, since this is a real per-row
  // component, not a bare renderItem callback - matches RingtoneFeedCard/
  // AudioContentCard's existing self-contained-hook pattern.
  const nowPlayingFeedId = usePlaybackStore((s) => s.persistent?.nowPlaying.feedId);
  const nowPlayingIsPlaying = usePlaybackStore((s) => s.persistent?.nowPlaying.isPlaying);
  const isCurrentlyPlaying = nowPlayingFeedId === feed.id.toString() && !!nowPlayingIsPlaying;

  const mood = feed.label ? MOOD_OPTIONS.find((m) => m.label === feed.label) : undefined;

  const handlePress = () => onPress?.(feed);
  const handleLike = (event: GestureResponderEvent) => {
    event?.stopPropagation();
    onLike?.(feed.id.toString());
  };

  return (
    <TouchableOpacity
      style={[styles.mantraCard, isCurrentlyPlaying && styles.mantraCardPlaying]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Image
        source={{
          uri: feed.media?.[0]?.thumbnailUrl || feed.media?.[0]?.mediaUrl || 'https://via.placeholder.com/80x80',
        }}
        style={styles.mantraImage}
        resizeMode="cover"
      />

      <View style={styles.mantraContent}>
        <Text variant="body" weight="semibold" style={styles.mantraTitle} numberOfLines={2}>
          {feed.title ? (feed.title[language] || feed.title.en || 'Untitled Mantra') : 'Untitled Mantra'}
        </Text>
        {/* Renders only when the mantra actually has a label - no empty/
            placeholder pill for untagged content. */}
        {mood && (
          <View style={[styles.labelPill, { backgroundColor: mood.gradientColors[0] }]}>
            <Text variant="caption" weight="semibold" style={styles.labelPillText}>
              {mood.name[language as 'en' | 'hi'] || mood.name.en}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.playButton} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="play" size={20} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.likeButton, feed.isLiked && styles.likeButtonActive]}
        onPress={handleLike}
        activeOpacity={0.7}
      >
        <Ionicons
          name={feed.isLiked ? 'heart' : 'heart-outline'}
          size={18}
          color={feed.isLiked ? '#e91e63' : goldenTempleTheme.colors.text.secondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mantraCard: {
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    borderRadius: 16,
    padding: goldenTempleTheme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(212, 175, 55, 0.1)',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  // Border + tint only, deliberately no glyph/marquee per this project's own
  // animation-performance history in scrolling lists (§26).
  mantraCardPlaying: {
    borderWidth: 1.5,
    borderColor: goldenTempleTheme.colors.primary.DEFAULT,
    backgroundColor: 'rgba(255, 107, 0, 0.06)',
  },
  mantraImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: goldenTempleTheme.colors.muted.DEFAULT,
  },
  mantraContent: {
    flex: 1,
    marginLeft: goldenTempleTheme.spacing.md,
    marginRight: goldenTempleTheme.spacing.sm,
  },
  mantraTitle: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: goldenTempleTheme.spacing.xs / 2,
  },
  // Reuses moodData.ts's existing per-mood color mapping rather than a
  // separate color scheme, so a mantra's pill visually matches the mood-pill
  // grid above the list in Mantra Explorer.
  labelPill: {
    alignSelf: 'flex-start',
    borderRadius: goldenTempleTheme.borderRadius.full,
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  labelPillText: {
    color: '#ffffff',
    fontSize: 11,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: goldenTempleTheme.spacing.md,
    shadowColor: goldenTempleTheme.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: goldenTempleTheme.colors.primary[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  likeButtonActive: {
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    borderColor: '#e91e63',
    shadowColor: '#e91e63',
    shadowOpacity: 0.2,
  },
});
