import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet, Modal, Image, Platform, ActionSheetIOS, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button, Text } from '@/components/atoms';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { router } from 'expo-router';
import { usePremiumStore } from '@/store/premiumStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useOnboardingStore } from '@/shared/stores/onboardingStore';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { profile, uploadPhoto, isUploadingPhoto, updateProfile, isLoading, error } = useProfile();
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t, language } = useTranslation();
  const { setLanguage, getLanguageLabel } = useI18nStore();
  const { contentPadding } = useTabBarHeight();
  const { resetOnboarding } = useOnboardingStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [isEditingDOB, setIsEditingDOB] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEditingZodiac, setIsEditingZodiac] = useState(false);
  const [selectedWesternZodiac, setSelectedWesternZodiac] = useState('');
  const [selectedVedicRashi, setSelectedVedicRashi] = useState('');

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 Profile Screen State:', {
      hasUser: !!user,
      hasProfile: !!profile,
      isLoading,
      error: error ? error.toString() : null,
      profileName: profile?.name,
      profilePicture: profile?.profilePicture,
      zodiacSign: profile?.profile?.zodiacSign
    });
  }, [user, profile, isLoading, error]);

  const languages = [
    { code: 'hi', name: 'हिंदी' },
    { code: 'en', name: 'English' },
  ];

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.confirmLogout'), [
      { text: t('profile.no'), style: 'cancel' },
      { text: t('profile.yes'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleImageUpload = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await openCamera();
          } else if (buttonIndex === 2) {
            await openGallery();
          }
        }
      );
    } else {
      Alert.alert(
        language === 'hi' ? 'प्रोफ़ाइल फ़ोटो' : 'Profile Photo',
        language === 'hi' ? 'एक विकल्प चुनें' : 'Choose an option',
        [
          { text: language === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
          { text: language === 'hi' ? 'फ़ोटो लें' : 'Take Photo', onPress: openCamera },
          { text: language === 'hi' ? 'गैलरी से चुनें' : 'Choose from Gallery', onPress: openGallery },
        ]
      );
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
          language === 'hi' ? 'कैमरा एक्सेस की अनुमति आवश्यक है' : 'Camera access permission is required'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto({
          uri: result.assets[0].uri,
          type: result.assets[0].type || 'image/jpeg',
          name: result.assets[0].fileName || `profile-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
          language === 'hi' ? 'फ़ोटो लाइब्रेरी एक्सेस की अनुमति आवश्यक है' : 'Photo library access permission is required'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto({
          uri: result.assets[0].uri,
          type: result.assets[0].type || 'image/jpeg',
          name: result.assets[0].fileName || `profile-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };


  const handleNameEdit = () => {
    setTempName(profile?.name || user?.name || '');
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    if (tempName.trim()) {
      try {
        await updateProfile({ name: tempName.trim() });
        setIsEditingName(false);
      } catch (error) {
        console.error('Failed to update name:', error);
        Alert.alert('Error', 'Failed to update name');
      }
    } else {
      handleNameCancel();
    }
  };

  const handleNameCancel = () => {
    setTempName('');
    setIsEditingName(false);
  };

  // Email editing handlers
  const handleEmailEdit = () => {
    setTempEmail(profile?.email || '');
    setIsEditingEmail(true);
  };

  const handleEmailSave = async () => {
    if (tempEmail.trim()) {
      // Basic email validation
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(tempEmail.trim())) {
        Alert.alert(
          language === 'hi' ? 'गलत ईमेल' : 'Invalid Email',
          language === 'hi' ? 'कृपया एक वैध ईमेल पता दर्ज करें' : 'Please enter a valid email address'
        );
        return;
      }

      try {
        console.log('🔄 Updating email:', tempEmail.trim());
        await updateProfile({ email: tempEmail.trim() });
        setIsEditingEmail(false);
        setTempEmail('');
      } catch (error) {
        console.error('Failed to update email:', error);
        Alert.alert(
          language === 'hi' ? 'त्रुटि' : 'Error',
          language === 'hi' ? 'ईमेल अपडेट नहीं हो सका' : 'Failed to update email'
        );
      }
    } else {
      handleEmailCancel();
    }
  };

  const handleEmailCancel = () => {
    setTempEmail('');
    setIsEditingEmail(false);
  };

  // Date of Birth editing handlers
  const handleDOBEdit = () => {
    if (profile?.profile?.dateOfBirth) {
      setSelectedDate(new Date(profile.profile.dateOfBirth));
    }
    setIsEditingDOB(true);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const handleDOBSave = async () => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      console.log('🔄 Updating date of birth:', dateString);
      await updateProfile({
        dateOfBirth: dateString,
        timezone: 'Asia/Kolkata'
      });
      setIsEditingDOB(false);
      setShowDatePicker(false);
    } catch (error) {
      console.error('Failed to update date of birth:', error);
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'जन्म तिथि अपडेट नहीं हो सकी' : 'Failed to update date of birth'
      );
    }
  };

  const handleDOBCancel = () => {
    setIsEditingDOB(false);
    setShowDatePicker(false);
  };

  // Zodiac editing handlers
  const handleZodiacEdit = () => {
    if (profile?.profile?.zodiacSign) {
      setSelectedWesternZodiac(profile.profile.zodiacSign);
    }
    if (profile?.profile?.rashi) {
      setSelectedVedicRashi(profile.profile.rashi);
    }
    setIsEditingZodiac(true);
  };

  const handleZodiacSave = async () => {
    try {
      const updateData: any = {};
      if (selectedWesternZodiac) updateData.zodiacSign = selectedWesternZodiac;
      if (selectedVedicRashi) updateData.rashi = selectedVedicRashi;

      console.log('🔄 Updating zodiac signs:', updateData);
      await updateProfile(updateData);
      setIsEditingZodiac(false);
    } catch (error) {
      console.error('Failed to update zodiac signs:', error);
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'राशि चिह्न अपडेट नहीं हो सके' : 'Failed to update zodiac signs'
      );
    }
  };

  const handleZodiacCancel = () => {
    setIsEditingZodiac(false);
    setSelectedWesternZodiac('');
    setSelectedVedicRashi('');
  };

  // Zodiac sign options
  const westernZodiacSigns = [
    { value: 'aries', label: language === 'hi' ? 'मेष राशि' : 'Aries' },
    { value: 'taurus', label: language === 'hi' ? 'वृषभ राशि' : 'Taurus' },
    { value: 'gemini', label: language === 'hi' ? 'मिथुन राशि' : 'Gemini' },
    { value: 'cancer', label: language === 'hi' ? 'कर्क राशि' : 'Cancer' },
    { value: 'leo', label: language === 'hi' ? 'सिंह राशि' : 'Leo' },
    { value: 'virgo', label: language === 'hi' ? 'कन्या राशि' : 'Virgo' },
    { value: 'libra', label: language === 'hi' ? 'तुला राशि' : 'Libra' },
    { value: 'scorpio', label: language === 'hi' ? 'वृश्चिक राशि' : 'Scorpio' },
    { value: 'sagittarius', label: language === 'hi' ? 'धनु राशि' : 'Sagittarius' },
    { value: 'capricorn', label: language === 'hi' ? 'मकर राशि' : 'Capricorn' },
    { value: 'aquarius', label: language === 'hi' ? 'कुम्भ राशि' : 'Aquarius' },
    { value: 'pisces', label: language === 'hi' ? 'मीन राशि' : 'Pisces' },
  ];

  const vedicRashiSigns = [
    { value: 'मेष', label: 'मेष (Mesha)' },
    { value: 'वृषभ', label: 'वृषभ (Vrishabha)' },
    { value: 'मिथुन', label: 'मिथुन (Mithuna)' },
    { value: 'कर्क', label: 'कर्क (Karka)' },
    { value: 'सिंह', label: 'सिंह (Simha)' },
    { value: 'कन्या', label: 'कन्या (Kanya)' },
    { value: 'तुला', label: 'तुला (Tula)' },
    { value: 'वृश्चिक', label: 'वृश्चिक (Vrishchika)' },
    { value: 'धनु', label: 'धनु (Dhanu)' },
    { value: 'मकर', label: 'मकर (Makara)' },
    { value: 'कुम्भ', label: 'कुम्भ (Kumbha)' },
    { value: 'मीन', label: 'मीन (Meena)' },
  ];

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the app to show language selection on next launch. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetOnboarding();
            Alert.alert('Success', 'Onboarding has been reset. Restart the app to see the language selection screen.');
          },
        },
      ]
    );
  };

  const accountOptions = [
    {
      id: 2,
      title: t('profile.phoneNumber'),
      icon: 'call-outline',
      description: user?.phoneNumber ? `${user.countryCode} ${user.phoneNumber}` : (language === 'hi' ? 'सेट नहीं' : 'Not set'),
      onPress: () => Alert.alert(
        t('profile.phoneNumber'),
        language === 'hi' ? 'फोन नंबर संपादित नहीं किया जा सकता' : 'Phone number cannot be edited'
      ),
      isEditable: false,
    },
    {
      id: 3,
      title: language === 'hi' ? 'ईमेल पता' : 'Email Address',
      icon: 'mail-outline',
      description: profile?.email || (language === 'hi' ? 'ईमेल जोड़ने के लिए टैप करें' : 'Tap to add email'),
      onPress: handleEmailEdit,
      isEditable: true,
    },
    {
      id: 4,
      title: language === 'hi' ? 'जन्म तिथि' : 'Date of Birth',
      icon: 'calendar-outline',
      description: profile?.profile?.dateOfBirth
        ? new Date(profile.profile.dateOfBirth).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')
        : (language === 'hi' ? 'तारीख चुनने के लिए टैप करें' : 'Tap to select date'),
      onPress: handleDOBEdit,
      isEditable: true,
    },
    {
      id: 5,
      title: language === 'hi' ? 'राशि चिह्न' : 'Zodiac Signs',
      icon: 'star-outline',
      description: profile?.profile?.zodiac
        ? (language === 'hi'
            ? `${profile.profile.zodiac.western.hi || ''} • ${profile.profile.zodiac.vedic.hi || ''}`
            : `${profile.profile.zodiac.western.en || ''} • ${profile.profile.zodiac.vedic.en || ''}`
          )
        : (language === 'hi' ? 'राशि चिह्न चुनने के लिए टैप करें' : 'Tap to select zodiac signs'),
      onPress: handleZodiacEdit,
      isEditable: true,
    },
  ];

  const appOptions = [
    {
      id: 1,
      title: t('profile.notifications'),
      icon: 'notifications-outline',
      description: language === 'hi' ? 'सूचना प्राथमिकताएं प्रबंधित करें' : 'Manage notification preferences',
      onPress: () => Alert.alert(t('profile.notifications'), language === 'hi' ? 'अपनी सूचनाएं कॉन्फ़िगर करें' : 'Configure your notifications'),
      onLongPress: undefined,
    },
    {
      id: 2,
      title: t('profile.privacy'),
      icon: 'shield-checkmark-outline',
      description: language === 'hi' ? 'अपनी गोपनीयता सेटिंग्स नियंत्रित करें' : 'Control your privacy settings',
      onPress: () => Alert.alert(t('profile.privacy'), language === 'hi' ? 'गोपनीयता सेटिंग्स प्रबंधित करें' : 'Manage privacy settings'),
      onLongPress: undefined,
    },
    {
      id: 3,
      title: t('profile.language'),
      icon: 'language-outline',
      description: getLanguageLabel(language),
      onPress: () => setShowLanguageModal(true),
      onLongPress: undefined,
    },
    {
      id: 4,
      title: language === 'hi' ? 'सहायता और सहयोग' : 'Help & Support',
      icon: 'help-circle-outline',
      description: language === 'hi' ? 'सहायता प्राप्त करें और संपर्क करें' : 'Get help and contact support',
      onPress: () => Alert.alert(language === 'hi' ? 'सहायता' : 'Support', language === 'hi' ? 'हमारी सहायता टीम से संपर्क करें' : 'Contact our support team'),
      onLongPress: undefined,
    },
    {
      id: 5,
      title: t('profile.aboutUs'),
      icon: 'information-circle-outline',
      description: language === 'hi' ? 'ऐप संस्करण 1.0.0' : 'App version 1.0.0',
      onPress: () => Alert.alert(t('profile.aboutUs'), 'Divine Wallpapers v1.0.0'),
      onLongPress: handleResetOnboarding,
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
          <TouchableOpacity style={styles.avatarContainer} onPress={handleImageUpload} disabled={isUploadingPhoto}>
            <View style={styles.avatar}>
              {profile?.profilePicture ? (
                <Image
                  source={{ uri: profile.profilePicture }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={48} color="#9ca3af" />
              )}
              {isUploadingPhoto && (
                <View style={styles.avatarLoading}>
                  <Text variant="caption" style={{ color: '#fff' }}>...</Text>
                </View>
              )}
            </View>
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            {isEditingName ? (
              <View style={styles.nameEditContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={tempName}
                  onChangeText={setTempName}
                  placeholder={language === 'hi' ? 'अपना नाम दर्ज करें' : 'Enter your name'}
                  placeholderTextColor="#9ca3af"
                  textAlign="center"
                  autoFocus
                  onBlur={() => handleNameSave()}
                  onSubmitEditing={handleNameSave}
                />
                <View style={styles.nameEditButtons}>
                  <TouchableOpacity onPress={handleNameSave} style={styles.saveButton}>
                    <Ionicons name="checkmark" size={20} color="#4ade80" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNameCancel} style={styles.cancelButton}>
                    <Ionicons name="close" size={20} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={handleNameEdit} style={styles.nameContainer}>
                <Text variant="h4" weight="bold" align="center">
                  {profile?.name || user?.name || (language === 'hi' ? 'उपयोगकर्ता' : 'User')}
                </Text>
                <Ionicons name="pencil" size={16} color="#9ca3af" style={styles.editIcon} />
              </TouchableOpacity>
            )}
            <Text variant="body" color="secondary" align="center">
              {user?.phoneNumber ? `${user.countryCode} ${user.phoneNumber}` : (language === 'hi' ? 'फोन उपयोगकर्ता' : 'Phone User')}
            </Text>

            {/* Date of Birth Display */}
            {profile?.profile?.dateOfBirth && (
              <Text variant="caption" color="secondary" align="center" style={{ marginTop: 4 }}>
                {language === 'hi' ? 'जन्म तिथि: ' : 'DOB: '}
                {new Date(profile.profile.dateOfBirth).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}
              </Text>
            )}

            {/* Zodiac Sign Display */}
            {profile?.profile?.zodiac && (
              <View style={styles.zodiacDisplay}>
                {profile.profile.zodiac.western.en && (
                  <Text variant="caption" color="secondary" align="center" style={{ marginTop: 4 }}>
                    {language === 'hi' ? 'पश्चिमी राशि: ' : 'Western: '}
                    {language === 'hi' ? profile.profile.zodiac.western.hi : profile.profile.zodiac.western.en}
                  </Text>
                )}
                {profile.profile.zodiac.vedic.hi && (
                  <Text variant="caption" color="secondary" align="center" style={{ marginTop: 4 }}>
                    {language === 'hi' ? 'वैदिक राशि: ' : 'Vedic: '}
                    {language === 'hi' ? profile.profile.zodiac.vedic.hi : profile.profile.zodiac.vedic.en}
                  </Text>
                )}
              </View>
            )}
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
                style={[
                  styles.optionItem,
                  !option.isEditable && styles.optionItemDisabled
                ]}
                onPress={option.onPress}
                activeOpacity={option.isEditable ? 0.7 : 0.5}
              >
                <View style={[
                  styles.optionIcon,
                  !option.isEditable && styles.optionIconDisabled
                ]}>
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={option.isEditable ? "#3b82f6" : "#9ca3af"}
                  />
                </View>
                <View style={styles.optionContent}>
                  <View style={styles.optionTitleRow}>
                    <Text variant="body" weight="medium" style={[
                      !option.isEditable && styles.disabledText
                    ]}>
                      {option.title}
                    </Text>
                    {!option.isEditable && (
                      <View style={styles.lockIcon}>
                        <Ionicons name="lock-closed" size={12} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <Text variant="caption" color="secondary">
                    {option.description}
                  </Text>
                </View>
                <Ionicons
                  name={option.isEditable ? "create-outline" : "information-circle-outline"}
                  size={20}
                  color={option.isEditable ? "#3b82f6" : "#9ca3af"}
                />
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
                onLongPress={option.onLongPress}
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
                  setLanguage(lang.code as any);
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

      {/* Email Edit Modal */}
      <Modal
        visible={isEditingEmail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleEmailCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleEmailCancel}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={styles.modalTitle}>
              {language === 'hi' ? 'ईमेल संपादित करें' : 'Edit Email'}
            </Text>
            <TouchableOpacity
              onPress={handleEmailSave}
              style={styles.modalSaveButton}
            >
              <Text variant="body" weight="semibold" style={styles.modalSaveText}>
                {language === 'hi' ? 'सहेजें' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text variant="body" weight="medium" style={styles.fieldLabel}>
              {language === 'hi' ? 'ईमेल पता' : 'Email Address'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={language === 'hi' ? 'आपका ईमेल पता' : 'Your email address'}
              value={tempEmail}
              onChangeText={setTempEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <Text variant="caption" color="secondary" style={styles.fieldHint}>
              {language === 'hi' ? 'यह आपके खाते की रिकवरी के लिए उपयोग किया जाएगा' : 'This will be used for account recovery'}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Date of Birth Edit Modal */}
      <Modal
        visible={isEditingDOB}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDOBCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleDOBCancel}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={styles.modalTitle}>
              {language === 'hi' ? 'जन्म तिथि संपादित करें' : 'Edit Date of Birth'}
            </Text>
            <TouchableOpacity
              onPress={handleDOBSave}
              style={styles.modalSaveButton}
            >
              <Text variant="body" weight="semibold" style={styles.modalSaveText}>
                {language === 'hi' ? 'सहेजें' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text variant="body" weight="medium" style={styles.fieldLabel}>
              {language === 'hi' ? 'जन्म तिथि चुनें' : 'Select Date of Birth'}
            </Text>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                style={styles.datePicker}
              />
            )}

            <TouchableOpacity
              style={styles.dateDisplayButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
              <Text variant="body" style={styles.dateDisplayText}>
                {selectedDate.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}
              </Text>
            </TouchableOpacity>

            <Text variant="caption" color="secondary" style={styles.fieldHint}>
              {language === 'hi' ? 'आपकी राशि स्वतः गणना की जाएगी' : 'Your zodiac sign will be automatically calculated'}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Zodiac Signs Edit Modal */}
      <Modal
        visible={isEditingZodiac}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleZodiacCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleZodiacCancel}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={styles.modalTitle}>
              {language === 'hi' ? 'राशि चिह्न संपादित करें' : 'Edit Zodiac Signs'}
            </Text>
            <TouchableOpacity
              onPress={handleZodiacSave}
              style={styles.modalSaveButton}
            >
              <Text variant="body" weight="semibold" style={styles.modalSaveText}>
                {language === 'hi' ? 'सहेजें' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Western Zodiac Section */}
            <Text variant="body" weight="medium" style={styles.fieldLabel}>
              {language === 'hi' ? 'पश्चिमी राशि चुनें' : 'Select Western Zodiac'}
            </Text>
            <View style={styles.zodiacGrid}>
              {westernZodiacSigns.map((zodiac) => (
                <TouchableOpacity
                  key={zodiac.value}
                  style={[
                    styles.zodiacOption,
                    selectedWesternZodiac === zodiac.value && styles.zodiacOptionSelected
                  ]}
                  onPress={() => setSelectedWesternZodiac(zodiac.value)}
                >
                  <Text
                    variant="body"
                    weight={selectedWesternZodiac === zodiac.value ? "semibold" : "medium"}
                    style={[
                      styles.zodiacOptionText,
                      selectedWesternZodiac === zodiac.value && styles.zodiacOptionTextSelected
                    ]}
                  >
                    {zodiac.label}
                  </Text>
                  {selectedWesternZodiac === zodiac.value && (
                    <Ionicons name="checkmark" size={18} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Vedic Rashi Section */}
            <Text variant="body" weight="medium" style={[styles.fieldLabel, { marginTop: 32 }]}>
              {language === 'hi' ? 'वैदिक राशि चुनें' : 'Select Vedic Rashi'}
            </Text>
            <View style={styles.zodiacGrid}>
              {vedicRashiSigns.map((rashi) => (
                <TouchableOpacity
                  key={rashi.value}
                  style={[
                    styles.zodiacOption,
                    selectedVedicRashi === rashi.value && styles.zodiacOptionSelected
                  ]}
                  onPress={() => setSelectedVedicRashi(rashi.value)}
                >
                  <Text
                    variant="body"
                    weight={selectedVedicRashi === rashi.value ? "semibold" : "medium"}
                    style={[
                      styles.zodiacOptionText,
                      selectedVedicRashi === rashi.value && styles.zodiacOptionTextSelected
                    ]}
                  >
                    {rashi.label}
                  </Text>
                  {selectedVedicRashi === rashi.value && (
                    <Ionicons name="checkmark" size={18} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text variant="caption" color="secondary" style={styles.fieldHint}>
              {language === 'hi'
                ? 'आप अपनी राशि चिह्न मैन्युअल रूप से चुन सकते हैं या जन्म तिथि से स्वतः गणना कर सकते हैं'
                : 'You can manually select your zodiac signs or auto-calculate from date of birth'
              }
            </Text>
          </ScrollView>
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editIcon: {
    marginLeft: 8,
  },
  nameEditContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 200,
    marginBottom: 8,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fecaca',
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
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  socialButton: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.3)',
  },
  socialLabel: {
    marginTop: 8,
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
  // New styles for editing functionality
  optionItemDisabled: {
    opacity: 0.6,
  },
  optionIconDisabled: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockIcon: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledText: {
    color: '#9ca3af',
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#fff',
  },
  modalContent: {
    padding: 24,
  },
  fieldLabel: {
    marginBottom: 12,
    color: '#374151',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  fieldHint: {
    marginTop: 8,
  },
  datePicker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 16,
  },
  dateDisplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  dateDisplayText: {
    fontSize: 16,
    color: '#111827',
  },
  zodiacDisplay: {
    alignItems: 'center',
  },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  zodiacOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: '47%',
    flex: 1,
  },
  zodiacOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  zodiacOptionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  zodiacOptionTextSelected: {
    color: '#3b82f6',
  },
});
