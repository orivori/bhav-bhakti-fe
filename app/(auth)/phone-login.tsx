import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

import { Button, Text } from '@/components/atoms';
import { PhoneInput } from '@/components/molecules';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

// Form validation schema
const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (phone) => {
        if (!phone) return false;
        try {
          // We'll validate with the selected country code later
          return phone.length >= 6; // Basic length check
        } catch {
          return false;
        }
      },
      { message: 'Please enter a valid phone number' }
    ),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

export default function PhoneLoginScreen() {
  const [selectedCountry, setSelectedCountry] = useState({
    code: 'IND',
    callingCode: '+91',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { sendOTP } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const phoneNumber = watch('phoneNumber');

  const validatePhoneWithCountry = (phone: string) => {
    if (!phone) return false;
    try {
      const fullNumber = `${selectedCountry.callingCode}${phone}`;
      return isValidPhoneNumber(fullNumber);
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: PhoneFormData) => {
    // Validate phone number with selected country
    if (!validatePhoneWithCountry(data.phoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number for the selected country.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await sendOTP({
        phoneNumber: data.phoneNumber,
        countryCode: selectedCountry.callingCode,
      });
      console.log(response);

      if (response.success) {
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
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send OTP. Please try again.'
      );
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
                <Text style={styles.icon}>📱</Text>
              </View>
              <Text variant="h2" weight="bold" align="center" style={styles.title}>
                Welcome Back
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
    width: 80,
    height: 80,
    backgroundColor: '#dbeafe',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    marginBottom: 12,
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
