import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation as useI18n } from '@/shared/i18n/useTranslation';
import { horoscopeService } from '@/features/horoscope/services/horoscopeService';
import { profileService } from '@/features/profile/services/profileService';
import type { ZodiacSign } from '@/types/horoscope';

interface BirthdateModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: (zodiacSign: ZodiacSign) => void;
}

const MIN_DATE = new Date();
MIN_DATE.setFullYear(MIN_DATE.getFullYear() - 120);

// Extracts calendar-local Y/M/D rather than going through toISOString(),
// which converts to UTC first - for a birthdate near local midnight in an
// ahead-of-UTC timezone (e.g. IST, UTC+5:30) that conversion can roll the
// date back by one day, silently submitting the wrong birthdate and
// potentially the wrong zodiac sign at sign-boundary dates.
const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Centered floating modal, mirroring ViewingWindowSheet's convention (plain
// RN Modal + custom backdrop TouchableOpacity for tap-outside-to-dismiss)
// rather than the @gorhom/bottom-sheet pattern used for CounterSheet/
// InfoSheet - this is a one-off form, not a bottom-anchored contextual sheet.
export default function BirthdateModal({ visible, onDismiss, onSuccess }: BirthdateModalProps) {
  const { currentLanguage } = useI18n();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      setError(null);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDate) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const dateOfBirth = toISODateString(selectedDate);

      // Sequence matters: calculate first via zodiac.util.js's audited logic,
      // then submit dateOfBirth + the resulting zodiacSign together. Sending
      // dateOfBirth alone would let PUT /profile fall through to
      // profile.controller.js's own separate, never-audited inline
      // calculateZodiacSign instead.
      const zodiacResult = await horoscopeService.calculateZodiac({ dateOfBirth });
      await profileService.updateProfile({
        dateOfBirth,
        zodiacSign: zodiacResult.zodiacSign,
        rashi: zodiacResult.rashiName,
      });

      onSuccess(zodiacResult.zodiacSign);
      setSelectedDate(null);
    } catch (err) {
      console.error('Failed to save birthdate:', err);
      setError(
        currentLanguage === 'hi'
          ? 'कुछ गलत हो गया, कृपया पुनः प्रयास करें'
          : 'Something went wrong, please try again'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    if (isSubmitting) return;
    setSelectedDate(null);
    setError(null);
    onDismiss();
  };

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString(currentLanguage === 'hi' ? 'hi-IN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleDismiss}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.card}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={designSystemTheme.colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.title}>
            {currentLanguage === 'hi' ? 'आपका जन्मदिन कब है?' : 'When were you born?'}
          </Text>
          <Text style={styles.subtitle}>
            {currentLanguage === 'hi'
              ? 'सटीक राशिफल के लिए हमें आपकी जन्मतिथि चाहिए'
              : "We need your birthdate to show your personal horoscope"}
          </Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={designSystemTheme.colors.primary} />
            <Text style={styles.dateButtonText}>
              {formattedDate || (currentLanguage === 'hi' ? 'तारीख चुनें' : 'Select date')}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              minimumDate={MIN_DATE}
              onChange={handleDateChange}
            />
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.confirmButton, (!selectedDate || isSubmitting) && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selectedDate || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {currentLanguage === 'hi' ? 'जारी रखें' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: goldenTempleTheme.borderRadius.xl,
    backgroundColor: designSystemTheme.colors.surface,
    padding: goldenTempleTheme.spacing.lg,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: goldenTempleTheme.spacing.md,
    right: goldenTempleTheme.spacing.md,
    zIndex: 1,
  },
  title: {
    fontSize: designSystemTheme.fontSizes.cardTitle,
    fontWeight: '700',
    color: designSystemTheme.colors.textPrimary,
    marginBottom: goldenTempleTheme.spacing.xs,
    paddingRight: goldenTempleTheme.spacing.xl,
  },
  subtitle: {
    fontSize: designSystemTheme.fontSizes.body,
    color: designSystemTheme.colors.textSecondary,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
    borderWidth: 1,
    borderColor: designSystemTheme.colors.secondary,
    borderRadius: goldenTempleTheme.borderRadius.md,
    paddingVertical: goldenTempleTheme.spacing.md,
    paddingHorizontal: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  dateButtonText: {
    fontSize: designSystemTheme.fontSizes.body,
    color: designSystemTheme.colors.textPrimary,
  },
  errorText: {
    fontSize: designSystemTheme.fontSizes.body,
    color: '#C41E3A',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  confirmButton: {
    backgroundColor: designSystemTheme.colors.primary,
    borderRadius: goldenTempleTheme.borderRadius.md,
    paddingVertical: goldenTempleTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: designSystemTheme.fontSizes.body,
    fontWeight: '600',
    color: '#fff',
  },
});
