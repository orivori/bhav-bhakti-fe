import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { useI18nStore, Language } from '@/shared/stores/i18nStore';
import { useTranslation } from '@/hooks/useTranslation';

interface LanguageSelectionProps {
  onLanguageSelect?: (language: Language) => void;
  variant?: 'modal' | 'screen';
  showTitle?: boolean;
}

const languages = [
  { code: 'hi' as Language, name: 'हिंदी' },
  { code: 'en' as Language, name: 'English' },
];

export function LanguageSelection({
  onLanguageSelect,
  variant = 'modal',
  showTitle = true,
}: LanguageSelectionProps) {
  const { language, setLanguage } = useI18nStore();
  const { t } = useTranslation();

  const handleLanguageSelect = (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    onLanguageSelect?.(selectedLanguage);
  };

  return (
    <View style={[styles.container, variant === 'screen' && styles.screenContainer]}>
      {showTitle && (
        <Text
          variant={variant === 'screen' ? 'h3' : 'h4'}
          weight="bold"
          style={[styles.title, variant === 'screen' && styles.screenTitle]}
        >
          {t('profile.language')}
        </Text>
      )}

      <View style={[styles.languageList, variant === 'screen' && styles.screenLanguageList]}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageOption,
              language === lang.code && styles.languageOptionSelected,
              variant === 'screen' && styles.screenLanguageOption,
            ]}
            onPress={() => handleLanguageSelect(lang.code)}
            activeOpacity={0.7}
          >
            <Text
              variant="body"
              weight={language === lang.code ? "semibold" : "medium"}
              style={[
                styles.languageOptionText,
                language === lang.code && styles.languageOptionTextSelected,
                variant === 'screen' && styles.screenLanguageOptionText,
              ]}
            >
              {lang.name}
            </Text>
            {language === lang.code && (
              <Ionicons name="checkmark" size={20} color="#3b82f6" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#1f2937',
  },
  screenTitle: {
    marginBottom: 32,
    color: '#D4824A',
  },
  languageList: {
    gap: 12,
  },
  screenLanguageList: {
    gap: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  screenLanguageOption: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(212, 130, 74, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  languageOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  screenLanguageOptionText: {
    fontSize: 18,
  },
  languageOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});