import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  TextInput,
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

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const isTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return selectedDate.toDateString() === tomorrow.toDateString();
  };

  const formatDisplayDate = () => {
    return selectedDate.toLocaleDateString(
      language === 'hi' ? 'hi-IN' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
  };

  const handleTodayPress = () => {
    setSelectedDate(new Date());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTomorrowPress = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        contentContainerStyle={{ paddingBottom: contentPadding + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Bhav Bhakti</Text>
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/profile');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>


        {/* Zodiac Info and Day Selection Section */}
        <View style={styles.zodiacInfoSection}>
          <View style={styles.zodiacIconContainer}>
            <Text style={styles.zodiacIcon}>{zodiacData.icon}</Text>
          </View>
          <Text style={styles.zodiacName}>
            {zodiacData.name[language as 'en' | 'hi'] || zodiacData.name.en}
          </Text>

          {/* Today/Tomorrow Buttons */}
          <View style={styles.dayButtonsContainer}>
            <TouchableOpacity
              style={[styles.dayButton, isToday() && styles.dayButtonActive]}
              onPress={handleTodayPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayButtonText, isToday() && styles.dayButtonTextActive]}>
                {language === 'hi' ? 'आज' : 'Today'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dayButton, isTomorrow() && styles.dayButtonActive]}
              onPress={handleTomorrowPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayButtonText, isTomorrow() && styles.dayButtonTextActive]}>
                {language === 'hi' ? 'कल' : 'Tomorrow'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Display */}
        <View style={styles.dateDisplaySection}>
          <Text style={styles.selectedDateText}>
            {formatDisplayDate()}
          </Text>
        </View>

        {/* Overview Card */}
        <View style={styles.predictionCard}>
          <Text style={styles.predictionTitle}>
            {language === 'hi' ? 'अवलोकन' : 'Overview'}
          </Text>
          <Text style={styles.predictionText}>
            {horoscope.overallPrediction}
          </Text>
        </View>

        {/* Love & Relationships Card */}
        {horoscope.love && (
          <View style={styles.predictionCard}>
            <Text style={styles.predictionTitle}>
              {language === 'hi' ? 'प्रेम और रिश्ते' : 'Love & Relationships'}
            </Text>
            <Text style={styles.predictionText}>
              {horoscope.love}
            </Text>
          </View>
        )}

        {/* Career & Finance Card */}
        {(horoscope.career || horoscope.finance) && (
          <View style={styles.predictionCard}>
            <Text style={styles.predictionTitle}>
              {language === 'hi' ? 'करियर और वित्त' : 'Career & Finance'}
            </Text>
            <Text style={styles.predictionText}>
              {horoscope.career || horoscope.finance}
            </Text>
          </View>
        )}

        {/* Health & Wellness Card */}
        {horoscope.health && (
          <View style={styles.predictionCard}>
            <Text style={styles.predictionTitle}>
              {language === 'hi' ? 'स्वास्थ्य और कल्याण' : 'Health & Wellness'}
            </Text>
            <Text style={styles.predictionText}>
              {horoscope.health}
            </Text>
          </View>
        )}

        {/* Lucky Info Cards */}
        <View style={styles.luckyCardsContainer}>
          {/* Lucky Color Card */}
          <View style={styles.luckyCard}>
            <Text style={styles.luckyCardTitle}>
              {language === 'hi' ? 'भाग्यशाली रंग' : 'Lucky color'}
            </Text>
            <View style={styles.luckyColorIndicator}>
              <View style={[styles.colorDot, { backgroundColor: '#FFD700' }]} />
              <Text style={styles.luckyCardValue}>
                {horoscope.luckyColor?.[0] || (language === 'hi' ? 'पीला' : 'Yellow')}
              </Text>
            </View>
          </View>

          {/* Lucky Number Card */}
          <View style={styles.luckyCard}>
            <Text style={styles.luckyCardTitle}>
              {language === 'hi' ? 'भाग्यशाली संख्या' : 'Lucky number'}
            </Text>
            <View style={styles.luckyNumberContainer}>
              <Text style={styles.luckyNumber}>
                {horoscope.luckyNumber?.[0] || '7'}
              </Text>
              <Text style={styles.luckyNumberText}>
                {horoscope.luckyNumber?.[0] ?
                  (language === 'hi' ?
                    (['शून्य','एक','दो','तीन','चार','पांच','छह','सात','आठ','नौ'])[horoscope.luckyNumber[0]] || horoscope.luckyNumber[0].toString()
                    : (['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'])[horoscope.luckyNumber[0]] || horoscope.luckyNumber[0].toString()
                  ) :
                  (language === 'hi' ? 'सात' : 'Seven')
                }
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da',
  },
  scrollView: {
    flex: 1,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingTop: goldenTempleTheme.spacing.lg,
    paddingBottom: 4,
    minHeight: 60,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 28,
    includeFontPadding: false,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4824A',
    justifyContent: 'center',
    alignItems: 'center',
  },


  // Zodiac Info Section
  zodiacInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
  },
  zodiacIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#CA3500',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: goldenTempleTheme.spacing.md,
  },
  zodiacIcon: {
    fontSize: 28,
    color: '#fff',
  },
  zodiacName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#CA3500',
    flex: 1,
  },

  // Day Buttons (Tab-like)
  dayButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7ebc4',
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: '#CA3500',
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#CA3500',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CA3500',
  },
  dayButtonTextActive: {
    color: '#fff',
  },

  // Date Display Section
  dateDisplaySection: {
    alignItems: 'flex-end',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#CA3500',
  },

  // Prediction Cards
  predictionCard: {
    backgroundColor: '#f7ebc4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CA3500',
    marginHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.md,
    padding: goldenTempleTheme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  predictionText: {
    fontSize: 14,
    color: '#8B4513',
    lineHeight: 20,
  },

  // Lucky Cards
  luckyCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    gap: 12,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  luckyCard: {
    flex: 1,
    backgroundColor: '#f7ebc4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CA3500',
    padding: goldenTempleTheme.spacing.lg,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  luckyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  luckyColorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  luckyCardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B4513',
  },
  luckyNumberContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  luckyNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 24,
  },
  luckyNumberText: {
    fontSize: 12,
    color: '#8B4513',
  },

  // Loading and Error states
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