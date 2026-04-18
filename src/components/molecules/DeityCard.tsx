import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Text } from '@/components/atoms';
import type { Deity } from '@/features/feed/hooks/useDeities';

interface DeityCardProps {
  deity: Deity;
  isSelected?: boolean;
  onPress: (deity: Deity) => void;
  language?: string;
}

export const DeityCard: React.FC<DeityCardProps> = ({
  deity,
  isSelected = false,
  onPress,
  language = 'en',
}) => {
  const handlePress = () => {
    onPress(deity);
  };

  const displayName = deity.displayName[language] || deity.displayName.en;

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {isSelected && <View style={styles.closeButton} />}

      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: deity.icon || 'https://d12b36sm0rczqk.cloudfront.net/app-assets/hanuman.png'
          }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
  },
  selectedContainer: {
    // Selected state styling if needed
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C41E3A',
    zIndex: 1,
    // Add X mark
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#F7EBC4',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 50,
    height: 65,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E1E1E',
    textAlign: 'center',
  },
});

export default DeityCard;