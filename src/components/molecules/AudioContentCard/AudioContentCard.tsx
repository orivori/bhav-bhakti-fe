import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { usePlaybackStore, QueueItem } from '@/store/playbackStore';

// Shared by both this card's own display fields and the queue-item mapping
// in handlePress below - kept as one function so a list of N cards resolving
// title/audio/thumbnail for themselves and handlePress resolving the same
// fields for all N feeds (to seed the queue) can never drift apart into two
// slightly different definitions of "this feed's title."
//
// Matches audio-player.tsx's own getContentData() media lookup (checks both
// 'audio' and 'image_audio'), not the narrower 'audio'-only checks in
// index.tsx/search-results.tsx - Aarti/Bhajan content may use either shape.
const resolveQueueItem = (feed: Feed, language: string): QueueItem => {
  const title = feed.title?.[language] || feed.title?.en || feed.caption || 'Untitled';
  const audioMedia = feed.media?.find(m => m.type === 'audio' || m.type === 'image_audio');
  const audioUrl = audioMedia?.mediaUrl || audioMedia?.audioUrl || '';
  const thumbnailUrl = audioMedia?.thumbnailUrl || (audioMedia?.mediaUrl !== audioUrl ? audioMedia?.mediaUrl : undefined);

  return { feedId: feed.id.toString(), title, audioUrl, thumbnailUrl };
};

interface AudioContentCardProps {
  feed: Feed;
  // Which Audio hub sub-tab this card lives in - used only to build the
  // DEFAULT returnParams below (when returnTo/returnParams aren't passed
  // explicitly), so audio-player.tsx's back button returns to the right
  // sub-tab. Optional since a caller that passes its own returnTo/
  // returnParams (e.g. search-results.tsx) doesn't need this at all.
  subTab?: 'aarti' | 'bhajan';
  // The full currently-loaded list this card belongs to, and this card's
  // position within it - used only to seed the playback queue on tap (see
  // playbackStore.ts's queue state). AartiTabContent/BhajanTabContent pass
  // their live `items`/index straight from FlatList's renderItem, so a tap
  // always queues whatever's actually loaded right now (post-refresh/
  // pagination), never a stale snapshot from an earlier render. Omitted
  // entirely (not a synthetic 1-item array) by callers whose list isn't a
  // real playback queue - e.g. search-results.tsx's mixed-type results -
  // matching the same queue-less pattern mantra playback already uses.
  queueItems?: Feed[];
  queueIndex?: number;
  // Override for the player's back-navigation target - when omitted,
  // defaults to today's hardcoded Audio hub behavior (/(main)/ringtones +
  // {subTab}), so AartiTabContent/BhajanTabContent are unaffected. Lets
  // other callers (search-results.tsx) send back-navigation to themselves
  // instead, carrying whatever state they need (e.g. the search query) via
  // returnParams.
  returnTo?: string;
  returnParams?: Record<string, string>;
}

// Deliberately basic, unlike RingtoneFeedCard - functional first, no design
// polish yet. Also deliberately NOT an inline player like RingtoneFeedCard:
// Aarti/Bhajan are persistent-player content (Spotify/YouTube-Music-style,
// survives backgrounding, shows in the MiniPlayer), so tapping this card
// navigates into the shared audio-player.tsx screen rather than playing
// in-list, matching how mantra cards already behave.
export default function AudioContentCard({ feed, subTab, queueItems, queueIndex, returnTo, returnParams }: AudioContentCardProps) {
  const { language } = useI18nStore();

  const { title, audioUrl, thumbnailUrl } = resolveQueueItem(feed, language);

  const handlePress = useCallback(() => {
    // Seed the queue from the full list as it stands right now, before
    // navigating - only when the caller actually passed a real queue.
    // Mantra entry points (mantras.tsx, index.tsx, search-results.tsx)
    // deliberately never call this either, so mantra playback stays
    // queue-less (see playbackStore.ts's `queue` field comment); this
    // component now follows the same rule when it's used somewhere the
    // list isn't a meaningful playback queue.
    if (queueItems && queueIndex !== undefined) {
      usePlaybackStore.getState().setQueue(
        queueItems.map((item) => resolveQueueItem(item, language)),
        queueIndex
      );
    }

    const effectiveReturnTo = returnTo ?? '/(main)/ringtones';
    const effectiveReturnParams = returnParams ?? (subTab ? { subTab } : undefined);

    router.push({
      pathname: '/(main)/audio-player',
      params: {
        feedId: feed.id.toString(),
        title,
        audioUrl,
        thumbnailUrl: thumbnailUrl || '',
        autoPlay: 'true',
        // See audio-player.tsx's back-button handling: without these, back
        // falls through to router.back(), which is the known bug (always
        // lands on Home regardless of where the user actually came from).
        returnTo: effectiveReturnTo,
        ...(effectiveReturnParams ? { returnParams: JSON.stringify(effectiveReturnParams) } : {}),
      },
    });
  }, [feed.id, title, audioUrl, thumbnailUrl, subTab, queueItems, queueIndex, language, returnTo, returnParams]);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="musical-notes" size={22} color={goldenTempleTheme.colors.primary.DEFAULT} />
        </View>
      )}
      <Text variant="body" weight="medium" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Ionicons name="play-circle" size={30} color={goldenTempleTheme.colors.primary.DEFAULT} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: goldenTempleTheme.colors.muted[200],
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: '#1A1A1A',
  },
});
