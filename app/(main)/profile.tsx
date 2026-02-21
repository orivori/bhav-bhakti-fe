import React from 'react';
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/atoms';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { usePremiumStore } from '@/store/premiumStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t, language, toggleLanguage } = useTranslation();

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.confirmLogout'), [
      { text: t('profile.no'), style: 'cancel' },
      { text: t('profile.yes'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleImageUpload = () => {
    Alert.alert(t('profile.editProfile'), 'Choose an option', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: 'Take Photo', onPress: () => Alert.alert('Opening camera...') },
      { text: 'Choose from Gallery', onPress: () => Alert.alert('Opening gallery...') },
    ]);
  };

  const handleEditProfile = () => {
    Alert.alert(t('profile.editProfile'), 'This feature is coming soon!');
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
      title: t('profile.phoneNumber'),
      icon: 'call-outline',
      description: user?.phoneNumber ? `${user.countryCode} ${user.phoneNumber}` : (language === 'hi' ? 'सेट नहीं' : 'Not set'),
      onPress: () => Alert.alert(t('profile.phoneNumber'), language === 'hi' ? 'अपना फोन नंबर प्रबंधित करें' : 'Manage your phone number'),
    },
    {
      id: 3,
      title: language === 'hi' ? 'ईमेल पता' : 'Email Address',
      icon: 'mail-outline',
      description: language === 'hi' ? 'कनेक्ट नहीं है' : 'Not connected',
      onPress: () => Alert.alert(language === 'hi' ? 'ईमेल' : 'Email', language === 'hi' ? 'अपना ईमेल जोड़ें' : 'Add your email address'),
    },
  ];

  const appOptions = [
    {
      id: 1,
      title: t('profile.notifications'),
      icon: 'notifications-outline',
      description: language === 'hi' ? 'सूचना प्राथमिकताएं प्रबंधित करें' : 'Manage notification preferences',
      onPress: () => Alert.alert(t('profile.notifications'), language === 'hi' ? 'अपनी सूचनाएं कॉन्फ़िगर करें' : 'Configure your notifications'),
    },
    {
      id: 2,
      title: t('profile.privacy'),
      icon: 'shield-checkmark-outline',
      description: language === 'hi' ? 'अपनी गोपनीयता सेटिंग्स नियंत्रित करें' : 'Control your privacy settings',
      onPress: () => Alert.alert(t('profile.privacy'), language === 'hi' ? 'गोपनीयता सेटिंग्स प्रबंधित करें' : 'Manage privacy settings'),
    },
    {
      id: 3,
      title: t('profile.language'),
      icon: 'language-outline',
      description: language === 'en' ? 'English' : 'हिंदी',
      onPress: toggleLanguage,
    },
    {
      id: 4,
      title: language === 'hi' ? 'सहायता और सहयोग' : 'Help & Support',
      icon: 'help-circle-outline',
      description: language === 'hi' ? 'सहायता प्राप्त करें और संपर्क करें' : 'Get help and contact support',
      onPress: () => Alert.alert(language === 'hi' ? 'सहायता' : 'Support', language === 'hi' ? 'हमारी सहायता टीम से संपर्क करें' : 'Contact our support team'),
    },
    {
      id: 5,
      title: t('profile.aboutUs'),
      icon: 'information-circle-outline',
      description: language === 'hi' ? 'ऐप संस्करण 1.0.0' : 'App version 1.0.0',
      onPress: () => Alert.alert(t('profile.aboutUs'), 'Divine Wallpapers v1.0.0'),
    },
  ];

  const socialOptions = [
    {
      id: 1,
      title: 'Instagram',
      icon: 'logo-instagram',
      color: '#E4405F',
      onPress: () => Alert.alert('Instagram', 'Follow us on Instagram'),
    },
    {
      id: 2,
      title: 'Facebook',
      icon: 'logo-facebook',
      color: '#1877F2',
      onPress: () => Alert.alert('Facebook', 'Like us on Facebook'),
    },
    {
      id: 3,
      title: 'Twitter',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      onPress: () => Alert.alert('Twitter', 'Follow us on Twitter'),
    },
    {
      id: 4,
      title: 'YouTube',
      icon: 'logo-youtube',
      color: '#FF0000',
      onPress: () => Alert.alert('YouTube', 'Subscribe to our channel'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity style={styles.avatarContainer} onPress={handleImageUpload}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#9ca3af" />
            </View>
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text variant="h4" weight="bold" align="center">
              User Name
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

        {/* Social Media Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            {t('profile.followUs')}
          </Text>
          <View style={styles.socialGrid}>
            {socialOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.socialButton}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={option.icon as any} size={32} color={option.color} />
                <Text variant="caption" weight="medium" style={styles.socialLabel}>
                  {option.title}
                </Text>
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

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#fef3c7',
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
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  upgradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  socialButton: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialLabel: {
    marginTop: 8,
  },
  logoutContainer: {
    marginHorizontal: 24,
    marginTop: 32,
  },
  bottomSpacing: {
    height: 24,
  },
});
