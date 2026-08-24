import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/atoms';
import { useToast } from '@/components/atoms/Toast';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { profileService } from '@/features/profile/services/profileService';
import { horoscopeService } from '@/features/horoscope/services/horoscopeService';
import { getLocalDateString } from '@/shared/utils/dateUtil';
import type { ProfileGender } from '@/types/profile';
import type { UpdateProfileRequest } from '@/types/profile';

// Same bounds as BirthdateModal.tsx's DateTimePicker - kept identical since
// this reuses that exact picker pattern, just inlined into a form instead of
// its own standalone modal.
const MIN_DATE = new Date();
MIN_DATE.setFullYear(MIN_DATE.getFullYear() - 120);

// Matches profile.validator.js's name rule exactly (letters, Devanagari,
// spaces only) - kept in sync deliberately rather than allowing characters
// the backend would reject on save.
const NAME_DISALLOWED_CHARS = /[^a-zA-Zऀ-ॿ\s]/g;
const NAME_MAX_LENGTH = 50;

const GENDER_OPTIONS: { key: ProfileGender; labelKey: string }[] = [
  { key: 'male', labelKey: 'profile.editProfileScreen.male' },
  { key: 'female', labelKey: 'profile.editProfileScreen.female' },
  { key: 'other', labelKey: 'profile.editProfileScreen.other' },
];

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { showToast } = useToast();
  const { contentPadding } = useTabBarHeight();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<ProfileGender | undefined>(undefined);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Original dateOfBirth (as a local-date string) so Save only re-runs the
  // audited zodiac calculation when the date actually changed, not on every
  // save regardless of whether this field was touched.
  const originalDateOfBirthRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const profile = await profileService.getProfile();
        if (!isMounted) return;

        setName(profile.name || '');
        setGender((profile.profile?.gender as ProfileGender) || undefined);

        if (profile.profile?.dateOfBirth) {
          originalDateOfBirthRef.current = profile.profile.dateOfBirth;
          setDateOfBirth(new Date(profile.profile.dateOfBirth));
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNameChange = (text: string) => {
    const filtered = text.replace(NAME_DISALLOWED_CHARS, '').slice(0, NAME_MAX_LENGTH);
    setName(filtered);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && date) {
      setDateOfBirth(date);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // name is always sent, even empty - clearing the name is a deliberate
      // supported action (backend treats an empty string as "clear the
      // name"), never silently omitted to "preserve" whatever was there.
      const payload: UpdateProfileRequest = {
        name: name.trim(),
      };

      if (gender) {
        payload.gender = gender;
      }

      if (dateOfBirth) {
        const dateStr = getLocalDateString(dateOfBirth);

        if (dateStr !== originalDateOfBirthRef.current) {
          // Audited path, same sequence BirthdateModal.tsx uses: calculate
          // via horoscopeService first, then include the result alongside
          // dateOfBirth in this same payload. Sending dateOfBirth without an
          // explicit zodiacSign would fall through to profile.controller.js's
          // separate, never-audited inline calculation instead.
          const zodiacResult = await horoscopeService.calculateZodiac({ dateOfBirth: dateStr });
          payload.dateOfBirth = dateStr;
          payload.zodiacSign = zodiacResult.zodiacSign;
          payload.rashi = zodiacResult.rashiName;
        }
      }

      await profileService.updateProfile(payload);
      // router.back() lands on Home instead of Profile here - same
      // implicit-back-history unreliability already hit (and fixed the same
      // way) for audio-player.tsx/horoscope-detail.tsx/mantras.tsx. Edit
      // Profile has exactly one entry point (profile.tsx), so the
      // destination can be hardcoded rather than threaded through as a
      // returnTo param.
      router.replace('/(main)/profile');
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast({ type: 'error', message: t('profile.editProfileScreen.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = dateOfBirth
    ? dateOfBirth.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(main)/profile')}>
          <Ionicons name="arrow-back" size={24} color={goldenTempleTheme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: contentPadding }}
      >
        <Text variant="h3" weight="bold" align="center" style={styles.title}>
          {t('profile.editProfileScreen.title')}
        </Text>

        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#9ca3af" />
          </View>
        </View>

        <View style={styles.field}>
          <Text variant="body" weight="medium" style={styles.label}>
            {t('profile.editProfileScreen.name')}
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder={t('profile.editProfileScreen.namePlaceholder')}
            placeholderTextColor="#8B7355"
            maxLength={NAME_MAX_LENGTH}
          />
        </View>

        <View style={styles.field}>
          <Text variant="body" weight="medium" style={styles.label}>
            {t('profile.editProfileScreen.dateOfBirth')}
          </Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Text
              variant="body"
              style={formattedDate ? styles.dateText : styles.dateTextPlaceholder}
            >
              {formattedDate || t('profile.editProfileScreen.selectDate')}
            </Text>
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={dateOfBirth || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            minimumDate={MIN_DATE}
            onChange={handleDateChange}
          />
        )}

        <View style={styles.field}>
          <Text variant="body" weight="medium" style={styles.label}>
            {t('profile.editProfileScreen.gender')}
          </Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.genderPill, gender === option.key && styles.genderPillActive]}
                onPress={() => setGender(option.key)}
                activeOpacity={0.8}
              >
                <Text
                  variant="body"
                  weight="semibold"
                  style={gender === option.key ? styles.genderLabelActive : styles.genderLabel}
                >
                  {t(option.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text variant="body" weight="semibold" style={styles.saveButtonText}>
                {t('profile.editProfileScreen.saveProfile')}
              </Text>
            )}
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
  },
  backButton: {
    padding: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.primary[50],
  },
  title: {
    marginTop: goldenTempleTheme.spacing.sm,
    marginBottom: goldenTempleTheme.spacing.lg,
    color: goldenTempleTheme.colors.text.primary,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(243, 244, 246, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  field: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  label: {
    marginBottom: goldenTempleTheme.spacing.sm,
    color: goldenTempleTheme.colors.text.primary,
  },
  input: {
    backgroundColor: '#f7ebc4',
    borderRadius: goldenTempleTheme.borderRadius.md,
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.md,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.primary,
    justifyContent: 'center',
    minHeight: 52,
  },
  dateText: {
    color: goldenTempleTheme.colors.text.primary,
  },
  dateTextPlaceholder: {
    color: '#8B7355',
  },
  genderRow: {
    flexDirection: 'row',
    gap: goldenTempleTheme.spacing.sm,
  },
  genderPill: {
    flex: 1,
    paddingVertical: goldenTempleTheme.spacing.sm + 2,
    borderRadius: goldenTempleTheme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
  },
  genderPillActive: {
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
  },
  genderLabel: {
    color: '#8B7355',
  },
  genderLabelActive: {
    color: '#FFFFFF',
  },
  saveContainer: {
    alignItems: 'center',
    marginTop: goldenTempleTheme.spacing.md,
  },
  saveButton: {
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    borderRadius: goldenTempleTheme.borderRadius.full,
    paddingHorizontal: goldenTempleTheme.spacing.xl,
    paddingVertical: goldenTempleTheme.spacing.md,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
});
