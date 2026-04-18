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
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri, Svg, Path } from 'react-native-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Text } from '@/components/atoms';
import FeedMedia from '../FeedMedia/FeedMedia';
import WallpaperFeedCard from '../WallpaperFeedCard/WallpaperFeedCard';
import HorizontalMantraCard from '../HorizontalMantraCard';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useTranslation } from '@/hooks/useTranslation';

interface FeedCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
  onPress?: (feed: Feed) => void;
  autoPlayVideo?: boolean;
}

// Custom Heart Icon Component
const HeartIcon = ({ width, height, fill, stroke, strokeWidth }: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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
  const { language } = useTranslation();

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

  // Render horizontal mantra card using reusable component
  const renderMantraCard = () => (
    <HorizontalMantraCard
      mantra={feed}
      onPress={() => onPress?.(feed)}
    />
  );

  // Render vertical video card design (renamed from mantra card)
  const
  renderVideoCardTemplate = () => (
    <View style={styles.mantraContainer}>
      {/* Main Image with gap */}
      <View style={styles.mantraImageContainer}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
          <FeedMedia
            media={feed.media}
            onMediaPress={handlePress}
            autoPlay={false}
            showControls={false}
            showCenterPlayButton={false}
            style={styles.mantraImage}
          />
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.mantraContentContainer}>
        {/* Title */}
        <Text style={styles.mantraTitle} numberOfLines={1}>
          {feed.caption || 'Sacred Mantra'}
        </Text>

        {/* Description */}
        <Text style={styles.mantraDescription} numberOfLines={2}>
          {feed.description?.[language] || feed.description?.en || 'A sacred mantra for spiritual peace'}
        </Text>

        {/* Action Buttons */}
        <View style={styles.mantraActionsContainer}>
          {/* Set as Ringtone Button for Video Card */}
          <TouchableOpacity
            style={styles.mantraPlayButtonContainer}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#E76A4A', '#CA3500']}
              style={styles.mantraPlayButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Ionicons name="musical-note" size={20} color="#FFFFFF" />
              <Text style={styles.mantraPlayButtonText}>Set as Ringtone</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Like Button */}
          <TouchableOpacity
            style={[styles.mantraActionButton, feed.isLiked && styles.mantraActionButtonLiked]}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <HeartIcon
              width={24}
              height={24}
              fill={feed.isLiked ? '#E76A4A' : 'none'}
              stroke={feed.isLiked ? '#E76A4A' : '#E76A4A'}
              strokeWidth={feed.isLiked ? 0 : 2}
            />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.mantraActionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <SvgUri
              uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/share.svg"
              width={24}
              height={24}
              fill="#8B7355"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
        <View style={styles.mantraActionsContainer}>
          <TouchableOpacity
            style={[styles.mantraActionButton, feed.isLiked && styles.mantraActionButtonLiked]}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <HeartIcon
              width={24}
              height={24}
              fill={feed.isLiked ? '#E76A4A' : 'none'}
              stroke={feed.isLiked ? '#E76A4A' : '#E76A4A'}
              strokeWidth={feed.isLiked ? 0 : 2}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.mantraActionButton} onPress={handleShare}>
            <SvgUri
              uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/share.svg"
              width={24}
              height={24}
              fill="#8B7355"
            />
          </TouchableOpacity>

          {feed.allowDownloads && (
            <TouchableOpacity
              style={styles.mantraActionButton}
              onPress={handleDownload}
              disabled={isDownloading}
            >
              <Ionicons
                name="download-outline"
                size={24}
                color="#8B7355"
              />
            </TouchableOpacity>
          )}

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
    return renderMantraCard();
  } else if (feed.type === 'video') {
    return renderVideoCardTemplate();
  } else if (feed.type === 'wallpaper') {
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

  // Mantra Card Styles - Responsive
  mantraContainer: {
    width: '100%',
    backgroundColor: '#F7EBC4',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#D4C4A8',
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  mantraImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mantraImage: {
    width: '100%',
    height: 435,
    backgroundColor: '#F5E6D3',
  },
  mantraContentContainer: {
    padding: 8,
  },
  mantraTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C41E3A',
    marginBottom: 2,
    lineHeight: 24,
    paddingTop: 2,
    includeFontPadding: false,
  },
  mantraDescription: {
    fontSize: 14,
    color: '#C41E3A',
    lineHeight: 18,
    marginBottom: 8,
  },
  mantraActionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  mantraPlayButtonContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mantraPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  mantraPlayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mantraActionButton: {
    width: 52,
    height: 52,
    backgroundColor: '#E76A4A4D',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mantraActionButtonLiked: {
    backgroundColor: '#E76A4A4D',
  },
});