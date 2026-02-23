import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Text } from '@/components/atoms';
import FeedMedia from '../FeedMedia/FeedMedia';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';

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
  const [showFullCaption, setShowFullCaption] = useState(false);
  const { toggleLike, incrementDownload, incrementShare, incrementView } = useFeedStore();

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    try {
      if (feed.isLiked) {
        await feedService.unlikeFeed(feed.id.toString());
      } else {
        await feedService.likeFeed(feed.id.toString());
      }
      toggleLike(feed.id.toString());
      onLike?.(feed.id.toString());
    } catch (error) {
      console.error('Error liking feed:', error);
      Alert.alert('Error', 'Failed to like the post. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    try {
      await feedService.shareFeed(feed.id.toString(), { platform: 'native_share' });
      incrementShare(feed.id.toString());

      const result = await Share.share({
        message: feed.caption
          ? `Check out this post: ${feed.caption}\n\nShared from Bhav Bhakti App`
          : 'Check out this amazing post from Bhav Bhakti App!',
        url: feed.media[0]?.mediaUrl,
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
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save media to your gallery.');
        return;
      }

      // Download first media item
      const mediaToDownload = feed.media[0];
      if (!mediaToDownload) return;

      const fileUri = FileSystem?.documentDirectory + `feed_${feed.id}_${mediaToDownload.id}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(
        mediaToDownload.mediaUrl,
        fileUri
      );

      if (downloadResult.status === 200) {
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
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

  return (
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
              disabled={isLiking}
            >
              <Ionicons
                name={feed.isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={feed.isLiked ? goldenTempleTheme.colors.templeRed : goldenTempleTheme.colors.text.secondary}
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
                size={22}
                color={goldenTempleTheme.colors.text.secondary}
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
                <Ionicons
                  name="download-outline"
                  size={22}
                  color={goldenTempleTheme.colors.text.secondary}
                />
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
                size={16}
                color={goldenTempleTheme.colors.text.muted}
              />
              <Text variant="caption" color="secondary">
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
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    marginBottom: goldenTempleTheme.spacing.md,
    borderRadius: goldenTempleTheme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: goldenTempleTheme.colors.border,
    ...goldenTempleTheme.shadows.md,
  },
  content: {
    padding: goldenTempleTheme.spacing.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  leftActions: {
    flexDirection: 'row',
    gap: goldenTempleTheme.spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.xs,
  },
  actionCount: {
    color: goldenTempleTheme.colors.text.muted,
    fontSize: 12,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.xs,
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