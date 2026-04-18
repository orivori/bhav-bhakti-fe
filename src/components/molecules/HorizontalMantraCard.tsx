import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import FeedMedia from './FeedMedia/FeedMedia';
import type { Feed } from '@/types/feed';

interface HorizontalMantraCardProps {
  mantra: Feed;
  onPress: (mantra: Feed) => void;
}

export const HorizontalMantraCard: React.FC<HorizontalMantraCardProps> = ({
  mantra,
  onPress,
}) => {
  const handlePress = () => {
    onPress(mantra);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Left Image */}
      <View style={styles.imageContainer}>
        {mantra.media && mantra.media.length > 0 ? (
          <FeedMedia
            media={mantra.media}
            onMediaPress={handlePress}
            autoPlay={false}
            showControls={false}
            showCenterPlayButton={false}
            style={styles.image}
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Ionicons name="musical-notes" size={32} color="#E76A4A" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {mantra.caption || 'Sacred Mantra'}
        </Text>

        {/* Duration and Count */}
        <Text style={styles.duration} numberOfLines={1}>
          00:{String(Math.floor(((mantra.media && mantra.media[0]?.duration) || 15) % 60)).padStart(2, '0')} sec (108 times)
        </Text>

        {/* Tags */}
        <View style={styles.tags}>
          {(mantra.tags?.slice(0, 2) || ['शांति', 'सुबह']).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Play Button */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={24} color="#E76A4A" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7EBC4',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5E6D3',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5E6D3',
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E76A4A',
    marginBottom: 4,
    lineHeight: 22,
  },
  duration: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 8,
    lineHeight: 18,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(231, 106, 74, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#E76A4A',
    fontWeight: '500',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E76A4A33',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#E76A4A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default HorizontalMantraCard;