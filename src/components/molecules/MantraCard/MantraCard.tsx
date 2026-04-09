import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';

interface MantraCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onPress?: (feed: Feed) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = width - 48; // Full width minus margins

export default function MantraCard({
  feed,
  onLike,
  onShare,
  onPress,
}: MantraCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const { toggleLike, incrementShare } = useFeedStore();

  const handleLike = async () => {
    if (isLiking) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onLike) {
      onLike(feed.id.toString());
    } else {
      setIsLiking(true);
      try {
        if (feed.isLiked) {
          await feedService.unlikeFeed(feed.id.toString());
        } else {
          await feedService.likeFeed(feed.id.toString());
        }
        toggleLike(feed.id.toString());
      } catch (error) {
        console.error('Error liking feed:', error);
        Alert.alert('Error', 'Failed to like the mantra. Please try again.');
      } finally {
        setIsLiking(false);
      }
    }
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await feedService.shareFeed(feed.id.toString(), { platform: 'native_share' });
      incrementShare(feed.id.toString());

      const result = await Share.share({
        message: feed.caption
          ? `Listen to this beautiful mantra: ${feed.caption}\n\nShared from Bhav Bhakti App`
          : 'Listen to this beautiful mantra from Bhav Bhakti App!',
        url: feed.media[0]?.mediaUrl,
      });

      if (result.action === Share.sharedAction) {
        onShare?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error sharing feed:', error);
      Alert.alert('Error', 'Failed to share the mantra. Please try again.');
    }
  };

  const handlePlayPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.(feed);
  };

  const getImageUrl = () => {
    // Get the thumbnail or media URL for the image
    const mediaItem = feed.media?.[0];
    return mediaItem?.thumbnailUrl || mediaItem?.mediaUrl || 'https://via.placeholder.com/300x400';
  };

  const getMantraTitle = () => {
    return feed.caption || 'Sacred Mantra';
  };

  const getMantraDescription = () => {
    // Create a generic description based on the title or use tags
    const title = getMantraTitle();
    if (title.toLowerCase().includes('hanuman')) {
      return 'A powerful mantra dedicated to Hanuman';
    } else if (title.toLowerCase().includes('ganesh')) {
      return 'A sacred chant invoking Lord Ganesha';
    } else if (title.toLowerCase().includes('shiva')) {
      return 'Divine chants in praise of Lord Shiva';
    } else if (title.toLowerCase().includes('krishna')) {
      return 'Beautiful mantras dedicated to Lord Krishna';
    } else {
      return 'A sacred mantra for spiritual peace';
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Image */}
      <TouchableOpacity onPress={handlePlayPress} activeOpacity={0.9}>
        <Image
          source={{ uri: getImageUrl() }}
          style={styles.mantraImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Title */}
        <Text style={styles.mantraTitle} numberOfLines={1}>
          {getMantraTitle()}
        </Text>

        {/* Description */}
        <Text style={styles.mantraDescription} numberOfLines={2}>
          {getMantraDescription()}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Play Button */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPress}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.playButtonText}>Play now</Text>
          </TouchableOpacity>

          {/* Like Button */}
          <TouchableOpacity
            style={[styles.actionButton, feed.isLiked && styles.actionButtonLiked]}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <Ionicons
              name={feed.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={feed.isLiked ? '#C41E3A' : '#8B7355'}
            />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color="#8B7355" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: '#f7ebc4',
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8DDD1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  mantraImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F5E6D3',
  },
  contentContainer: {
    padding: 20,
  },
  mantraTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C41E3A',
    marginBottom: 8,
  },
  mantraDescription: {
    fontSize: 16,
    color: '#8B7355',
    lineHeight: 22,
    marginBottom: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    backgroundColor: '#C41E3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    width: 52,
    height: 52,
    backgroundColor: '#E8DDD1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLiked: {
    backgroundColor: 'rgba(196, 30, 58, 0.1)',
  },
});