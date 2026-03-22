import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { ZODIAC_SIGNS } from '@/data/zodiacData';
import { LanguageToggle } from '@/components/molecules/LanguageToggle';
import type { ZodiacSign } from '@/types/horoscope';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function HoroscopeScreen() {
  const { t, language } = useTranslation();
  const { contentPadding } = useTabBarHeight();

  const handleZodiacPress = (zodiacSign: ZodiacSign) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/horoscope-detail',
      params: { zodiacSign }
    });
  };

  const renderZodiacCard = ({ item }: { item: typeof ZODIAC_SIGNS[0] }) => {
    const gradientColors = getGradientByElement(item.element);

    return (
      <TouchableOpacity
        style={styles.zodiacCard}
        onPress={() => handleZodiacPress(item.zodiacSign)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Zodiac Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.zodiacIcon}>{item.icon}</Text>
          </View>

          {/* Zodiac Info */}
          <View style={styles.zodiacInfo}>
            <Text variant="body" weight="bold" style={styles.zodiacName}>
              {item.name[language as 'en' | 'hi'] || item.name.en}
            </Text>
            <Text variant="caption" style={styles.zodiacDates}>
              {item.dates}
            </Text>
            <Text variant="caption" style={styles.zodiacElement}>
              {language === 'hi' ? t(`elements.${item.element}`) : item.element}
            </Text>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.8)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const getGradientByElement = (element: string) => {
    switch (element) {
      case 'Fire':
        return ['#FF6B00', '#FF8533', '#FFA500'];
      case 'Earth':
        return ['#8B4513', '#A0522D', '#CD853F'];
      case 'Air':
        return ['#4169E1', '#6495ED', '#87CEEB'];
      case 'Water':
        return ['#20B2AA', '#48D1CC', '#7FFFD4'];
      default:
        return ['#8B5A2B', '#A0522D', '#D4AF37'];
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: contentPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text variant="h4" weight="semibold" style={styles.headerTitle}>
              {t('horoscope.title')}
            </Text>
            <LanguageToggle />
          </View>

          <View style={styles.placeholder} />
        </View>

        {/* Date Display */}
        <View style={styles.dateSection}>
          <Text variant="h5" weight="semibold" style={styles.dateText}>
            {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          <Text variant="caption" color="secondary" style={styles.dateSubtext}>
            {t('horoscope.todaysReading')}
          </Text>
        </View>

        {/* Instruction */}
        <View style={styles.instructionSection}>
          <Text variant="body" color="secondary" align="center" style={styles.instructionText}>
            {language === 'hi'
              ? 'अपनी राशि चुनें और आज का राशिफल देखें'
              : 'Select your zodiac sign to view today\'s horoscope'}
          </Text>
        </View>

        {/* Zodiac Signs Grid */}
        <FlatList
          data={ZODIAC_SIGNS}
          renderItem={renderZodiacCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    borderBottomWidth: 1,
    borderBottomColor: goldenTempleTheme.colors.primary[200],
    ...goldenTempleTheme.shadows.sm,
  },
  backButton: {
    padding: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.primary[50],
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    textAlign: 'center',
    color: goldenTempleTheme.colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  dateSection: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: goldenTempleTheme.spacing.md,
    marginTop: goldenTempleTheme.spacing.lg,
    borderRadius: goldenTempleTheme.borderRadius.xl,
    ...goldenTempleTheme.shadows.sm,
  },
  dateText: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  dateSubtext: {
    textAlign: 'center',
  },
  instructionSection: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
  },
  instructionText: {
    lineHeight: 20,
  },
  gridContainer: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  zodiacCard: {
    width: ITEM_WIDTH,
    borderRadius: goldenTempleTheme.borderRadius.lg,
    overflow: 'hidden',
    ...goldenTempleTheme.shadows.md,
  },
  cardGradient: {
    padding: goldenTempleTheme.spacing.md,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  zodiacIcon: {
    fontSize: 36,
  },
  zodiacInfo: {
    alignItems: 'center',
    flex: 1,
  },
  zodiacName: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  zodiacDates: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  zodiacElement: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    textAlign: 'center',
  },
  arrowContainer: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
});