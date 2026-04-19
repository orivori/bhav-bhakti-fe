import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Text } from '@/components/atoms';
import { OTPInput } from '@/components/molecules';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/atoms/Toast';
import { PhoneStorageService } from '@/utils/phoneStorage';
import { SMSDetectionService } from '@/utils/smsDetection';

export default function VerifyOTPScreen() {
  const { phoneNumber, countryCode, sessionId, orderId } = useLocalSearchParams<{
    phoneNumber: string;
    countryCode: string;
    sessionId?: string;
    orderId: string;
  }>();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { verifyOTP, sendOTP } = useAuth();
  const { showToast } = useToast();

  // Show initial OTP sent toast when screen loads
  useEffect(() => {
    showToast({
      type: 'success',
      message: 'Verification Code Sent',
      duration: 2000
    });
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer, canResend]);

  // SMS Auto-detection
  useEffect(() => {
    let smsCleanup: (() => void) | null = null;
    
    const setupSMSDetection = async () => {
      const isAvailable = await SMSDetectionService.checkSMSAvailability();
      if (isAvailable) {
        smsCleanup = await SMSDetectionService.startSMSListener((detectedOTP) => {
          if (detectedOTP && detectedOTP.length === 6) {
            setOtp(detectedOTP);
            showToast({
              type: 'success',
              message: 'OTP auto-detected from SMS',
              duration: 2000
            });
          }
        });
      }
    };
    
    setupSMSDetection();
    
    return () => {
      if (smsCleanup) {
        smsCleanup();
      }
    };
  }, []);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOTP();
    }
  }, [otp]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      showToast({ type: 'error', message: 'Please enter a 6-digit verification code.' });
      return;
    }

    try {
      setIsLoading(true);

      await verifyOTP({
        phoneNumber: phoneNumber!,
        countryCode: countryCode!,
        otp,
        ...(sessionId && { sessionId }),
        orderId: orderId!,
      });

      // Navigation will be handled by the root layout based on auth state
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: error instanceof Error ? error.message : 'Invalid verification code. Please try again.'
      });
      setOtp(''); // Clear OTP on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsResending(true);

      const response = await sendOTP({
        phoneNumber: phoneNumber!,
        countryCode: countryCode!,
      });

      if (response.success) {
        showToast({ type: 'success', message: 'Verification Code Sent', duration: 2000 });
        setCanResend(false);
        setResendTimer(60);
        setOtp(''); // Clear current OTP
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to resend OTP. Please try again.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    // Navigate back to phone login with pre-filled data
    router.push({ pathname: '/(auth)/phone-login', params: { phoneNumber, countryCode } });
  };

  const formatPhoneNumber = () => {
    return `${countryCode} ${phoneNumber}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header with Back Button */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                disabled={isLoading}
              >
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text variant="h4" weight="semibold" style={styles.headerTitle}>
                Verify Phone Number
              </Text>
            </View>

            {/* Verification Icon and Info */}
            <View style={styles.infoContainer}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📨</Text>
              </View>

              <Text variant="body" color="secondary" align="center" style={styles.infoText}>
                We've sent a 6-digit code to
              </Text>
              <Text variant="body" weight="semibold" align="center" style={styles.phoneNumber}>
                {formatPhoneNumber()}
              </Text>
              <Text variant="caption" color="secondary" align="center">
                Please enter the code to continue
              </Text>

              {/* Test OTP Message */}
              <View style={styles.testOtpContainer}>
                <Text variant="caption" weight="medium" style={styles.testOtpText}>
                  For testing, use OTP: 123456
                </Text>
              </View>
            </View>

            {/* OTP Input */}
            <OTPInput
              value={otp}
              onChange={setOtp}
              length={6}
              disabled={isLoading}
              style={styles.otpInput}
            />

            {/* Verify Button */}
            <Button
              title="Verify and continue"
              onPress={handleVerifyOTP}
              loading={isLoading}
              disabled={otp.length !== 6 || isLoading}
              fullWidth
              style={styles.verifyButton}
            />

            {/* Resend Section */}
            <View style={styles.resendContainer}>
              <Text variant="caption" color="secondary" style={styles.resendText}>
                Didn't receive the code?
              </Text>

              {canResend ? (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={isResending}
                  style={styles.resendButtonClickable}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    color="primary"
                    style={[styles.resendButtonText, isResending && styles.resendingText]}
                  >
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text variant="caption" color="secondary">
                  Resend code in {resendTimer}s
                </Text>
              )}
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
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    marginLeft: 16,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#d1fae5',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  infoText: {
    marginBottom: 8,
  },
  phoneNumber: {
    marginBottom: 16,
  },
  testOtpContainer: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  testOtpText: {
    color: '#0369a1',
    textAlign: 'center',
  },
  otpInput: {
    marginBottom: 32,
  },
  verifyButton: {
    marginBottom: 24,
    backgroundColor: '#CA3500',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    marginBottom: 12,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonClickable: {
    padding: 8,
  },
  resendButtonText: {
    textDecorationLine: 'underline',
  },
  resendingText: {
    opacity: 0.5,
  },
  devNote: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
  },
  devNoteTitle: {
    color: '#1e40af',
    marginBottom: 4,
  },
  devNoteText: {
    color: '#1d4ed8',
  },
});
