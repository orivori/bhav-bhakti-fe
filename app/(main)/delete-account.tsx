import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, StyleSheet, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/atoms';
import { useToast } from '@/components/atoms/Toast';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { profileService } from '@/features/profile/services/profileService';
import { deriveSupportId } from '@/shared/utils/supportId';
import { SUPPORT_EMAIL } from '@/shared/config/support';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useI18nStore } from '@/shared/stores/i18nStore';

// Confirmation screen for the account-deletion flow - deliberately NOT a
// self-service delete (no backend endpoint for this exists, and irreversible
// data deletion warrants a human support step regardless). This screen only
// explains the consequences and hands off to a pre-filled support email.
export default function DeleteAccountScreen() {
  const { user } = useAuth();
  const { language } = useI18nStore();
  const { showToast } = useToast();
  const [supportId, setSupportId] = useState<string | null>(deriveSupportId(user?.firebaseUid));

  // Falls back to a fresh profile fetch when the locally-stored session
  // predates firebaseUid being included in the login response (see §82) -
  // user?.firebaseUid alone can't be trusted for sessions saved before this
  // change shipped.
  useEffect(() => {
    if (supportId) return;
    let isMounted = true;
    profileService
      .getProfile()
      .then((profile) => {
        if (isMounted) setSupportId(deriveSupportId(profile.firebaseUid));
      })
      .catch((error) => {
        console.error('Failed to load profile for support ID:', error);
      });
    return () => {
      isMounted = false;
    };
  }, [supportId]);

  const phoneDisplay = user?.phoneNumber ? `${user.countryCode} ${user.phoneNumber}` : '';

  const handleBack = useCallback(() => {
    router.replace('/(main)/profile');
  }, []);

  // Same fix as audio-player.tsx's handleBack/BackHandler pairing (and
  // legal-document.tsx's identical pairing) - Android's hardware back button
  // and its edge-swipe gesture both dispatch through 'hardwareBackPress'
  // (app.config.js sets predictiveBackGestureEnabled: false), which without
  // this listener falls through to React Navigation's default pop and lands
  // on Home instead of Profile. useFocusEffect (not a plain mount/unmount
  // effect) is required since Tabs screens in this app don't unmount between
  // navigations.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  const handleRequestDeletion = async () => {
    const subject = language === 'hi' ? 'खाता हटाने का अनुरोध' : 'Account Deletion Request';
    const bodyLines = [
      language === 'hi' ? 'मैं अपना Bhav Bhakti खाता हटाना चाहता/चाहती हूं।' : 'I would like to delete my Bhav Bhakti account.',
      '',
      `${language === 'hi' ? 'फ़ोन नंबर' : 'Phone number'}: ${phoneDisplay}`,
      `${language === 'hi' ? 'सहायता आईडी' : 'Support ID'}: ${supportId || (language === 'hi' ? 'अनुपलब्ध' : 'unavailable')}`,
    ];
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (!canOpen) throw new Error('No email client available');
      await Linking.openURL(mailtoUrl);
    } catch (error) {
      console.error('Failed to open mail client:', error);
      showToast({
        type: 'error',
        message:
          language === 'hi'
            ? `कृपया सीधे ${SUPPORT_EMAIL} पर ईमेल करें`
            : `Please email ${SUPPORT_EMAIL} directly`,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={goldenTempleTheme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning-outline" size={48} color={goldenTempleTheme.colors.destructive.DEFAULT} />
        </View>

        <Text variant="h3" weight="bold" align="center" style={styles.title}>
          {language === 'hi' ? 'खाता हटाएं' : 'Delete Account'}
        </Text>

        <Text variant="body" color="secondary" align="center" style={styles.description}>
          {language === 'hi'
            ? 'खाता हटाना स्थायी और अपरिवर्तनीय है। आपका सारा डेटा - प्रोफ़ाइल, पसंदीदा और सहेजी गई सामग्री - हमेशा के लिए हटा दिया जाएगा।'
            : "Deleting your account is permanent and cannot be undone. All your data - profile, likes, and saved content - will be permanently erased."}
        </Text>

        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={20} color={goldenTempleTheme.colors.warning} />
          <Text variant="caption" color="secondary" style={styles.warningText}>
            {language === 'hi'
              ? 'यदि आपकी कोई सक्रिय सदस्यता है, तो कृपया खाता हटाने का अनुरोध करने से पहले प्रोफ़ाइल में "सदस्यता प्रबंधित करें" से उसे अलग से रद्द करें।'
              : 'If you have an active subscription, please cancel it separately from "Manage Subscription" in Profile before requesting account deletion.'}
          </Text>
        </View>

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text variant="caption" color="secondary">
              {language === 'hi' ? 'फ़ोन नंबर' : 'Phone number'}
            </Text>
            <Text variant="body" weight="medium">
              {phoneDisplay || '-'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="caption" color="secondary">
              {language === 'hi' ? 'सहायता आईडी' : 'Support ID'}
            </Text>
            <Text variant="body" weight="medium">
              {supportId || '-'}
            </Text>
          </View>
        </View>

        <Button
          title={language === 'hi' ? 'खाता हटाने का अनुरोध करें' : 'Request Account Deletion'}
          onPress={handleRequestDeletion}
          variant="outline"
          fullWidth
          style={styles.deleteButton}
          textStyle={{ color: goldenTempleTheme.colors.destructive.DEFAULT }}
        />

        <Text variant="caption" color="secondary" align="center" style={styles.fallbackText}>
          {language === 'hi'
            ? `या सीधे इस पते पर ईमेल करें: ${SUPPORT_EMAIL}`
            : `Or email us directly at: ${SUPPORT_EMAIL}`}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingBottom: goldenTempleTheme.spacing['2xl'],
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  title: {
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  description: {
    lineHeight: 20,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  warningBox: {
    flexDirection: 'row',
    gap: goldenTempleTheme.spacing.sm,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: goldenTempleTheme.borderRadius.md,
    padding: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  warningText: {
    flex: 1,
    lineHeight: 18,
  },
  detailsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: goldenTempleTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.4)',
    padding: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.xl,
    gap: goldenTempleTheme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    borderColor: goldenTempleTheme.colors.destructive.DEFAULT,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  fallbackText: {
    lineHeight: 18,
  },
});
