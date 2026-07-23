import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Text } from '@/components/atoms';
import { usePlaybackStore } from '@/store/playbackStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function MiniPlayer() {
  const { tabBarHeight } = useTabBarHeight();
  const pathname = usePathname();

  // Ringtones register in the store's separate `ephemeral` slot, not
  // `persistent` - reading only `persistent` here means a ringtone can
  // never surface in this UI by construction, not just by convention.
  const slot = usePlaybackStore((state) => state.persistent);
  const clearNowPlaying = usePlaybackStore((state) => state.clearNowPlaying);

  // Don't show the mini-player while the user is already looking at the
  // full-screen player for this same content - it would be a redundant,
  // cramped duplicate of controls already on screen.
  if (!slot || pathname === '/audio-player') {
    return null;
  }

  const { nowPlaying, controls: activeControls } = slot;

  const progress = nowPlaying.durationSeconds > 0
    ? nowPlaying.positionSeconds / nowPlaying.durationSeconds
    : 0;

  const handleBodyPress = () => {
    router.push({
      pathname: '/(main)/audio-player',
      params: { feedId: nowPlaying.feedId },
    });
  };

  const handlePlayPause = () => {
    if (nowPlaying.isPlaying) {
      activeControls.pause();
    } else {
      activeControls.resume();
    }
  };

  const handleStop = () => {
    activeControls.stop();
    clearNowPlaying(nowPlaying.feedId);
  };

  return (
    <View style={[styles.container, { bottom: tabBarHeight }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
      </View>

      <TouchableOpacity style={styles.body} onPress={handleBodyPress} activeOpacity={0.85}>
        {nowPlaying.thumbnailUrl ? (
          <Image source={{ uri: nowPlaying.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Ionicons name="musical-notes" size={18} color="#C41E3A" />
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>{nowPlaying.title}</Text>
        {nowPlaying.counter && (
          <Text style={styles.counter}>
            {nowPlaying.counter.chantCount}/{nowPlaying.counter.targetCount}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton} onPress={handlePlayPause} activeOpacity={0.7}>
        <Ionicons name={nowPlaying.isPlaying ? 'pause' : 'play'} size={22} color="#C41E3A" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton} onPress={handleStop} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color="#8B7355" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff6da',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(139, 115, 85, 0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C41E3A',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  thumbnailFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4E37',
  },
  counter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355',
    marginRight: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
