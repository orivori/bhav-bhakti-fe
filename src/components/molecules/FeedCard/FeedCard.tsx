import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { ensureMediaLibraryPermission } from '@/utils/mediaLibraryPermission';
import { Text } from '@/components/atoms';
import FeedMedia from '../FeedMedia/FeedMedia';
import WallpaperFeedCard from '../WallpaperFeedCard/WallpaperFeedCard';
import MantraFeedCard from '../MantraFeedCard/MantraFeedCard';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { getMediaFileExtension } from '@/utils/getMediaFileExtension';

interface FeedCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
  onPress?: (feed: Feed) => void;
  autoPlayVideo?: boolean;
}

const { width } = Dimensions.get('window');

export default function FeedCard({
  feed,
  onLike,
  onShare,
  onDownload,
  onPress,
  autoPlayVideo = false,
}: FeedCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toggleLike, incrementDownload, incrementShare, incrementView } = useFeedStore();
  const { language } = useI18nStore();

  const handleLike = () => {
    console.log('❤️ Heart button pressed for feed:', feed.id, 'isLiked:', feed.isLiked);

    if (onLike) {
      // Use the parent's like handler (from useFeed hook) - this should be instant
      onLike(feed.id.toString());
    } else {
      // Fallback to direct API calls if no onLike prop provided
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
          console.error('Error liking feed:', error);
          Alert.alert('Error', 'Failed to like the post. Please try again.');
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

      const result = await Share.share({
        message: (() => {
          // Real title first, caption only as a last resort (CLAUDE.md §56
          // Phase 0) - matches AutoplayFeedCard/AudioContentCard's already-
          // correct pattern; caption is no longer a reliable title proxy.
          const shareTitle = feed.title?.[language] || feed.title?.en || feed.caption;
          return shareTitle
            ? `Check out this post: ${shareTitle}\n\nShared from Bhav Bhakti App`
            : 'Check out this amazing post from Bhav Bhakti App!';
        })(),
        url: feed.media?.[0]?.mediaUrl,
      });

      if (result.action === Share.sharedAction) {
        onShare?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error sharing feed:', error);
      Alert.alert('Error', 'Failed to share the post. Please try again.');
    }
  };

  const handleDownload = async () => {
    if (isDownloading || !feed.allowDownloads) return;

    setIsDownloading(true);
    try {
      const hasPermission = await ensureMediaLibraryPermission('common.permissionReasonDownloadMedia');
      if (!hasPermission) {
        return;
      }

      // Download first media item
      const mediaToDownload = feed.media?.[0];
      if (!mediaToDownload) return;

      const extension = getMediaFileExtension(mediaToDownload.mediaUrl, mediaToDownload.type);
      // Timestamp suffix guarantees a unique local path on every attempt -
      // see useWallpaperActions.ts's handleDownload for the full explanation
      // (MediaStore's own collision handling otherwise silently reused an
      // existing gallery entry for a repeated deterministic filename).
      // cacheDirectory, not documentDirectory - staging copy on its way into
      // MediaLibrary, deleted right after on success below; cacheDirectory
      // means a failed/skipped delete doesn't leak into persistent storage
      // forever. See cacheEviction.ts for the startup age-based sweep.
      const fileUri = FileSystem?.cacheDirectory + `feed_${feed.id}_${mediaToDownload.id}_${Date.now()}.${extension}`;
      const downloadResult = await FileSystem.downloadAsync(
        mediaToDownload.mediaUrl,
        fileUri
      );

      if (downloadResult.status === 200) {
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        // Clean up the local staging copy now that it's safely in the
        // gallery - best-effort, since the gallery save already succeeded
        // either way.
        FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});
        Alert.alert('Success', 'Media saved to your gallery!');

        // Track download
        await feedService.downloadFeed(feed.id.toString());
        incrementDownload(feed.id.toString());
        onDownload?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error downloading media:', error);
      Alert.alert('Error', 'Failed to download media. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePress = async () => {
    // Track view
    try {
      await feedService.viewFeed(feed.id.toString());
      incrementView(feed.id.toString());
    } catch (error) {
      console.error('Error tracking view:', error);
    }

    onPress?.(feed);
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  // const renderCaption = () => {
  //   if (!feed.caption) return null;

  //   const maxLength = 100;
  //   const shouldTruncate = feed.caption.length > maxLength;
  //   const displayText = shouldTruncate && !showFullCaption
  //     ? feed.caption.substring(0, maxLength) + '...'
  //     : feed.caption;

  //   return (
  //     <View style={styles.captionContainer}>
  //       <Text variant="body" style={styles.caption}>
  //         {displayText}
  //       </Text>
  //       {shouldTruncate && (
  //         <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
  //           <Text variant="body" color="primary" style={styles.captionToggle}>
  //             {showFullCaption ? 'Show less' : 'Show more'}
  //           </Text>
  //         </TouchableOpacity>
  //       )}
  //     </View>
  //   );
  // };

  // const renderTags = () => {
  //   if (!feed.tags || feed.tags.length === 0) return null;

  //   return (
  //     <View style={styles.tagsContainer}>
  //       {feed.tags.slice(0, 3).map((tag, index) => (
  //         <View key={index} style={styles.tag}>
  //           <Text variant="caption" style={styles.tagText}>
  //             #{tag}
  //           </Text>
  //         </View>
  //       ))}
  //       {feed.tags.length > 3 && (
  //         <Text variant="caption" color="secondary">
  //           +{feed.tags.length - 3} more
  //         </Text>
  //       )}
  //     </View>
  //   );
  // };

  // Render regular feed card design
  const renderRegularCard = () => (
    <View style={styles.container}>
      {/* Media */}
      <FeedMedia
        media={feed.media}
        onMediaPress={handlePress}
        autoPlay={autoPlayVideo}
        showControls={true}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Ionicons
                name={feed.isLiked ? 'heart' : 'heart-outline'}
                size={26}
                color={feed.isLiked ? '#FF4444' : '#6B7280'}
              />
              {feed.likesCount > 0 && (
                <Text variant="caption" style={styles.actionCount}>
                  {formatCount(feed.likesCount)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons
                name="share-outline"
                size={24}
                color="#6B7280"
              />
              {feed.sharesCount > 0 && (
                <Text variant="caption" style={styles.actionCount}>
                  {formatCount(feed.sharesCount)}
                </Text>
              )}
            </TouchableOpacity>

            {feed.allowDownloads && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <Ionicons
                    name="download-outline"
                    size={24}
                    color="#6B7280"
                  />
                )}
                {feed.downloadsCount > 0 && (
                  <Text variant="caption" style={styles.actionCount}>
                    {formatCount(feed.downloadsCount)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* View Count */}
          {feed.viewsCount > 0 && (
            <View style={styles.viewCount}>
              <Ionicons
                name="eye-outline"
                size={18}
                color="#8E8E93"
              />
              <Text style={styles.viewCountText}>
                {formatCount(feed.viewsCount)}
              </Text>
            </View>
          )}
        </View>

        {/* Caption */}
        {/* {renderCaption()} */}

        {/* Tags */}
        {/* {renderTags()} */}

        {/* Location and Time */}
        {/* <View style={styles.metaContainer}>
            {formatTime(feed.createdAt)}
        </View> */}
      </View>
    </View>
  );

  // Conditionally render based on feed type
  if (feed.type === 'mantra') {
    // CLAUDE.md §16/§56: the single, real mantra card design (mood pill,
    // live "currently playing" indicator), same component Mantra Explorer
    // itself renders - closes the long-standing fragmentation where this
    // branch had its own, older, visually different card.
    return <MantraFeedCard feed={feed} onPress={onPress} onLike={onLike} />;
  } else if (feed.type === 'wallpaper' || feed.type === 'thought') {
    // 'thought' is visually identical to wallpaper content (the "thought"
    // text is baked into the image itself, see CLAUDE.md's Wallpaper Hub
    // notes) - ThoughtTabContent already renders it via WallpaperFeedCard
    // (grid-tile variant); this closes the gap where FeedCard's own dispatch
    // never got updated when 'thought' was introduced as a Feed type, so it
    // fell through to the generic renderRegularCard fallback instead.
    return (
      <WallpaperFeedCard
        feed={feed}
        onLike={onLike}
        onShare={onShare}
        onDownload={onDownload}
        onPress={onPress}
      />
    );
  } else {
    return renderRegularCard();
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  content: {
    padding: 18,
    paddingTop: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    paddingTop: 4,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actionCount: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewCountText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  captionContainer: {
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  caption: {
    lineHeight: 20,
    marginBottom: goldenTempleTheme.spacing.xs,
  },
  captionToggle: {
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: goldenTempleTheme.spacing.sm,
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  tag: {
    backgroundColor: goldenTempleTheme.colors.primary[100],
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: goldenTempleTheme.spacing.xs,
    borderRadius: goldenTempleTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: goldenTempleTheme.colors.primary[300],
  },
  tagText: {
    color: goldenTempleTheme.colors.primary[700],
    fontSize: 11,
    fontWeight: '600',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.xs,
  },
  location: {
    fontSize: 11,
  },
});