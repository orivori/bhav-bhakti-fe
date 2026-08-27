import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet, Modal, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { Button, Text } from '@/components/atoms';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { usePremiumStore } from '@/store/premiumStore';
import { useTranslation } from 'react-i18next';
import { useI18nStore, SELECTABLE_LANGUAGES } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { profileService } from '@/features/profile/services/profileService';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t } = useTranslation();
  const { language, setLanguage, getLanguageLabel } = useI18nStore();
  const { contentPadding } = useTabBarHeight();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Refetches on every focus (not just mount) so returning from Edit Profile
  // reflects a just-saved name without a full app restart - matches the
  // tab-persistence model already used elsewhere in this app rather than a
  // separate optimistic-update mechanism.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      profileService
        .getProfile()
        .then((profile) => {
          if (isMounted) setDisplayName(profile.name || null);
        })
        .catch((error) => {
          console.error('Failed to load profile:', error);
        });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const languages = SELECTABLE_LANGUAGES.map((code) => ({
    code,
    name: getLanguageLabel(code),
  }));

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.confirmLogout'), [
      { text: t('profile.no'), style: 'cancel' },
      { text: t('profile.yes'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleEditProfile = () => {
    router.push('/(main)/edit-profile');
  };

  const handleManageSubscription = () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    // Premium-management UI (cancel/change plan, billing history, etc.)
    // doesn't exist yet - stubbed until it's built.
    Alert.alert(
      t('profile.manageSubscription'),
      language === 'hi' ? 'यह सुविधा जल्द आ रही है' : 'This feature is coming soon!'
    );
  };

  const handleOpenNotificationSettings = () => {
    if (Platform.OS === 'android') {
      // Same technique as the Sound Settings fix (RingtoneFeedCard.tsx) -
      // APP_NOTIFICATION_SETTINGS needs the package-name extra to scope it
      // to this app specifically, otherwise it can land on a generic
      // all-apps notification list. Package read dynamically from
      // app.json/expoConfig, not hardcoded, so it can't drift out of sync.
      const packageName = Constants.expoConfig?.android?.package;
      IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
        packageName ? { extra: { 'android.provider.extra.APP_PACKAGE': packageName } } : undefined
      ).catch(() => Linking.openSettings());
    } else {
      Linking.openSettings();
    }
  };

  const accountOptions = [
    {
      id: 1,
      title: t('profile.editProfile'),
      icon: 'person-outline',
      description: language === 'hi' ? 'अपना नाम और जानकारी अपडेट करें' : 'Update your name and information',
      onPress: handleEditProfile,
    },
    {
      id: 2,
      title: t('profile.manageSubscription'),
      icon: 'card-outline',
      description: isPremium
        ? (language === 'hi' ? 'प्रीमियम सदस्यता प्रबंधित करें' : 'Manage your premium subscription')
        : (language === 'hi' ? 'प्रीमियम में अपग्रेड करें' : 'Upgrade to premium'),
      onPress: handleManageSubscription,
    },
  ];

  const appOptions = [
    {
      id: 1,
      title: t('profile.language'),
      icon: 'language-outline',
      description: getLanguageLabel(language),
      onPress: () => setShowLanguageModal(true),
    },
    {
      id: 2,
      title: t('profile.notifications'),
      icon: 'notifications-outline',
      description: language === 'hi' ? 'सूचना प्राथमिकताएं प्रबंधित करें' : 'Manage notification preferences',
      onPress: handleOpenNotificationSettings,
    },
    {
      id: 3,
      title: t('profile.privacy'),
      icon: 'shield-checkmark-outline',
      description: language === 'hi' ? 'अपनी गोपनीयता सेटिंग्स नियंत्रित करें' : 'Control your privacy settings',
      onPress: () => Alert.alert(t('profile.privacy'), language === 'hi' ? 'गोपनीयता सेटिंग्स प्रबंधित करें' : 'Manage privacy settings'),
    },
    {
      id: 4,
      title: t('profile.termsAndConditions'),
      icon: 'document-text-outline',
      description: language === 'hi' ? 'हमारी सेवा की शर्तें देखें' : 'View our terms of service',
      onPress: () => Alert.alert(t('profile.termsAndConditions'), language === 'hi' ? 'यह सुविधा जल्द आ रही है' : 'This feature is coming soon!'),
    },
    {
      id: 5,
      title: t('profile.refundPolicy'),
      icon: 'cash-outline',
      description: language === 'hi' ? 'हमारी धनवापसी नीति देखें' : 'View our refund policy',
      onPress: () => Alert.alert(t('profile.refundPolicy'), language === 'hi' ? 'यह सुविधा जल्द आ रही है' : 'This feature is coming soon!'),
    },
    {
      id: 6,
      title: language === 'hi' ? 'सहायता और सहयोग' : 'Help & Support',
      icon: 'help-circle-outline',
      description: language === 'hi' ? 'सहायता प्राप्त करें और संपर्क करें' : 'Get help and contact support',
      onPress: () => Alert.alert(language === 'hi' ? 'सहायता' : 'Support', language === 'hi' ? 'हमारी सहायता टीम से संपर्क करें' : 'Contact our support team'),
    },
    {
      id: 7,
      title: t('profile.aboutUs'),
      icon: 'information-circle-outline',
      description: language === 'hi'
        ? `ऐप संस्करण ${Constants.expoConfig?.version || ''}`
        : `App version ${Constants.expoConfig?.version || ''}`,
      // Appends the currently-running EAS Update's identity (update ID,
      // channel, publish time) below the app name/version - lets the update
      // ID here be directly compared against the one `eas update` prints on
      // publish, so it's possible to confirm a fix is actually live instead
      // of guessing. isEmbeddedLaunch is checked first: when true, the app
      // is running the version baked into the installed APK itself, no OTA
      // update has ever applied, and updateId would just be null - the
      // fallback message says so explicitly rather than showing a
      // confusing blank/unavailable update ID.
      onPress: () => {
        const updateInfo = Updates.isEmbeddedLaunch
          ? language === 'hi'
            ? 'एम्बेडेड बिल्ड चल रहा है - कोई OTA अपडेट लागू नहीं हुआ'
            : 'Running embedded build - no OTA update applied'
          : [
              `${language === 'hi' ? 'अपडेट' : 'Update'}: ${Updates.updateId || (language === 'hi' ? 'अनुपलब्ध' : 'unavailable')}`,
              `${language === 'hi' ? 'चैनल' : 'Channel'}: ${Updates.channel || (language === 'hi' ? 'अनुपलब्ध' : 'unavailable')}`,
              `${language === 'hi' ? 'प्रकाशित' : 'Published'}: ${
                Updates.createdAt ? Updates.createdAt.toLocaleString() : (language === 'hi' ? 'अनुपलब्ध' : 'unavailable')
              }`,
            ].join('\n');

        Alert.alert(
          t('profile.aboutUs'),
          `${Constants.expoConfig?.name || 'Bhav Bhakti'} v${Constants.expoConfig?.version || ''}\n\n${updateInfo}`
        );
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: contentPadding }}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h3" weight="bold">
            {t('profile.title')}
          </Text>
          {!isPremium && (
            <TouchableOpacity
              style={styles.premiumButton}
              onPress={() => setShowPaywall(true)}
            >
              <Ionicons name="star" size={16} color="#fff" />
              <Text variant="caption" style={styles.premiumText}>
                {t('home.upgradeToPremium')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#9ca3af" />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text variant="h4" weight="bold" align="center">
              {displayName || t('profile.defaultName')}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {user?.phoneNumber ? `${user.countryCode} ${user.phoneNumber}` : 'Phone User'}
            </Text>
          </View>

          {isPremium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text variant="body" weight="semibold" style={styles.premiumBadgeText}>
                {language === 'hi' ? 'प्रीमियम सदस्य' : 'Premium Member'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeCard}
              onPress={() => setShowPaywall(true)}
            >
              <View style={styles.upgradeIcon}>
                <Ionicons name="star" size={24} color="#fbbf24" />
              </View>
              <View style={styles.upgradeText}>
                <Text variant="body" weight="semibold">
                  {t('home.upgradeToPremium')}
                </Text>
                <Text variant="caption" color="secondary">
                  {language === 'hi' ? 'सभी सुविधाएँ और सामग्री अनलॉक करें' : 'Unlock all features and content'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            {t('profile.accountInfo')}
          </Text>
          <View style={styles.optionsList}>
            {accountOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={option.icon as any} size={20} color="#3b82f6" />
                </View>
                <View style={styles.optionContent}>
                  <Text variant="body" weight="medium">
                    {option.title}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {option.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            {t('profile.appSettings')}
          </Text>
          <View style={styles.optionsList}>
            {appOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={option.icon as any} size={20} color="#3b82f6" />
                </View>
                <View style={styles.optionContent}>
                  <Text variant="body" weight="medium">
                    {option.title}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {option.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title={t('profile.logout')}
            onPress={handleLogout}
            variant="outline"
            fullWidth
            icon={<Ionicons name="log-out-outline" size={18} color="#dc2626" />}
          />
        </View>

      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowLanguageModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={styles.modalTitle}>
              {t('profile.language')}
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          <View style={styles.languageList}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionSelected
                ]}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLanguageModal(false);
                  // Language will automatically update throughout the app due to Zustand store
                }}
              >
                <Text
                  variant="body"
                  weight={language === lang.code ? "semibold" : "medium"}
                  style={[
                    styles.languageOptionText,
                    language === lang.code && styles.languageOptionTextSelected
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  premiumText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.3)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
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
  profileInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 243, 199, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  premiumBadgeText: {
    color: '#92400e',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.3)',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  upgradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(254, 243, 199, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    flex: 1,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  optionsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.3)',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(219, 234, 254, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  logoutContainer: {
    marginHorizontal: 24,
    marginTop: 32,
  },
  // Language Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#1f2937',
  },
  modalSpacer: {
    width: 40,
  },
  languageList: {
    padding: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  languageOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  languageOptionTextSelected: {
    color: '#3b82f6',
  },
});
