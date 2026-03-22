import React, { useState } from 'react';
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
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useHoroscopeBySign } from '@/features/horoscope/hooks/useHoroscope';
import { useTranslation } from '@/hooks/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { getZodiacBySign } from '@/data/zodiacData';
import { LanguageToggle } from '@/components/molecules/LanguageToggle';
import type { ZodiacSign } from '@/types/horoscope';

export default function HoroscopeDetailScreen() {
  const { zodiacSign } = useLocalSearchParams<{ zodiacSign: ZodiacSign }>();
  const { t, language } = useTranslation();
  const { contentPadding } = useTabBarHeight();

  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch horoscope data for selected sign and date
  const dateString = selectedDate.toISOString().split('T')[0];
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

  const getGradientColors = () => {
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

  const formatDisplayDate = () => {
    return selectedDate.toLocaleDateString(
      language === 'hi' ? 'hi-IN' : 'en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text variant="h5" weight="semibold" style={styles.headerTitle}>
              {zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en}
            </Text>
            <LanguageToggle />
          </View>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={() => {
              const prevDay = new Date(selectedDate);
              prevDay.setDate(prevDay.getDate() - 1);
              setSelectedDate(prevDay);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            disabled={selectedDate <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
          >
            <Ionicons name="chevron-back" size={20} color={goldenTempleTheme.colors.primary[600]} />
          </TouchableOpacity>

          <View style={styles.dateDisplay}>
            <Text variant="body" weight="medium" style={styles.dateSelectorText}>
              {formatDisplayDate()}
            </Text>
            {isToday() && (
              <Text variant="caption" style={styles.todayLabel}>
                {language === 'hi' ? 'आज' : 'Today'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={() => {
              const nextDay = new Date(selectedDate);
              nextDay.setDate(nextDay.getDate() + 1);
              setSelectedDate(nextDay);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            disabled={selectedDate >= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          >
            <Ionicons name="chevron-forward" size={20} color={goldenTempleTheme.colors.primary[600]} />
          </TouchableOpacity>
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
    gap: 6,
  },
  headerTitle: {
    textAlign: 'center',
    color: goldenTempleTheme.colors.text.primary,
  },
  shareButton: {
    padding: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.primary[50],
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: goldenTempleTheme.spacing.md,
    marginTop: goldenTempleTheme.spacing.lg,
    backgroundColor: '#fff',
    borderRadius: goldenTempleTheme.borderRadius.lg,
    padding: goldenTempleTheme.spacing.md,
    ...goldenTempleTheme.shadows.sm,
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: goldenTempleTheme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateSelectorText: {
    color: goldenTempleTheme.colors.text.primary,
    textAlign: 'center',
  },
  todayLabel: {
    color: goldenTempleTheme.colors.primary[600],
    fontSize: 12,
    marginTop: 2,
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