import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Text } from '@/components/atoms';
import type { Feed } from '@/types/feed';

interface TrendingMantraCardProps {
  mantra: Feed;
  onPress: (mantra: Feed) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85; // 85% of screen width

export const TrendingMantraCard: React.FC<TrendingMantraCardProps> = ({
  mantra,
  onPress,
}) => {
  console.log(mantra)
  const handlePress = () => {
    onPress(mantra);
  };

  // Get tags or create sample ones
  const tags = mantra.tags?.slice(0, 2) || ['शांति', 'सुबह'];

  // Get the image URL with fallback logic
  const getImageUrl = () => {
    const media = mantra.media?.[0];
    if (media?.thumbnailUrl && media.thumbnailUrl !== '') {
      return media.thumbnailUrl;
    }
    if (media?.mediaUrl && media.mediaUrl !== '') {
      return media.mediaUrl;
    }
    return 'https://d12b36sm0rczqk.cloudfront.net/app-assets/om-symbol.png';
  };

  const imageUrl = getImageUrl();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.gradient}>
        {/* Left - Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* Right - Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={1}>
            {mantra.caption || 'गायत्री मंत्र'}
          </Text>

          {/* Duration and count */}
          <Text style={styles.duration}>
            00:{String(Math.floor((mantra.media?.[0]?.duration || 15) % 60)).padStart(2, '0')} sec (108 times)
          </Text>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    height: 100,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7EBC4',
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8DDD1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C41E3A',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(196, 30, 58, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#C41E3A',
    fontWeight: '500',
  },
});

export default TrendingMantraCard;