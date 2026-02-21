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
import { theme } from '@/styles/theme';

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

      if (currentMedia.audioUrl) {
        setIsLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentMedia.audioUrl },
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
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: MEDIA_HEIGHT,
    backgroundColor: theme.colors.gray[200],
  },
  errorContainer: {
    width: '100%',
    height: MEDIA_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
  },
  audioButton: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
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
    left: theme.spacing.md,
  },
  navButtonRight: {
    right: theme.spacing.md,
  },
  indicators: {
    position: 'absolute',
    top: theme.spacing.md,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: theme.spacing.xs,
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
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
  },
});