import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WhatsAppIcon from '../../assets/icons/whatsapp.svg';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useHoroscopeBySign } from '@/features/horoscope/hooks/useHoroscope';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { getZodiacBySign } from '@/data/zodiacData';
import { LanguageToggle } from '@/components/molecules/LanguageToggle';
import { getLocalDateString } from '@/shared/utils/dateUtil';
import type { ZodiacSign } from '@/types/horoscope';

export default function HoroscopeDetailScreen() {
  // skipPaywall is set by Home's "Today's Horoscope" card flow (the
  // birthdate-collection modal) - that entry point must never be paywalled.
  // Phase 4's paywall gate lives on the 12-sign grid itself (horoscope.tsx),
  // before navigation ever happens, so this screen still doesn't need to
  // read skipPaywall to enforce anything - by construction, every real nav
  // call site that reaches this screen is already allowed to be here. The
  // param is kept only so a future entry point can't accidentally forget it.
  // returnTo mirrors audio-player.tsx's own back-button pattern (CLAUDE.md
  // §27) - this screen is reachable both from Home's "Today's Horoscope"
  // card and from the 12-sign grid (horoscope.tsx), and router.back() alone
  // always fell through to the Tabs navigator's implicit fallback (Home),
  // regardless of actual entry point. No returnParams needed here - unlike
  // audio-player.tsx, neither entry point has state to restore on return.
  const { zodiacSign, skipPaywall, returnTo } = useLocalSearchParams<{ zodiacSign: ZodiacSign; skipPaywall?: string; returnTo?: string }>();
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { contentPadding } = useTabBarHeight();

  const handleBack = useCallback(() => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }, [returnTo]);

  // Rashifal is today-only for MVP - no past/future browsing, so this is a
  // plain constant now, not state (the date-navigation pill that used to
  // change it was removed).
  const selectedDate = new Date();

  // Fetch horoscope data for selected sign and date. Deliberately
  // getLocalDateString(selectedDate), NOT selectedDate.toISOString().split
  // ('T')[0] - the latter converts to UTC first and was rolling this back to
  // the previous calendar day for the first ~5.5 hours of every day in IST,
  // silently fetching yesterday's horoscope. handleShare()'s own
  // toLocaleDateString call below was never affected - it's untouched.
  const dateString = getLocalDateString(selectedDate);
  const { data: horoscope, isLoading, error, refetch } = useHoroscopeBySign(
    zodiacSign as ZodiacSign,
    dateString
  );

  const zodiacData = zodiacSign ? getZodiacBySign(zodiacSign) : null;


  const handleShare = async () => {
    if (!horoscope || !zodiacData) return;

    try {
      const formattedDate = selectedDate.toLocaleDateString(
        language === 'hi' ? 'hi-IN' : 'en-US',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      );

      await Share.share({
        message: `${zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en} - ${formattedDate}\n\n${horoscope.overallPrediction}\n\n${t('horoscope.luckyNumber')}: ${horoscope.luckyNumber?.join(', ') || 'N/A'}\n${t('horoscope.luckyColor')}: ${horoscope.luckyColor?.join(', ') || 'N/A'}`,
        title: `${t('horoscope.dailyHoroscope')} - ${zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getGradientColors = (): readonly [string, string, string] => {
    if (!zodiacData) return ['#8B5A2B', '#A0522D', '#D4AF37'];

    switch (zodiacData.element) {
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

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingIcon}>✨</Text>
          <Text variant="body" color="secondary">
            {language === 'hi' ? 'राशिफल लोड हो रहा है...' : 'Loading horoscope...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !horoscope || !zodiacData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={goldenTempleTheme.colors.error[500]} />
          <Text variant="body" color="error" style={styles.errorText}>
            {language === 'hi' ? 'राशिफल लोड करने में समस्या हुई' : 'Failed to load horoscope'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text variant="body" weight="semibold" style={styles.retryText}>
              {language === 'hi' ? 'दोबारा कोशिश करें' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: contentPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - single row: back+name grouped on the left, toggle+share
            right-aligned together with Share last (rightmost). White card
            background/shadow removed, blends into the page - same treatment
            as horoscope.tsx and the Audio/Wallpaper hub headers. */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>

            <Text variant="h5" weight="semibold" style={styles.headerTitle}>
              {zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <LanguageToggle />

            {/* Share icon swapped from Ionicons "share-outline" to the same
                local whatsapp.svg used elsewhere (audio-player.tsx,
                RingtoneFeedCard, AutoplayFeedCard) - handleShare itself is
                completely untouched. */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <WhatsAppIcon width={24} height={24} fill="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Zodiac Card */}
        <LinearGradient
          colors={getGradientColors()}
          style={styles.zodiacCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.zodiacHeader}>
            <View style={styles.zodiacIcon}>
              <Text style={styles.zodiacEmoji}>{zodiacData.icon}</Text>
            </View>
            <View style={styles.zodiacInfo}>
              <Text variant="h3" weight="bold" style={styles.zodiacName}>
                {zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en}
              </Text>
              <Text variant="body" style={styles.zodiacDetails}>
                {zodiacData.dates} • {language === 'hi' ? t(`elements.${zodiacData.element}`) : zodiacData.element}
              </Text>
            </View>
          </View>

          {/* Lucky Info */}
          <View style={styles.luckyInfo}>
            <View style={styles.luckyItem}>
              <Text style={styles.luckyLabel}>{t('horoscope.luckyNumber')}</Text>
              <Text style={styles.luckyValue}>
                {horoscope.luckyNumber?.join(', ') || 'N/A'}
              </Text>
            </View>
            <View style={styles.luckyItem}>
              <Text style={styles.luckyLabel}>{t('horoscope.luckyColor')}</Text>
              <Text style={styles.luckyValue}>
                {horoscope.luckyColor?.join(', ') || 'N/A'}
              </Text>
            </View>
            <View style={styles.luckyItem}>
              <Text style={styles.luckyLabel}>{t('horoscope.luckyTime')}</Text>
              <Text style={styles.luckyValue}>
                {horoscope.luckyTime || 'N/A'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Horoscope Content */}
        <View style={styles.contentCard}>
          <View style={styles.contentHeader}>
            <Text variant="h4" weight="semibold" style={styles.contentTitle}>
              {isToday()
                ? (language === 'hi' ? 'आज का राशिफल' : 'Today\'s Horoscope')
                : (language === 'hi' ? 'राशिफल' : 'Horoscope')}
            </Text>
          </View>

          <Text variant="body" style={styles.horoscopeText}>
            {horoscope.overallPrediction}
          </Text>

          {/* Categories */}
          {(horoscope.love || horoscope.career || horoscope.health || horoscope.finance) && (
            <View style={styles.categoriesSection}>
              <Text variant="h5" weight="semibold" style={styles.categoriesTitle}>
                {language === 'hi' ? 'विस्तृत भविष्यफल' : 'Detailed Predictions'}
              </Text>

              {horoscope.love && (
                <View style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="heart" size={16} color="#e11d48" />
                    <Text variant="body" weight="semibold" style={styles.categoryLabel}>
                      {t('horoscope.love')}
                    </Text>
                    {horoscope.loveRating && (
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= horoscope.loveRating! ? 'star' : 'star-outline'}
                            size={14}
                            color="#fbbf24"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <Text variant="body" style={styles.categoryText}>
                    {horoscope.love}
                  </Text>
                </View>
              )}

              {horoscope.career && (
                <View style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="briefcase" size={16} color="#3b82f6" />
                    <Text variant="body" weight="semibold" style={styles.categoryLabel}>
                      {t('horoscope.career')}
                    </Text>
                    {horoscope.careerRating && (
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= horoscope.careerRating! ? 'star' : 'star-outline'}
                            size={14}
                            color="#fbbf24"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <Text variant="body" style={styles.categoryText}>
                    {horoscope.career}
                  </Text>
                </View>
              )}

              {horoscope.health && (
                <View style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="fitness" size={16} color="#10b981" />
                    <Text variant="body" weight="semibold" style={styles.categoryLabel}>
                      {t('horoscope.health')}
                    </Text>
                    {horoscope.healthRating && (
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= horoscope.healthRating! ? 'star' : 'star-outline'}
                            size={14}
                            color="#fbbf24"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <Text variant="body" style={styles.categoryText}>
                    {horoscope.health}
                  </Text>
                </View>
              )}

              {horoscope.finance && (
                <View style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="card" size={16} color="#f59e0b" />
                    <Text variant="body" weight="semibold" style={styles.categoryLabel}>
                      {t('horoscope.finance')}
                    </Text>
                    {horoscope.financeRating && (
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= horoscope.financeRating! ? 'star' : 'star-outline'}
                            size={14}
                            color="#fbbf24"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <Text variant="body" style={styles.categoryText}>
                    {horoscope.finance}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
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
  // own background now, matching horoscope.tsx and the Audio/Wallpaper hub
  // headers' treatment.
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
  // Groups back+name on the left (was back on the left, name+toggle
  // centered as a separate stacked block).
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  headerTitle: {
    color: goldenTempleTheme.colors.text.primary,
  },
  // Groups toggle+share on the right, Share last (rightmost).
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  shareButton: {
    padding: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.primary[50],
  },
  zodiacCard: {
    marginHorizontal: goldenTempleTheme.spacing.md,
    marginTop: goldenTempleTheme.spacing.lg,
    borderRadius: goldenTempleTheme.borderRadius.xl,
    padding: goldenTempleTheme.spacing.lg,
    ...goldenTempleTheme.shadows.lg,
  },
  zodiacHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  zodiacIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: goldenTempleTheme.spacing.md,
  },
  zodiacEmoji: {
    fontSize: 32,
  },
  zodiacInfo: {
    flex: 1,
  },
  zodiacName: {
    color: '#fff',
    marginBottom: 4,
  },
  zodiacDetails: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  luckyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: goldenTempleTheme.borderRadius.md,
    padding: goldenTempleTheme.spacing.md,
  },
  luckyItem: {
    alignItems: 'center',
    flex: 1,
  },
  luckyLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  luckyValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  contentCard: {
    marginHorizontal: goldenTempleTheme.spacing.md,
    marginTop: goldenTempleTheme.spacing.lg,
    backgroundColor: '#fff',
    borderRadius: goldenTempleTheme.borderRadius.xl,
    padding: goldenTempleTheme.spacing.lg,
    ...goldenTempleTheme.shadows.md,
  },
  contentHeader: {
    marginBottom: goldenTempleTheme.spacing.md,
    paddingBottom: goldenTempleTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: goldenTempleTheme.colors.primary[100],
  },
  contentTitle: {
    color: goldenTempleTheme.colors.text.primary,
    textAlign: 'center',
  },
  horoscopeText: {
    color: goldenTempleTheme.colors.text.secondary,
    lineHeight: 24,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  categoriesSection: {
    marginTop: goldenTempleTheme.spacing.md,
  },
  categoriesTitle: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: goldenTempleTheme.spacing.md,
    textAlign: 'center',
  },
  categoryItem: {
    marginBottom: goldenTempleTheme.spacing.lg,
    paddingBottom: goldenTempleTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: goldenTempleTheme.colors.primary[50],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
    gap: goldenTempleTheme.spacing.sm,
  },
  categoryLabel: {
    color: goldenTempleTheme.colors.text.primary,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  categoryText: {
    color: goldenTempleTheme.colors.text.secondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.md,
  },
  loadingIcon: {
    fontSize: 48,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: goldenTempleTheme.spacing.xl,
  },
  errorText: {
    marginTop: goldenTempleTheme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: goldenTempleTheme.spacing.lg,
    paddingHorizontal: goldenTempleTheme.spacing.xl,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: goldenTempleTheme.colors.primary[500],
    borderRadius: goldenTempleTheme.borderRadius.full,
  },
  retryText: {
    color: '#fff',
  },
});
