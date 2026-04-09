import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Text } from '@/components/atoms';
import FeedMedia from '../FeedMedia/FeedMedia';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useTranslation } from '@/hooks/useTranslation';

interface WallpaperFeedCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
  onPress?: (feed: Feed) => void;
}

const { width } = Dimensions.get('window');

export default function WallpaperFeedCard({
  feed,
  onLike,
  onShare,
  onDownload,
  onPress,
}: WallpaperFeedCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toggleLike, incrementDownload, incrementShare, incrementView } = useFeedStore();
  const { language } = useTranslation();

  // Auto-slide functionality for multiple images
  useEffect(() => {
    // Only enable auto-sliding if there are multiple media items
    if (feed.media && feed.media.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentMediaIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % feed.media.length;
          return nextIndex;
        });
      }, 5000); // 5 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [feed.media.length]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleNextMedia = () => {
    if (feed.media.length > 1) {
      setCurrentMediaIndex((prevIndex) => (prevIndex + 1) % feed.media.length);
    }
  };

  const handlePrevMedia = () => {
    if (feed.media.length > 1) {
      setCurrentMediaIndex((prevIndex) => (prevIndex - 1 + feed.media.length) % feed.media.length);
    }
  };

  const handleLike = () => {
    console.log('❤️ Heart button pressed for wallpaper:', feed.id, 'isLiked:', feed.isLiked);

    if (onLike) {
      onLike(feed.id.toString());
    } else {
      if (isLiking) return;
      setIsLiking(true);

      const performLike = async () => {
        try {
          if (feed.isLiked) {
            await feedService.unlikeFeed(feed.id.toString());
          } else {
            await feedService.likeFeed(feed.id.toString());
          }
          toggleLike(feed.id.toString());
        } catch (error) {
          console.error('Error liking wallpaper:', error);
          Alert.alert('Error', 'Failed to like the wallpaper. Please try again.');
        } finally {
          setIsLiking(false);
        }
      };

      performLike();
    }
  };

  const handleShare = async () => {
    try {
      await feedService.shareFeed(feed.id.toString(), { platform: 'native_share' });
      incrementShare(feed.id.toString());

      const title = feed.title ? (feed.title[language] || feed.title.en || '') : '';
      const result = await Share.share({
        message: title
          ? `Check out this beautiful wallpaper: ${title}\n\nShared from Bhav Bhakti App`
          : 'Check out this amazing wallpaper from Bhav Bhakti App!',
        url: feed.media[0]?.mediaUrl,
      });

      if (result.action === Share.sharedAction) {
        onShare?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error sharing wallpaper:', error);
      Alert.alert('Error', 'Failed to share the wallpaper. Please try again.');
    }
  };

  const handleDownload = async () => {
    if (isDownloading || !feed.allowDownloads) return;

    setIsDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save wallpaper to your gallery.');
        return;
      }

      const mediaToDownload = feed.media[0];
      if (!mediaToDownload) return;

      const fileUri = FileSystem?.documentDirectory + `wallpaper_${feed.id}_${mediaToDownload.id}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(
        mediaToDownload.mediaUrl,
        fileUri
      );

      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Success', 'Wallpaper saved to your gallery!');

        await feedService.downloadFeed(feed.id.toString());
        incrementDownload(feed.id.toString());
        onDownload?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error downloading wallpaper:', error);
      Alert.alert('Error', 'Failed to download wallpaper. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePress = async () => {
    try {
      await feedService.viewFeed(feed.id.toString());
      incrementView(feed.id.toString());
    } catch (error) {
      console.error('Error tracking view:', error);
    }

    onPress?.(feed);
  };

  return (
    <View style={styles.container}>
      {/* Main Wallpaper Image with gap from container */}
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
          <FeedMedia
            media={feed.media.length > 1 ? [feed.media[currentMediaIndex]] : feed.media}
            onMediaPress={handlePress}
            autoPlay={false}
            showControls={false}
            showCenterPlayButton={false}
            style={styles.wallpaperImage}
          />
        </TouchableOpacity>

        {/* Side Navigation Buttons for multiple images */}
        {feed.media.length > 1 && (
          <>
            {/* Previous Button */}
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={handlePrevMedia}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={handleNextMedia}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {/* Media Indicators for multiple images */}
        {feed.media.length > 1 && (
          <View style={styles.indicators}>
            {feed.media.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentMediaIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Content Section Below Image */}
      <View style={styles.contentContainer}>
        {/* Title (if available) */}
        {feed.title && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption} numberOfLines={1}>
              {feed.title[language] || feed.title.en || 'Beautiful Wallpaper'}
            </Text>
          </View>
        )}

        {/* Description (if available) - show multilingual content */}
        {feed.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description} numberOfLines={2}>
              {typeof feed.description === 'string'
                ? feed.description
                : feed.description?.[language] || feed.description?.en || 'Beautiful wallpaper'
              }
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Like Button */}
          <TouchableOpacity
            style={[styles.actionButton, feed.isLiked && styles.actionButtonLiked]}
            onPress={handleLike}
            activeOpacity={0.8}
          >
            <Ionicons
              name={feed.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={feed.isLiked ? '#C41E3A' : '#8B7355'}
            />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={22} color="#8B7355" />
          </TouchableOpacity>

          {/* Download Button */}
          {feed.allowDownloads && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownload}
              disabled={isDownloading}
              activeOpacity={0.8}
            >
              <Ionicons
                name="download-outline"
                size={22}
                color="#8B7355"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7ebc4',
    borderRadius: 20,
    padding: 8,
    marginBottom: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E8DDD1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  wallpaperImage: {
    width: '100%',
    height: 350,
    backgroundColor: '#F5E6D3',
  },
  contentContainer: {
    paddingHorizontal: 4,
  },
  captionContainer: {
    marginBottom: 8,
  },
  caption: {
    color: '#C41E3A',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  description: {
    color: '#8B7355',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8DDD1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonLiked: {
    backgroundColor: 'rgba(196, 30, 58, 0.1)',
  },
  indicators: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
});