import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { Text } from '@/components/atoms';
import * as Haptics from 'expo-haptics';

export const LanguageToggle = () => {
  const { language, setLanguage } = useI18nStore();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'hi' : 'en';
    setLanguage(newLanguage);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity
      style={styles.toggleButton}
      onPress={toggleLanguage}
    >
      <View style={styles.toggleContent}>
        <Ionicons
          name="language-outline"
          size={16}
          color={goldenTempleTheme.colors.primary[600]}
        />
        <Text weight="medium" style={styles.toggleText}>
          {language === 'en' ? 'EN' : 'हिं'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    backgroundColor: goldenTempleTheme.colors.primary[50],
    borderRadius: goldenTempleTheme.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: goldenTempleTheme.colors.primary[200],
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    color: goldenTempleTheme.colors.primary[600],
    fontSize: 12,
    fontWeight: '500',
  },
});