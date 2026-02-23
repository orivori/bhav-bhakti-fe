import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Audio } from 'expo-av';
import { Text } from '@/components/atoms';
import { FeedMedia as FeedMediaType } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface FeedMediaProps {
  media: FeedMediaType[];
  onMediaPress?: (mediaIndex: number) => void;
  autoPlay?: boolean;
  showControls?: boolean;
  style?: any;
}

const { width } = Dimensions.get('window');
const MEDIA_HEIGHT = width * 1.2; // 4:5 aspect ratio similar to Instagram

export default function FeedMedia({
  media,
  onMediaPress,
  autoPlay = false,
  showControls = true,
  style,
}: FeedMediaProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const currentMedia = media[currentMediaIndex];

  const handleNextMedia = () => {
    if (currentMediaIndex < media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
      setIsPlaying(false);
      if (sound) {
        sound.unloadAsync();
        setSound(null);
      }
    }
  };

  const handlePrevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
      setIsPlaying(false);
      if (sound) {
        sound.unloadAsync();
        setSound(null);
      }
    }
  };

  const handleMediaPress = () => {
    if (onMediaPress) {
      onMediaPress(currentMediaIndex);
    }
  };

  const handlePlayAudio = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        return;
      }

      // For pure audio media, use mediaUrl. For image_audio, use audioUrl
      const audioUri = currentMedia.audioUrl || currentMedia.mediaUrl;

      if (audioUri) {
        setIsLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setSound(null);
          }
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMedia = () => {
    switch (currentMedia.type) {
      case 'image':
        return (
          <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.9}>
            <Image
              source={{ uri: currentMedia.mediaUrl }}
              style={styles.media}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );

      case 'video':
        return (
          <Video
            source={{ uri: currentMedia.mediaUrl }}
            style={styles.media}
            useNativeControls={showControls}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={autoPlay}
            posterSource={
              currentMedia.thumbnailUrl
                ? { uri: currentMedia.thumbnailUrl }
                : undefined
            }
          />
        );

      case 'audio':
        return (
          <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.9}>
            {currentMedia.thumbnailUrl ? (
              // Mantra with thumbnail - show thumbnail with play button overlay (like the user's image)
              <View style={styles.mantraContainer}>
                <Image
                  source={{ uri: currentMedia.thumbnailUrl }}
                  style={styles.media}
                  resizeMode="cover"
                />

                {/* Subtle overlay for better play button visibility */}
                <View style={styles.mantraOverlay} />

                {/* Duration Badge (top right) */}
                {currentMedia.duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {Math.floor(currentMedia.duration / 60)}:{(currentMedia.duration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                )}

                {/* Large Orange Play Button (center) */}
                <View style={styles.mantraPlayOverlay}>
                  <TouchableOpacity
                    style={styles.mantraPlayButton}
                    onPress={handleMediaPress}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="large" />
                    ) : (
                      <Ionicons
                        name="play"
                        size={32}
                        color="#fff"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Audio without thumbnail - show icon design
              <View style={styles.audioContainer}>
                <View style={styles.audioIconContainer}>
                  <Ionicons
                    name="musical-notes"
                    size={60}
                    color="rgba(218, 165, 32, 0.8)"
                  />
                </View>
                <TouchableOpacity
                  style={styles.audioPlayButton}
                  onPress={handlePlayAudio}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={28}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>
                <Text style={styles.audioLabel}>Sacred Audio</Text>
              </View>
            )}
          </TouchableOpacity>
        );

      case 'image_audio':
        return (
          <View>
            <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.9}>
              <Image
                source={{ uri: currentMedia.mediaUrl }}
                style={styles.media}
                resizeMode="cover"
              />
            </TouchableOpacity>
            {currentMedia.audioUrl && (
              <TouchableOpacity
                style={styles.audioButton}
                onPress={handlePlayAudio}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={24}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.errorContainer}>
            <Text variant="body" color="secondary">
              Unsupported media type
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderMedia()}

      {/* Media Navigation */}
      {media.length > 1 && (
        <>
          {currentMediaIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={handlePrevMedia}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {currentMediaIndex < media.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={handleNextMedia}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Media Indicators */}
          <View style={styles.indicators}>
            {media.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentMediaIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </>
      )}

      {/* Duration Badge for Videos */}
      {currentMedia.type === 'video' && currentMedia.duration && (
        <View style={styles.durationBadge}>
          <Text variant="caption" style={styles.durationText}>
            {Math.floor(currentMedia.duration / 60)}:
            {(currentMedia.duration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderRadius: goldenTempleTheme.borderRadius.md,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: MEDIA_HEIGHT,
    backgroundColor: 'rgba(218, 165, 32, 0.1)',
  },
  errorContainer: {
    width: '100%',
    height: MEDIA_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(218, 165, 32, 0.1)',
  },
  audioContainer: {
    width: '100%',
    height: MEDIA_HEIGHT,
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(218, 165, 32, 0.4)',
    borderRadius: goldenTempleTheme.borderRadius.lg,
  },
  audioIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(218, 165, 32, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  audioPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  audioLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: goldenTempleTheme.colors.text.primary,
  },
  // Mantra-specific styles (matching user's image design)
  mantraContainer: {
    position: 'relative',
    width: '100%',
    height: MEDIA_HEIGHT,
    borderRadius: goldenTempleTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  mantraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle overlay for better contrast
  },
  mantraPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mantraPlayButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B35', // Orange color like in the user's image
    justifyContent: 'center',
    alignItems: 'center',
    ...goldenTempleTheme.shadows.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  audioButton: {
    position: 'absolute',
    bottom: goldenTempleTheme.spacing.md,
    right: goldenTempleTheme.spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonLeft: {
    left: goldenTempleTheme.spacing.md,
  },
  navButtonRight: {
    right: goldenTempleTheme.spacing.md,
  },
  indicators: {
    position: 'absolute',
    top: goldenTempleTheme.spacing.md,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: goldenTempleTheme.spacing.xs,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
  },
  durationBadge: {
    position: 'absolute',
    bottom: goldenTempleTheme.spacing.md,
    left: goldenTempleTheme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: goldenTempleTheme.spacing.xs,
    borderRadius: goldenTempleTheme.borderRadius.sm,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});