import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
// Removed zod dependency for smaller bundle size
import { validatePhoneNumber } from '@/shared/utils/phoneValidation';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Button, Text } from '@/components/atoms';
import { PhoneInput } from '@/components/molecules';
import { LegalDocumentSheet } from '@/components/molecules/LegalDocumentViewer';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/atoms/Toast';
import { PhoneStorageService } from '@/utils/phoneStorage';
import { useLocalSearchParams } from 'expo-router';
import type { LegalDocType } from '@/shared/config/legalDocuments';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { logLoginStarted } from '@/utils/analytics/activationEvents';

// Form data type
type PhoneFormData = {
  phoneNumber: string;
};

// India-only for now - no country picker (see PhoneInput.tsx, same constant).
const COUNTRY_CODE = '+91';

export default function PhoneLoginScreen() {
  const { showToast } = useToast();
  // returnTo/returnParams: present only when this screen was reached via
  // LoginPromptModal (a stale-session re-auth), not on a normal fresh login -
  // forwarded through to verify-otp.tsx unchanged, same convention already
  // used elsewhere in this app (see audio-player.tsx/legal-document.tsx).
  const params = useLocalSearchParams<{ phoneNumber?: string; returnTo?: string; returnParams?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalDocType | null>(null);
  const legalSheetRef = useRef<BottomSheetModal>(null);

  const { sendOTP } = useAuth();

  const openLegalDocument = (docType: LegalDocType) => {
    setLegalDocType(docType);
    legalSheetRef.current?.present();
  };

  // Form setup - moved before useEffect that uses setValue
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PhoneFormData>({
    defaultValues: {
      phoneNumber: '',
    },
  });

  const phoneNumber = watch('phoneNumber');

  // Pre-fill the phone number field - from back-navigation params if present,
  // otherwise from the last number saved to device storage. Country is no
  // longer part of this (see COUNTRY_CODE above), only the number itself.
  React.useEffect(() => {
    const initializePhoneData = async () => {
      if (params.phoneNumber) {
        setValue('phoneNumber', params.phoneNumber);
        return;
      }

      const savedPhoneData = await PhoneStorageService.getLastPhoneNumber();
      if (savedPhoneData) {
        setValue('phoneNumber', savedPhoneData.phoneNumber);
      }
    };

    initializePhoneData();
  }, [params.phoneNumber]);

  const validatePhoneWithCountry = (phone: string) => {
    if (!phone) return false;
    try {
      return validatePhoneNumber(phone, COUNTRY_CODE);
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: PhoneFormData) => {
    // Validate phone number with selected country
    if (!validatePhoneWithCountry(data.phoneNumber)) {
      showToast({ type: 'error', message: 'Please enter a valid phone number for the selected country.' });
      return;
    }

    try {
      setIsLoading(true);
      logLoginStarted();

      const response = await sendOTP({
        phoneNumber: data.phoneNumber,
        countryCode: COUNTRY_CODE,
      });
      console.log(response);

      if (response.success) {
        // Save phone number for back navigation
        await PhoneStorageService.savePhoneNumber(data.phoneNumber, COUNTRY_CODE);

        // Show success toast
        showToast({
          type: 'success',
          message: 'Verification Code Sent',
          duration: 2000
        });
        // Dismiss the keyboard before navigating - otherwise it's still
        // open (or mid-close) while verify-otp's auto-focused OTP box pops
        // it back open, racing the slide transition and making it jittery.
        Keyboard.dismiss();
        // Navigate to OTP verification screen with phone data
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            phoneNumber: data.phoneNumber,
            countryCode: COUNTRY_CODE,
            ...(response.sessionId && { sessionId: response.sessionId }),
            orderId: response.orderId,
            ...(params.returnTo && { returnTo: params.returnTo }),
            ...(params.returnParams && { returnParams: params.returnParams }),
          },
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to send OTP. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Content block - logo, title, subtitle, form, terms - centered together as one group */}
            <View style={styles.contentBlock}>
              <View style={styles.header}>
                {/* Logo sits a line space above the title, not pinned to a fixed top position */}
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/images/splash-icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <Text variant="h2" weight="bold" align="center" style={styles.title}>
                  Welcome Back
                </Text>
                <Text variant="h5" color="secondary" align="center" style={styles.subtitle}>
                  Enter your phone number to receive a verification code
                </Text>
              </View>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="phoneNumber"
                  rules={{
                    required: 'Phone number is required',
                    minLength: {
                      value: 6,
                      message: 'Phone number must be at least 6 digits'
                    },
                    validate: (value) => {
                      if (!value) return 'Phone number is required';
                      return value.length >= 6 || 'Please enter a valid phone number';
                    }
                  }}
                  render={({ field: { onChange, value } }) => (
                    <PhoneInput
                      label="Phone Number"
                      placeholder="Enter your phone number"
                      value={value}
                      onChangeText={onChange}
                      error={errors.phoneNumber?.message}
                      disabled={isLoading}
                      style={styles.phoneInput}
                    />
                  )}
                />

                <Button
                  title="Send Verification Code"
                  onPress={handleSubmit(onSubmit)}
                  loading={isLoading}
                  disabled={!validatePhoneWithCountry(phoneNumber) || isLoading}
                  fullWidth
                  style={styles.button}
                />

                {/* Terms and Privacy - both segments are real tappable links,
                    opened as a bottom sheet (not full-screen) per the login
                    screen's lighter-weight disclaimer context. */}
                <Text variant="caption" color="secondary" align="center" style={styles.terms}>
                  By continuing, you agree to our{' '}
                  <Text
                    variant="caption"
                    style={styles.termsLink}
                    onPress={() => openLegalDocument('terms')}
                  >
                    Terms and Conditions
                  </Text>{' '}
                  and{' '}
                  <Text
                    variant="caption"
                    style={styles.termsLink}
                    onPress={() => openLegalDocument('privacy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LegalDocumentSheet ref={legalSheetRef} docType={legalDocType} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16, // roughly a line space above the title
  },
  logo: {
    width: 120,
    height: 120,
  },
  contentBlock: {
    flex: 1,
    justifyContent: 'center',
    // Shifted up ~2 line-spaces from dead-center via transform (not padding -
    // padding would only move the visual center by half its own value here,
    // since justifyContent:'center' splits it evenly above/below; transform
    // applies the exact offset directly, after centering is computed).
    transform: [{ translateY: -40 }],
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    marginBottom: 12,
  },
  subtitle: {
    paddingHorizontal: 16,
  },
  form: {},
  phoneInput: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 24,
  },
  terms: {
    paddingHorizontal: 16,
  },
  termsLink: {
    color: goldenTempleTheme.colors.info,
    textDecorationLine: 'underline',
  },
});
