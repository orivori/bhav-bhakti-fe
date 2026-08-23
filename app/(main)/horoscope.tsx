import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { ZODIAC_SIGNS } from '@/data/zodiacData';
import { LanguageToggle } from '@/components/molecules/LanguageToggle';
import { usePremiumStore } from '@/store/premiumStore';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import type { ZodiacSign } from '@/types/horoscope';

const { width } = Dimensions.get('window');
// Mirrors mantras.tsx's MOOD_ITEM_WIDTH calculation exactly: 2 columns with
// even spacing, computed from screen width. 64 = gridContainer's own
// paddingHorizontal:24 on each side (48 total) + a 16px gap between the two
// cards - must be recalculated in lockstep with gridContainer's
// paddingHorizontal below, or the grid's gap silently collapses/overflows.
const ITEM_WIDTH = (width - 64) / 2;

export default function HoroscopeScreen() {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { contentPadding } = useTabBarHeight();
  // Consolidated onto the shared store - see premiumStore.ts's
  // DEV_OVERRIDE_IS_PREMIUM comment. Was a local `const isPremiumUser =
  // false;` here; the store's own default is also false, so this is a
  // behavior-identical swap.
  const { isPremium: isPremiumUser } = usePremiumStore();
  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTopOnTabPress(useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []));

  const showPaywallPlaceholder = () => {
    // TEMPORARY/PLACEHOLDER - stands in for the real paywall/upsell screen.
    Alert.alert('Premium Feature', 'This will be available with Bhav Bhakti Premium. Stay tuned!');
  };

  const handleZodiacPress = (zodiacSign: ZodiacSign) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isPremiumUser) {
      showPaywallPlaceholder();
      return;
    }

    // Deliberately no skipPaywall param here - this is the grid entry point,
    // which the paywall gate above already applies to. Only Home's
    // birthdate-collection flow (index.tsx) sets skipPaywall: 'true'.
    router.push({
      pathname: '/(main)/horoscope-detail',
      params: { zodiacSign, returnTo: '/(main)/horoscope' }
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
          {/* Zodiac Info - icon, element label, and corner arrow removed;
              name/dates only, name sized up to fill the space they left. */}
          <View style={styles.zodiacInfo}>
            <Text variant="body" weight="bold" style={styles.zodiacName}>
              {item.name[language as 'en' | 'hi'] || item.name.en}
            </Text>
            <Text variant="caption" style={styles.zodiacDates}>
              {item.dates}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const getGradientByElement = (element: string): readonly [string, string, string] => {
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
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: contentPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - single row now (was back+title centered above, toggle
            stacked below it) - back+title grouped on the left, toggle
            right-aligned via the row's own space-between. White card
            background/shadow removed, blends into the page like the Audio/
            Wallpaper hub headers. */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>

            <Text variant="h4" weight="semibold" style={styles.headerTitle}>
              {t('horoscope.title')}
            </Text>
          </View>

          <LanguageToggle />
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
    backgroundColor: goldenTempleTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  // White card background/shadow removed entirely - blends into the page's
  // own background now, matching the Audio/Wallpaper hub headers' treatment.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    backgroundColor: goldenTempleTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.primary[50],
  },
  // Groups back+title on the left (was back on the left, title+toggle
  // centered as a separate stacked block) - toggle now sits to the right via
  // header's own space-between, this group just takes its natural width.
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  headerTitle: {
    color: goldenTempleTheme.colors.text.primary,
  },
  // Restyled to exactly match Home's todayHoroscopeCard (index.tsx) - fill/
  // border/shadow/radius only; paddingHorizontal/paddingVertical/alignItems
  // (this box's own content/height) deliberately left untouched.
  dateSection: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.lg,
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
    borderWidth: 1,
    borderColor: '#D4C4A8',
    marginHorizontal: goldenTempleTheme.spacing.lg,
    marginTop: goldenTempleTheme.spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    paddingHorizontal: goldenTempleTheme.spacing.lg,
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
  // justifyContent changed from 'space-between' to 'center' - zodiacInfo is
  // now the only child (icon/arrow removed), so space-between would just
  // stick it to the top instead of centering it in the card.
  cardGradient: {
    padding: goldenTempleTheme.spacing.md,
    minHeight: 140,
    justifyContent: 'center',
  },
  zodiacInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  // Sized up from 16 - fills the space the removed icon/element/arrow left,
  // now the card's sole focal text.
  zodiacName: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 6,
    textAlign: 'center',
  },
  zodiacDates: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
});