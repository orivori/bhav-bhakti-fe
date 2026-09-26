import React from 'react';
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
import FeedMedia from '../FeedMedia/FeedMedia';
import { Feed } from '@/types/feed';
import { getFeedThumbnailUrl } from '@/utils/feedFields';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useWallpaperActions } from './useWallpaperActions';
import { logWallpaperEngaged } from '@/utils/analytics/engagementEvents';

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
  const { incrementView } = useFeedStore();
  const { isLiking, isDownloading, isSharing, handleLike, handleShare, handleDownload } = useWallpaperActions({
    feed,
    onLike,
    onShare,
    onDownload,
  });

  const handlePress = async () => {
    try {
      await feedService.viewFeed(feed.id.toString());
      incrementView(feed.id.toString());
    } catch (error) {
      console.error('Error tracking view:', error);
    }

    // Fires on every tap, regardless of what onPress does next (e.g. the
    // Viewing Window's premium gate, see useViewingWindow.ts) - this is a
    // genuine Engagement-bucket signal (which content people try to engage
    // with), deliberately distinct from a paywall_hit Conversion event,
    // which would only fire for the subset that's actually gated.
    logWallpaperEngaged({
      deity: feed.deity?.name ?? 'unknown',
      format: feed.mediaType === 'video' ? 'video' : 'static',
    });

    onPress?.(feed);
  };

  const thumbnailUrl = getFeedThumbnailUrl(feed);

  if (variant === 'grid-tile') {
    // Pure visual tile: no title/description,
    // a plain <Image> with resizeMode="contain" inside a 9:16 box so the
    // photo scales to fit without cropping (unlike the default variant's
    // FeedMedia, which is hardcoded to resizeMode="cover" - deliberately not
    // reused here rather than risk changing FeedMedia's shared behavior).
    return (
      <TouchableOpacity
        style={styles.gridTile}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.gridImageBox}>
          {feed.url && feed.mediaType === 'video' ? (
            // Instagram-grid-thumbnail behavior: loops continuously,
            // UNCONDITIONALLY silent - deliberately hardcoded `true`, not
            // read from the shared soundPreferenceStore, so the grid can
            // never end up audible regardless of whatever mute preference is
            // set on Home or anywhere else. No play/pause or isActive/
            // viewability gating - a grid tile has no exclusivity concern the
            // way a single full-bleed autoplay card does.
            <Video
              source={{ uri: feed.url }}
              style={styles.gridImage}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
              isMuted={true}
              posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
            />
          ) : !!feed.url && (
            <Image
              source={{ uri: feed.url }}
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
          {feed.url && feed.mediaType === 'video' ? (
            // Matches the grid-tile variant's own video treatment exactly: a
            // 9:16 aspectRatio box with resizeMode CONTAIN (letterboxes
            // instead of cropping) and unconditional loop/mute/play.
            // Deliberately bypasses FeedMedia here rather than reusing it -
            // same judgment call the grid-tile variant already made (see its
            // comment above) - FeedMedia's own video branch is hardcoded to a
            // fixed 4:5 COVER box for its other consumers (FeedCard's
            // general-purpose fallback, etc.), and changing that shared
            // behavior would affect them too.
            <View style={styles.wallpaperVideoBox}>
              <Video
                source={{ uri: feed.url }}
                style={styles.wallpaperVideo}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
                isMuted={true}
                posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
              />
            </View>
          ) : (
            <FeedMedia
              feed={feed}
              onMediaPress={handlePress}
              autoPlay={false}
              showControls={false}
              showCenterPlayButton={false}
              style={styles.wallpaperImage}
            />
          )}
        </TouchableOpacity>

      </View>

      {/* Content Section Below Image - title/description intentionally
          removed, media + action buttons only. */}
      <View style={styles.contentContainer}>
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
  // Video-only box for this variant - see the video-vs-FeedMedia branch
  // above. 9:16, matching the grid-tile variant's gridImageBox exactly.
  // backgroundColor is the letterbox fill shown above/below or left/right of
  // a video whose aspect ratio doesn't fill this 9:16 box (resizeMode
  // CONTAIN, not cover) - matches RingtoneFeedCard/AudioContentCard/
  // SearchBar's shared cream fill instead of the old, unrelated #F5E6D3.
  wallpaperVideoBox: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#f7ebc4',
  },
  wallpaperVideo: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: 4,
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
    // Letterbox fill for both the image and video branches above (both
    // resizeMode="contain", either can show blank space around non-9:16
    // media) - matches RingtoneFeedCard/AudioContentCard/MantraFeedCard's
    // shared cream fill instead of the old, unrelated #F5E6D3.
    backgroundColor: '#f7ebc4',
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