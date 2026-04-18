import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button } from '@/components/atoms';
import { LanguageSelection } from '@/components/molecules/LanguageSelection';
import { Language, useI18nStore } from '@/shared/stores/i18nStore';
import { useOnboardingStore } from '@/shared/stores/onboardingStore';

export default function LanguageOnboardingScreen() {
  const { setLanguage } = useI18nStore();
  const { setOnboardingCompleted } = useOnboardingStore();

  const handleLanguageSelect = (language: Language) => {
    setLanguage(language);
  };

  const handleContinue = () => {
    // Mark onboarding as completed
    setOnboardingCompleted(true);
    router.replace('/(auth)/phone-login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flower" size={48} color="#D4824A" />
          </View>

          <Text variant="h2" weight="bold" style={styles.welcomeTitle}>
            Welcome to Bhav Bhakti
          </Text>

          <Text variant="h2" weight="bold" style={styles.welcomeTitleHindi}>
            भव भक्ति में आपका स्वागत है
          </Text>

          <Text variant="body" style={styles.subtitle}>
            Choose your preferred language
          </Text>

          <Text variant="body" style={styles.subtitleHindi}>
            अपनी पसंदीदा भाषा चुनें
          </Text>
        </View>

        {/* Language Selection */}
        <View style={styles.languageContainer}>
          <LanguageSelection
            variant="screen"
            showTitle={false}
            onLanguageSelect={handleLanguageSelect}
          />
        </View>

        {/* Continue Button */}
        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            fullWidth
            style={styles.continueButton}
          />

          <TouchableOpacity
            onPress={handleContinue}
            style={styles.skipButton}
          >
            <Text variant="caption" style={styles.skipText}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(212, 130, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#D4824A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTitle: {
    color: '#D4824A',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeTitleHindi: {
    color: '#D4824A',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 20,
  },
  subtitle: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleHindi: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 16,
  },
  languageContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 40,
  },
  footer: {
    gap: 16,
    paddingBottom: 20,
  },
  continueButton: {
    backgroundColor: '#D4824A',
    borderRadius: 12,
    paddingVertical: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
});