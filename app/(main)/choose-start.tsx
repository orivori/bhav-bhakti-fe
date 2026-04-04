import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { useTranslation as useI18n } from '@/shared/i18n/useTranslation';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 cards per row with margins

interface CategoryOption {
  id: string;
  titleEn: string;
  titleHi: string;
  iconUrl: string;
  gradient: readonly string[];
}

const categoryOptions: CategoryOption[] = [
  {
    id: 'mantras',
    titleEn: 'Mantra',
    titleHi: 'मंत्र',
    iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/mantras.svg',
    gradient: ['#E76A4A', '#CA3500'],
  },
  {
    id: 'rashifal',
    titleEn: 'Rashifal',
    titleHi: 'राशिफल',
    iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/rashifal.svg',
    gradient: ['#E76A4A', '#CA3500'],
  },
  {
    id: 'status',
    titleEn: 'Status',
    titleHi: 'स्टेटस',
    iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/status.svg',
    gradient: ['#E76A4A', '#CA3500'],
  },
  {
    id: 'ringtones',
    titleEn: 'Ringtone',
    titleHi: 'रिंगटोन',
    iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/ringtones.svg',
    gradient: ['#E76A4A', '#CA3500'],
  },
];

const AnimatedCategoryCard = ({ category, onPress }: {
  category: CategoryOption;
  onPress: () => void;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { currentLanguage } = useI18n();

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const displayTitle = currentLanguage === 'hi' ? category.titleHi : category.titleEn;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.cardContainer}
    >
      <Animated.View
        style={[
          styles.animatedCard,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <LinearGradient
          colors={category.gradient}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Icon Container */}
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              <SvgUri
                uri={category.iconUrl}
                width={48}
                height={48}
              />
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {displayTitle}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function ChooseStartScreen() {
  const { t: ti, currentLanguage } = useI18n();

  const handleCategoryPress = (category: CategoryOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate based on category
    switch (category.id) {
      case 'mantras':
        router.push('/(main)/mantras');
        break;
      case 'rashifal':
        router.push('/(main)/horoscope');
        break;
      case 'status':
        router.push('/(main)/daily-status');
        break;
      case 'ringtones':
        router.push('/(main)/ringtones');
        break;
      default:
        router.push('/(main)/' as any);
    }
  };

  const headerTitle = currentLanguage === 'hi' ? 'कहां से शुरू करना है चुनें' : 'Choose where to start';
  const seeAllText = currentLanguage === 'hi' ? 'सभी देखें' : 'See all';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {headerTitle}
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Navigate to view all categories if needed
            }}
          >
            <Text style={styles.seeAllText}>
              {seeAllText}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories Grid */}
        <View style={styles.grid}>
          {categoryOptions.map((category) => (
            <AnimatedCategoryCard
              key={category.id}
              category={category}
              onPress={() => handleCategoryPress(category)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Cream background matching your app
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#CA3500', // Orange color matching the design
  },
  seeAllText: {
    fontSize: 14,
    color: '#CA3500',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  cardContainer: {
    width: cardWidth,
    marginBottom: 12,
  },
  animatedCard: {
    flex: 1,
  },
  card: {
    height: 120,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(30, 30, 30, 0.1)',
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E1E',
    textAlign: 'center',
  },
});