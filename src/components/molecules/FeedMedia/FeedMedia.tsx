import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { getFeedThumbnailUrl } from '@/utils/feedFields';

interface FeedMediaProps {
  // Renders the feed's single media item (url/mediaType/thumbnail/duration).
  feed: Feed;
  onMediaPress?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
  showCenterPlayButton?: boolean;
  style?: any;
}

const { width } = Dimensions.get('window');
const MEDIA_HEIGHT = width * 1.2; // 4:5 aspect ratio similar to Instagram

export default function FeedMedia({
  feed,
  onMediaPress,
  autoPlay = false,
  showControls = true,
  showCenterPlayButton = true,
  style,
}: FeedMediaProps) {
  const thumbnailUrl = getFeedThumbnailUrl(feed);
  const duration = feed.duration;

  const handleMediaPress = () => {
    if (onMediaPress) {
      onMediaPress();
    }
  };

  const renderMedia = () => {
    switch (feed.mediaType) {
      case 'image':
        return (
          <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.9}>
            <Image
              source={{ uri: feed.url }}
              style={styles.media}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );

      case 'video':
        return (
          <Video
            source={{ uri: feed.url }}
            style={styles.media}
            useNativeControls={showControls}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={autoPlay}
            posterSource={
              thumbnailUrl
                ? { uri: thumbnailUrl }
                : undefined
            }
          />
        );

      case 'audio':
        return (
          <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.9}>
            {thumbnailUrl ? (
              // Mantra with thumbnail - show thumbnail with play button overlay (like the user's image)
              <View style={styles.mantraContainer}>
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.media}
                  resizeMode="cover"
                />

                {/* Subtle overlay for better play button visibility */}
                <View style={styles.mantraOverlay} />

                {/* Duration Badge (top right) */}
                {duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                )}

                {/* Large Orange Play Button (center) - only show if enabled */}
                {showCenterPlayButton && (
                  <View style={styles.mantraPlayOverlay}>
                    <TouchableOpacity
                      style={styles.mantraPlayButton}
                      onPress={handleMediaPress}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="play"
                        size={32}
                        color="#fff"
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  </View>
                )}
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
                  onPress={handleMediaPress}
                >
                  <Ionicons
                    name="play"
                    size={28}
                    color="#fff"
                  />
                </TouchableOpacity>
                <Text style={styles.audioLabel}>Sacred Audio</Text>
              </View>
            )}
          </TouchableOpacity>
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

      {/* Duration Badge for Videos */}
      {feed.mediaType === 'video' && duration && (
        <View style={styles.durationBadge}>
          <Text variant="caption" style={styles.durationText}>
            {Math.floor(duration / 60)}:
            {(duration % 60).toString().padStart(2, '0')}
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