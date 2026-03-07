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
                    size={64}
                    color="#FF6B35"
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
    borderRadius: 0, // Remove border radius since parent card handles it
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
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  audioIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  audioPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  audioLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
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
    transform: [{ translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navButtonLeft: {
    left: goldenTempleTheme.spacing.md,
  },
  navButtonRight: {
    right: goldenTempleTheme.spacing.md,
  },
  indicators: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});