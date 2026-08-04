import React, { useState, useEffect, useRef } from 'react';
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
import { Text } from '@/components/atoms';
import FeedMedia from '../FeedMedia/FeedMedia';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useWallpaperActions } from './useWallpaperActions';

interface WallpaperFeedCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
  onPress?: (feed: Feed) => void;
  // 'default' (unchanged) is the existing single-column card used by Home,
  // Search Results, and daily-status.tsx. 'grid-tile' is new: a compact,
  // textless tile for the Wallpaper Hub's 2-column grid (Status/Wallpapers/
  // Thought for the Day sub-tabs). Defaulting to 'default' means every
  // existing call site keeps rendering exactly as before with zero changes.
  variant?: 'default' | 'grid-tile';
}

const { width } = Dimensions.get('window');
// Container paddingHorizontal:12 on each side (24 total) + this tile's own
// margin:4 on each side, times 2 tiles per row (16 total) - see the
// gridTile style comment below for which files this is coupled to.
const GRID_TILE_WIDTH = (width - 24 - 16) / 2;

export default function WallpaperFeedCard({
  feed,
  onLike,
  onShare,
  onDownload,
  onPress,
  variant = 'default',
}: WallpaperFeedCardProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { incrementView } = useFeedStore();
  const { language } = useTranslation();
  const { isLiking, isDownloading, isSharing, handleLike, handleShare, handleDownload } = useWallpaperActions({
    feed,
    onLike,
    onShare,
    onDownload,
  });

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

  const handlePress = async () => {
    try {
      await feedService.viewFeed(feed.id.toString());
      incrementView(feed.id.toString());
    } catch (error) {
      console.error('Error tracking view:', error);
    }

    onPress?.(feed);
  };

  if (variant === 'grid-tile') {
    // Pure visual tile: no title/description, no carousel (always the first
    // media item - a 2-column grid tile has no room for prev/next controls),
    // a plain <Image> with resizeMode="contain" inside a 9:16 box so the
    // photo scales to fit without cropping (unlike the default variant's
    // FeedMedia, which is hardcoded to resizeMode="cover" - deliberately not
    // reused here rather than risk changing FeedMedia's shared behavior).
    const gridMedia = feed.media[0];

    return (
      <TouchableOpacity
        style={styles.gridTile}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.gridImageBox}>
          {gridMedia && gridMedia.type === 'video' ? (
            // Instagram-grid-thumbnail behavior: loops continuously,
            // UNCONDITIONALLY silent - deliberately hardcoded `true`, not
            // read from the shared soundPreferenceStore, so the grid can
            // never end up audible regardless of whatever mute preference is
            // set on Home or anywhere else. No play/pause or isActive/
            // viewability gating - a grid tile has no exclusivity concern the
            // way a single full-bleed autoplay card does.
            <Video
              source={{ uri: gridMedia.mediaUrl }}
              style={styles.gridImage}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
              isMuted={true}
              posterSource={gridMedia.thumbnailUrl ? { uri: gridMedia.thumbnailUrl } : undefined}
            />
          ) : gridMedia && (
            <Image
              source={{ uri: gridMedia.mediaUrl }}
              style={styles.gridImage}
              resizeMode="contain"
            />
          )}

          <View style={styles.gridActionsOverlay}>
            <TouchableOpacity
              style={styles.gridActionIcon}
              onPress={handleLike}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={feed.isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={feed.isLiked ? '#C41E3A' : '#fff'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridActionIcon}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="share-outline" size={18} color="#fff" />
              )}
            </TouchableOpacity>

            {feed.allowDownloads && (
              <TouchableOpacity
                style={styles.gridActionIcon}
                onPress={handleDownload}
                disabled={isDownloading}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

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
            disabled={isSharing}
            activeOpacity={0.8}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#8B7355" />
            ) : (
              <Ionicons name="share-outline" size={22} color="#8B7355" />
            )}
          </TouchableOpacity>

          {/* Download Button */}
          {feed.allowDownloads && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownload}
              disabled={isDownloading}
              activeOpacity={0.8}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#8B7355" />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={22}
                  color="#8B7355"
                />
              )}
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
  // --- grid-tile variant only, below this point - default variant's styles
  // above are all untouched. ---
  // Fixed width, not flex: 1 - with numColumns={2}, FlatList does not insert
  // filler cells for an incomplete final row, so a lone item with flex:1 and
  // no sibling to share space with would stretch to the full row width
  // instead of half. GRID_TILE_WIDTH assumes the containing grid's
  // listContent paddingHorizontal:12 (StatusTabContent/WallpapersTabContent/
  // ThoughtTabContent) plus this tile's own margin:4 on each side - if either
  // changes, this needs recalculating too.
  gridTile: {
    width: GRID_TILE_WIDTH,
    margin: 4,
  },
  gridImageBox: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5E6D3',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridActionsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    // Flat scrim (not per-icon circles) so icons stay legible against
    // arbitrary image content - relies on gridImageBox's overflow:hidden +
    // borderRadius to naturally round this bar's bottom corners too.
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  gridActionIcon: {
    padding: 4,
  },
});