import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { useTranslation } from '@/hooks/useTranslation';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface AudioContentCardProps {
  feed: Feed;
  // Which Audio hub sub-tab this card lives in - used only to tell
  // audio-player.tsx's back button which sub-tab to return to (see
  // CLAUDE.md's back-navigation notes). Not used for anything else here.
  subTab: 'aarti' | 'bhajan';
}

// Deliberately basic, unlike RingtoneFeedCard - functional first, no design
// polish yet. Also deliberately NOT an inline player like RingtoneFeedCard:
// Aarti/Bhajan are persistent-player content (Spotify/YouTube-Music-style,
// survives backgrounding, shows in the MiniPlayer), so tapping this card
// navigates into the shared audio-player.tsx screen rather than playing
// in-list, matching how mantra cards already behave.
export default function AudioContentCard({ feed, subTab }: AudioContentCardProps) {
  const { language } = useTranslation();

  const title = feed.title?.[language] || feed.title?.en || feed.caption || 'Untitled';

  // Matches audio-player.tsx's own getContentData() media lookup (checks
  // both 'audio' and 'image_audio'), not the narrower 'audio'-only checks in
  // index.tsx/search-results.tsx - Aarti/Bhajan content may use either shape.
  const audioMedia = feed.media?.find(m => m.type === 'audio' || m.type === 'image_audio');
  const audioUrl = audioMedia?.mediaUrl || audioMedia?.audioUrl || '';
  const thumbnailUrl = audioMedia?.thumbnailUrl || (audioMedia?.mediaUrl !== audioUrl ? audioMedia?.mediaUrl : undefined);

  const handlePress = useCallback(() => {
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
        returnTo: '/(main)/ringtones',
        returnParams: JSON.stringify({ subTab }),
      },
    });
  }, [feed.id, title, audioUrl, thumbnailUrl, subTab]);

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
