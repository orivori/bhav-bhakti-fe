import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WhatsAppIcon from '../../assets/icons/whatsapp.svg';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useRashifalReading } from '@/features/rashifal/useRashifalReading';
import { isRashifalLockedError, type RashifalTrigger } from '@/features/rashifal/rashifalLock';
import { runRashifalUnlockFlow, shouldOpenAfterFlow } from '@/features/rashifal/rashifalUnlockFlow';
import { invalidateRashifalStatus } from '@/features/rashifal/useRashifalOpener';
import { showStoryNotice } from '@/store/storyNoticeStore';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { getZodiacBySign } from '@/data/zodiacData';
import { LanguageToggle } from '@/components/molecules/LanguageToggle';
import { PLAY_STORE_URL } from '@/shared/config/appStoreLink';
import type { ZodiacSign } from '@/types/horoscope';
import { logRashifalViewed } from '@/utils/analytics/engagementEvents';
import { logMetaRashifalViewed } from '@/utils/analytics/metaAppEvents';
import { resolvePendingAppReopened } from '@/utils/analytics/retentionEvents';

export default function HoroscopeDetailScreen() {
  // Rashifal is free for everyone, unconditionally - no paywall anywhere on
  // this screen (this screen never had one of its own; the app's only
  // Rashifal gate lived on the 12-sign grid, horoscope.tsx, and has been
  // removed as a deliberate product decision).
  // returnTo mirrors audio-player.tsx's own back-button pattern (CLAUDE.md
  // §27) - this screen is reachable both from Home's "Today's Horoscope"
  // card and from the 12-sign grid (horoscope.tsx), and router.back() alone
  // always fell through to the Tabs navigator's implicit fallback (Home),
  // regardless of actual entry point. No returnParams needed here - unlike
  // audio-player.tsx, neither entry point has state to restore on return.
  // entry: 'notification' when a push opened this screen (deepLink.ts) - only
  // the analytics trigger of a Rashifal unlock offered here.
  const { zodiacSign, returnTo, entry } = useLocalSearchParams<{ zodiacSign: ZodiacSign; returnTo?: string; entry?: string }>();
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { contentPadding } = useTabBarHeight();

  // Fires once per mount - covers both real entry points (Home's card and
  // the 12-sign grid), since both navigate to this one shared screen. Also
  // resolves a pending Retention-bucket app_reopened check (see
  // retentionEvents.ts) - a no-op when nothing is pending.
  useEffect(() => {
    if (zodiacSign) {
      logRashifalViewed({ zodiac_sign: zodiacSign });
      logMetaRashifalViewed();
    }
    resolvePendingAppReopened('rashifal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = useCallback(() => {
    if (returnTo) {
      router.navigate(returnTo as any);
      return;
    }
    router.back();
  }, [returnTo]);

  // Android's hardware back button AND its edge-swipe back gesture both
  // dispatch through 'hardwareBackPress', bypassing this screen's own
  // in-app back button entirely - same class of bug already fixed on
  // audio-player.tsx, legal-document.tsx, and delete-account.tsx (see
  // audio-player.tsx's own comment on this same pattern for the full
  // predictiveBackGestureEnabled:false rationale). Without this listener,
  // hardware/gesture back falls through to React Navigation's default pop,
  // which doesn't know about returnTo and always lands on Home regardless
  // of actual entry point. Routing through the EXACT SAME handleBack the
  // chevron already uses correctly keeps both back paths in permanent
  // lockstep by construction. useFocusEffect (not mount/unmount) is
  // required since Tabs screens in this app don't unmount between
  // navigations - a mount-only effect would keep hijacking back presses
  // even while a different tab is focused.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  // Rashifal is today-only - no past/future browsing. "Today" is IST, decided
  // by the server; the hook pins the served day for the rest of this visit
  // (features/rashifal/useRashifalReading.ts).
  const selectedDate = new Date();
  const { data: horoscope, isLoading, error, refetch } = useRashifalReading(zodiacSign as ZodiacSign);

  const zodiacData = zodiacSign ? getZodiacBySign(zodiacSign) : null;

  // Rashifal ad gate: the server answers 403 + unlock 'ad' for a locked sign
  // (only while its switches are on and only for this app code). Home's card
  // and the grid offer the ad before they open this screen; this catches
  // every other way in (a notification, a failed status check). A reading
  // already on screen is never replaced by a later refusal.
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const isLocked = !horoscope && isRashifalLockedError(error);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const offeredRef = useRef<string | null>(null);
  const unlockTrigger: RashifalTrigger = entry === 'notification' ? 'notification' : 'reading_screen';

  const startUnlock = useCallback(async () => {
    if (!zodiacSign || isUnlocking) return;
    setIsUnlocking(true);
    try {
      const result = await runRashifalUnlockFlow({ zodiacSign, trigger: unlockTrigger });
      if (result === 'unlocked') void invalidateRashifalStatus(queryClient);
      if (shouldOpenAfterFlow(result)) {
        await refetch();
      } else if (result === 'failed') {
        await showStoryNotice('rashifalLock.unlockFailed');
      }
    } finally {
      setIsUnlocking(false);
    }
  }, [zodiacSign, isUnlocking, unlockTrigger, queryClient, refetch]);

  // Offer the ad once per visit and sign when the locked answer arrives.
  // "Not now" leaves the locked panel with its own button.
  useFocusEffect(
    useCallback(() => {
      return () => {
        offeredRef.current = null;
      };
    }, [])
  );
  useEffect(() => {
    if (!isLocked || !isFocused || !zodiacSign) return;
    if (offeredRef.current === zodiacSign) return;
    offeredRef.current = zodiacSign;
    void startUnlock();
  }, [isLocked, isFocused, zodiacSign, startUnlock]);


  const handleShare = async () => {
    if (!horoscope || !zodiacData) return;

    try {
      // A short caption with the Play Store link, not the reading itself -
      // the reading stays in the app. Text-only: there's no horoscope image.
      const signName = zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en;
      await Share.share({
        message: t('horoscope.shareCaption', { sign: signName, link: PLAY_STORE_URL }),
        title: `${t('horoscope.dailyHoroscope')} - ${signName}`,
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

  if (isLoading && !horoscope) {
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

  if (isLocked && zodiacData) {
    const signName = zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed" size={48} color={goldenTempleTheme.colors.primary[500]} />
          <Text variant="h5" weight="semibold" style={styles.lockedTitle}>
            {t('rashifalLock.lockedTitle')}
          </Text>
          <Text variant="body" color="secondary" style={styles.lockedBody}>
            {t('rashifalLock.lockedBody', { sign: signName })}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, isUnlocking && styles.buttonDisabled]}
            onPress={startUnlock}
            disabled={isUnlocking}
          >
            <Text variant="body" weight="semibold" style={[styles.retryText, styles.lockedButtonText]}>
              {t('rashifalLock.watchToRead')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!horoscope || !zodiacData) {
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
  // Rashifal locked panel. Devanagari floors per CLAUDE.md §71.
  lockedHeader: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingTop: goldenTempleTheme.spacing.sm,
  },
  lockedTitle: {
    marginTop: goldenTempleTheme.spacing.md,
    textAlign: 'center',
    lineHeight: 30,
    minHeight: 30,
  },
  lockedBody: {
    marginTop: goldenTempleTheme.spacing.sm,
    textAlign: 'center',
    lineHeight: 26,
  },
  lockedButtonText: {
    textAlign: 'center',
    lineHeight: 26,
    minHeight: 26,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
