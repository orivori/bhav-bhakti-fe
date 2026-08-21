import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { designSystemTheme } from '@/styles/designSystemTheme';
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

      {/* height matches mantraImage exactly, so justifyContent:space-between
          pins the title to the top and the label pill to the bottom, flush
          with the thumbnail's own top/bottom edges - replaces the old
          vertically-centered flow-column layout. A single child (no pill)
          collapses to top-alignment under space-between with no extra
          conditional needed. */}
      <View style={styles.mantraContent}>
        {/* Same QueueSheet-style "currently playing" language as
            AudioContentCard (peach tint + bold/terracotta title, no icon -
            the trailing volume icon was removed from all three feed cards,
            QueueSheet's own icon is unaffected), replacing the old border
            treatment. */}
        <Text
          variant="body"
          weight={isCurrentlyPlaying ? 'bold' : 'semibold'}
          style={[styles.mantraTitle, isCurrentlyPlaying && styles.mantraTitlePlaying]}
          numberOfLines={2}
        >
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
        <Ionicons name="play" size={16} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.likeButton, feed.isLiked && styles.likeButtonActive]}
        onPress={handleLike}
        activeOpacity={0.7}
      >
        <Ionicons
          name={feed.isLiked ? 'heart' : 'heart-outline'}
          size={14}
          color={feed.isLiked ? '#e91e63' : goldenTempleTheme.colors.text.secondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Total height held fixed at ~90px (52->64 thumbnail growth offset by a
  // tighter paddingVertical, same net height as the prior 80%-reduction
  // pass) - paddingHorizontal and the row `gap` also brought in line with
  // AudioContentCard's tighter spacing, replacing the old per-element
  // marginLeft/marginRight/marginRight on mantraContent/playButton below.
  mantraCard: {
    backgroundColor: '#f7ebc4', // same fill as SearchBar/RingtoneFeedCard/AudioContentCard
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 12,
    gap: 12,
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
  // Same QueueSheet/AudioContentCard "currently playing" language (peach
  // tint only) - replaces the old border+orange-wash treatment.
  mantraCardPlaying: {
    backgroundColor: designSystemTheme.colors.secondary,
  },
  // Grown back toward the pre-reduction 64x64 (from the last pass's 52x52) -
  // paired with mantraCard's tighter paddingVertical above, this is what
  // gives the thumbnail real visual dominance within the still-fixed ~90px
  // card height, instead of just being a smaller image with lots of
  // padding around it.
  mantraImage: {
    width: 64,
    height: 64,
    borderRadius: 11,
    backgroundColor: goldenTempleTheme.colors.muted.DEFAULT,
  },
  // height matches mantraImage exactly (both then centered identically by
  // mantraCard's own alignItems:'center') so justifyContent:space-between
  // pins the title to the top and the label pill to the bottom, flush with
  // the thumbnail's edges - see the render JSX comment. marginLeft/
  // marginRight removed in favor of mantraCard's own row `gap` above.
  mantraContent: {
    flex: 1,
    height: 64,
    justifyContent: 'space-between',
  },
  // flex:1 dropped along with titleRow (the icon it used to sit beside is
  // gone) - Text now sizes to its own content again within mantraContent's
  // column layout, letting justifyContent:space-between do its job cleanly
  // (title's natural height at top, pill at bottom) instead of stretching.
  mantraTitle: {
    color: goldenTempleTheme.colors.text.primary,
  },
  // Matches QueueSheet's titleActive exactly (bold + terracotta) - weight
  // itself is set on the Text element (see render), not here.
  mantraTitlePlaying: {
    color: designSystemTheme.colors.primary,
  },
  // Reuses moodData.ts's existing per-mood color mapping rather than a
  // separate color scheme, so a mantra's pill visually matches the mood-pill
  // grid above the list in Mantra Explorer.
  // minWidth is a floor only - `full` borderRadius (9999) plus a short word
  // (especially Hindi, e.g. "रक्षा"/"शक्ति") with no minWidth let the pill's
  // fully-rounded ends collapse it into a near-circle instead of reading as
  // a rounded rectangle. alignSelf:'flex-start' + no width cap still lets
  // it grow naturally for longer text (e.g. "सकारात्मकता"/"Positivity").
  // marginTop dropped - mantraContent's own space-between now owns all
  // spacing between the title row and this pill.
  labelPill: {
    alignSelf: 'flex-start',
    minWidth: 44,
    alignItems: 'center',
    borderRadius: goldenTempleTheme.borderRadius.full,
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: 1,
  },
  // lineHeight explicitly tightened (was inheriting the Text atom's
  // caption-variant lineHeight:20, since the custom style below only
  // overrode fontSize, not lineHeight) - that inherited 20px line box, not
  // paddingVertical, was the actual dominant reason the pill read as tall/
  // over-rounded despite an 11px font. Now close to the font's own height.
  labelPillText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 13,
  },
  // 80% of the old 48x48/borderRadius:24, kept proportional to the
  // thumbnail. marginRight dropped - mantraCard's own row `gap` now spaces
  // this from likeButton (and from mantraContent on the other side).
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: goldenTempleTheme.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // 80% of the old 44x44/borderRadius:22, same proportional-scaling reason
  // as playButton above.
  likeButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
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
