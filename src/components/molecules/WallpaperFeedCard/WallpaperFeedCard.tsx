import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path } from 'react-native-svg';
import { SvgUri } from 'react-native-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Text } from '@/components/atoms';
import FeedMedia from '../FeedMedia/FeedMedia';
import { Feed } from '@/types/feed';
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

// Shared HeartIcon — same as FeedCard
const HeartIcon = ({ width, height, fill, stroke, strokeWidth }: {
  width: number; height: number; fill: string; stroke: string; strokeWidth: number;
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

export default function WallpaperFeedCard({
  feed,
  onLike,
  onShare,
  onDownload,
  onPress,
}: WallpaperFeedCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { incrementDownload, incrementShare, incrementView } = useFeedStore();
  const { language } = useTranslation();

  const title =
    feed.title
      ? feed.title[language] || feed.title.en || feed.caption || ''
      : feed.caption || 'Beautiful Wallpaper';

  const handlePress = async () => {
    try {
      await feedService.viewFeed(feed.id.toString());
      incrementView(feed.id.toString());
    } catch (_) {}
    onPress?.(feed);
  };

  const handleLike = () => {
    onLike?.(feed.id.toString());
  };

  const handleShare = async () => {
    try {
      await feedService.shareFeed(feed.id.toString(), { platform: 'native_share' });
      incrementShare(feed.id.toString());
      await Share.share({
        message: title
          ? `Check out this beautiful wallpaper: ${title}\n\nShared from Bhav Bhakti App`
          : 'Check out this amazing wallpaper from Bhav Bhakti App!',
        url: feed.media[0]?.mediaUrl,
      });
      onShare?.(feed.id.toString());
    } catch (error) {
      console.error('Error sharing wallpaper:', error);
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
      const fileUri =
        FileSystem.documentDirectory + `wallpaper_${feed.id}_${mediaToDownload.id}.jpg`;
      const result = await FileSystem.downloadAsync(mediaToDownload.mediaUrl, fileUri);
      if (result.status === 200) {
        await MediaLibrary.saveToLibraryAsync(result.uri);
        Alert.alert('Saved!', 'Wallpaper saved to your gallery.');
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

  return (
    <View style={styles.card}>
      {/* Wallpaper Image */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.95} style={styles.imageWrapper}>
        <FeedMedia
          media={feed.media}
          onMediaPress={handlePress}
          autoPlay={false}
          showControls={false}
          showCenterPlayButton={false}
          style={styles.image}
        />
      </TouchableOpacity>

      {/* Title */}
      {!!title && (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}

      {/* Action Buttons — same layout as video card */}
      <View style={styles.actionsContainer}>

        {/* Share Status — updated gradient colors */}
        <TouchableOpacity
          style={styles.primaryButtonContainer}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#E76A4A', '#FFA241']}
            style={styles.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Share Status</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Download Button */}
        <TouchableOpacity
          style={styles.downloadButtonContainer}
          onPress={handleDownload}
          disabled={isDownloading}
          activeOpacity={0.85}
        >
          <View style={styles.downloadButton}>
            {isDownloading ? (
              <ActivityIndicator size="small" color="#E76A4A" />
            ) : (
              <Ionicons name="download" size={20} color="#E76A4A" />
            )}
            <Text style={styles.downloadButtonText}>Download</Text>
          </View>
        </TouchableOpacity>

        {/* Like — commented out per request */}
        {/* <TouchableOpacity
          style={[styles.actionButton, feed.isLiked && styles.actionButtonLiked]}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <HeartIcon
            width={24}
            height={24}
            fill={feed.isLiked ? '#E76A4A' : 'none'}
            stroke="#E76A4A"
            strokeWidth={feed.isLiked ? 0 : 2}
          />
        </TouchableOpacity> */}

        {/* Share icon — commented out per request */}
        {/* <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <SvgUri
            uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/share.svg"
            width={24}
            height={24}
            fill="#8B7355"
          />
        </TouchableOpacity> */}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F7EBC4',
    borderRadius: 20,
    padding: 8,
    marginBottom: 20,
    shadowColor: '#8B6914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  imageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 356,
    backgroundColor: '#EDD8A0',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C41E3A',
    marginBottom: 8,
    marginHorizontal: 4,
    lineHeight: 24,
    includeFontPadding: false,
  },

  // ── Buttons — identical to video card layout ──────────────────────
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 0,
  },

  // Primary gradient button (smaller than download)
  primaryButtonContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,   // exact match to mantraPlayButton
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',   // exact match to mantraPlayButtonText
  },

  // Square action buttons (exact match to mantraActionButton)
  actionButton: {
    width: 52,
    height: 52,
    backgroundColor: '#E76A4A4D',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLiked: {
    backgroundColor: '#E76A4A4D',
  },

  // Download button (secondary style, same size as share status)
  downloadButtonContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5E0C0',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  downloadButtonText: {
    color: '#E76A4A',
    fontSize: 16,
    fontWeight: '600',
  },
});