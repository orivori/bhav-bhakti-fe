import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
// Removed zod dependency for smaller bundle size
import { validatePhoneNumber } from '@/shared/utils/phoneValidation';

import { Button, Text } from '@/components/atoms';
import { PhoneInput } from '@/components/molecules';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/atoms/Toast';
import { PhoneStorageService } from '@/utils/phoneStorage';
import { useLocalSearchParams } from 'expo-router';

// Form data type
type PhoneFormData = {
  phoneNumber: string;
};

export default function PhoneLoginScreen() {
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ phoneNumber?: string; countryCode?: string }>();
  const [selectedCountry, setSelectedCountry] = useState({
    code: 'IND',
    callingCode: '+91',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { sendOTP } = useAuth();

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

  // Initialize form with pre-filled data or saved data
  React.useEffect(() => {
    const initializePhoneData = async () => {
      let initialPhoneData = null;
      
      // First check if data came from back navigation
      if (params.phoneNumber && params.countryCode) {
        initialPhoneData = {
          phoneNumber: params.phoneNumber,
          countryCode: params.countryCode
        };
      } else {
        // Check saved phone data
        initialPhoneData = await PhoneStorageService.getLastPhoneNumber();
      }
      
      if (initialPhoneData) {
        setValue('phoneNumber', initialPhoneData.phoneNumber);
        setSelectedCountry({
          code: initialPhoneData.countryCode === '+91'? 'IND' : 'USA',
          callingCode: initialPhoneData.countryCode
        });
      }
    };
    
    initializePhoneData();
  }, [params.phoneNumber, params.countryCode]);

  const validatePhoneWithCountry = (phone: string) => {
    if (!phone) return false;
    try {
      return validatePhoneNumber(phone, selectedCountry.callingCode);
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

      const response = await sendOTP({
        phoneNumber: data.phoneNumber,
        countryCode: selectedCountry.callingCode,
      });

      if (response.success) {
        // Save phone number for back navigation
        await PhoneStorageService.savePhoneNumber(data.phoneNumber, selectedCountry.callingCode);
        
        // Show success toast
        showToast({
          type: 'success',
          message: 'Verification Code Sent',
          duration: 2000
        });
        // Navigate to OTP verification screen with phone data
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            phoneNumber: data.phoneNumber,
            countryCode: selectedCountry.callingCode,
            ...(response.sessionId && { sessionId: response.sessionId }),
            orderId: response.orderId,
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Image
                  source={{ uri: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/bhavbhaktiv1.webp' }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text variant="h2" weight="bold" align="center" style={styles.title}>
                Bhav bhakti
              </Text>
              <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
                Enter your phone number to receive a verification code
              </Text>
            </View>

            {/* Form */}
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
                    onCountryChange={setSelectedCountry}
                    selectedCountry={selectedCountry}
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
                disabled={!phoneNumber || isLoading}
                fullWidth
                style={styles.button}
              />

              {/* Terms and Privacy */}
              <Text variant="caption" color="secondary" align="center" style={styles.terms}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>

            {/* Development Note */}
            {__DEV__ && (
              <View style={styles.devNote}>
                <Text variant="caption" weight="medium" style={styles.devNoteTitle}>
                  Development Mode
                </Text>
                <Text variant="caption" style={styles.devNoteText}>
                  Use OTP: 123456 for testing
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    marginBottom: 12,
    color: '#D4824A',
  },
  subtitle: {
    paddingHorizontal: 16,
  },
  form: {
    flex: 1,
  },
  phoneInput: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 24,
  },
  terms: {
    paddingHorizontal: 16,
  },
  devNote: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
  },
  devNoteTitle: {
    color: '#92400e',
    marginBottom: 4,
  },
  devNoteText: {
    color: '#b45309',
  },
});
