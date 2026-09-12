import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Text } from '@/components/atoms';
import { OTPInput } from '@/components/molecules';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { registerAutoVerifiedListener } from '@/features/authentication/utils/firebaseConfirmation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/atoms/Toast';
import { PhoneStorageService } from '@/utils/phoneStorage';

export default function VerifyOTPScreen() {
  // returnTo/returnParams: present only when this verification is a re-auth
  // triggered by LoginPromptModal (see apiClient.ts/authPromptStore.ts) - used
  // below to send the user back to exactly the screen they were on instead of
  // the normal fresh-login destination (Home).
  const { phoneNumber, countryCode, sessionId, orderId, returnTo, returnParams } = useLocalSearchParams<{
    phoneNumber: string;
    countryCode: string;
    sessionId?: string;
    orderId: string;
    returnTo?: string;
    returnParams?: string;
  }>();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  // True the moment Android's background SMS auto-verification wins (see
  // registerAutoVerifiedListener effect below) - drives the visible "Verified
  // automatically" state so the screen reacts to that real event immediately,
  // instead of silently waiting for the user's own typing to reach 6 digits
  // while a background success has already made whatever they type moot.
  const [isAutoVerified, setIsAutoVerified] = useState(false);

  const { verifyOTP, sendOTP } = useAuth();
  const { showToast } = useToast();

  // Guards against the auto-submit effect below and a manual "Verify Code"
  // tap both calling handleVerifyOTP concurrently. isLoading (state) can't be
  // used for this - a state update from setIsLoading(true) isn't guaranteed
  // to have committed by the time a near-simultaneous second call checks it,
  // leaving a real window (worse on slow/real-world networks, where an
  // impatient tester re-taps) for both calls to reach Firebase's confirm()
  // on the same verification session. Firebase's code is single-use: the
  // first call to land succeeds (creating the Firebase Auth user), the
  // second gets rejected as already-consumed (auth/code-expired /
  // auth/session-expired) - and if that rejection resolves first, the user
  // sees "code expired" despite the login having actually succeeded.
  const isVerifyingRef = useRef(false);

  // Mirrors otp state for the auto-verified listener below, which is
  // registered once on mount (empty deps) and would otherwise close over a
  // stale otp value. In practice the value passed through is moot anyway -
  // useAuth.tsx's verifyOTP() never reads data.otp once a background winner
  // exists (Option A, comparing typed digits against the real code, was
  // deliberately deferred) - but keeping it correct here avoids relying on
  // that being true forever.
  const otpRef = useRef(otp);
  useEffect(() => {
    otpRef.current = otp;
  }, [otp]);

  // No mount-time "Verification Code Sent" toast here - phone-login.tsx
  // already shows it at the actual moment the send succeeds. Firing it again
  // here unconditionally on every mount was both redundant (a second toast
  // landing mid-transition looked like a jarring flash) and wrong on its own
  // terms (it re-fired on any remount of this screen, e.g. back-then-forward
  // navigation, even when no code had actually just been sent).

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

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOTP();
    }
  }, [otp]);

  // Reacts to Android's background SMS auto-verification the moment it
  // completes (real, first-of-its-kind Play Store timing confirmed in the
  // session-expired investigation this fixed originally - it typically wins
  // several seconds before most people finish typing). Deliberately NOT
  // gated on otp.length === 6 here, unlike handleVerifyOTP below - waiting
  // for that is exactly what let gibberish input appear to "succeed" once a
  // background win already existed. Registered once on mount and persists
  // across a resend (registerAutoVerifiedListener isn't reset by a fresh
  // sendOTP() call - see firebaseConfirmation.ts).
  //
  // Real bug found on .dev: onIdTokenChanged (the signal this listener rides
  // on, see firebaseConfirmation.ts) fires for ANY successful sign-in on the
  // auth instance - not just a genuine background win. Our own manual
  // confirmation.confirm(otp) call ALSO triggers it internally (confirm()
  // calls signInWithCredential() under the hood), so without the guard
  // below, this fired - and showed "Verified automatically" - on completely
  // normal manual logins too, 100% of the time on .dev (which has no
  // Play Integrity/SMS Retriever path to genuinely win in the first place).
  // isVerifyingRef is true for the ENTIRE span of any verification attempt
  // already in progress (manual confirm(), or an earlier-detected
  // background win still being processed) - if one's already running, this
  // firing is that attempt's own sign-in completing, not a fresh, unprompted
  // background win worth telling the UI about. A genuine early win (nothing
  // typed/submitted yet) correctly finds isVerifyingRef still false and
  // proceeds as before.
  useEffect(() => {
    registerAutoVerifiedListener(() => {
      if (isVerifyingRef.current) return;
      setIsAutoVerified(true);
      finalizeVerification(otpRef.current);
    });
    return () => registerAutoVerifiedListener(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalizeVerification = async (otpValue: string) => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;

    try {
      setIsLoading(true);

      await verifyOTP({
        phoneNumber: phoneNumber!,
        countryCode: countryCode!,
        otp: otpValue,
        ...(sessionId && { sessionId }),
        orderId: orderId!,
      });

      // verifyOTP() above already replaced the stack with '/(main)' (its own
      // hardcoded destination for a normal fresh login) - if this was instead
      // a re-auth from LoginPromptModal, immediately replace again to send
      // the user back to their actual screen. Both are synchronous
      // router.replace calls in the same tick, so there's no intermediate
      // Home flash; a normal login (no returnTo) is unaffected.
      if (returnTo) {
        let parsedReturnParams: Record<string, string> | undefined;
        if (returnParams) {
          try {
            parsedReturnParams = JSON.parse(returnParams);
          } catch (parseError) {
            console.error('Failed to parse returnParams, navigating without them:', parseError);
          }
        }
        router.replace({ pathname: returnTo as any, params: parsedReturnParams });
      }
    } catch (error) {
      const friendlyMessage = error instanceof Error ? error.message : 'Invalid verification code. Please try again.';

      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: friendlyMessage,
      });

      setOtp(''); // Clear OTP on error
      setIsAutoVerified(false); // A failure past this point is a real error, not the auto-verified success path
    } finally {
      setIsLoading(false);
      isVerifyingRef.current = false;
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      showToast({ type: 'error', message: 'Please enter a 6-digit verification code.' });
      return;
    }

    await finalizeVerification(otp);
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
        setIsAutoVerified(false); // A resend starts a genuinely new verification session
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

            {/* Verification Info */}
            <View style={styles.infoContainer}>
              <Text variant="body" color="secondary" align="center" style={styles.infoText}>
                We've sent a 6-digit verification code to
              </Text>
              <Text variant="body" weight="semibold" align="center" style={styles.phoneNumber}>
                {formatPhoneNumber()}
              </Text>
              <Text variant="caption" color="secondary" align="center">
                Please enter the code to continue
              </Text>
            </View>

            {/* OTP Input */}
            <OTPInput
              value={otp}
              onChange={setOtp}
              length={6}
              disabled={isLoading}
              style={styles.otpInput}
            />

            {/* Shown the moment Android's background SMS auto-verification
                wins (see registerAutoVerifiedListener effect above) - the
                boxes above are already locked via disabled={isLoading} by
                that same event, so this tells the user WHY, instead of the
                screen just silently reacting to a background success they
                can't see. */}
            {isAutoVerified && (
              <View style={styles.autoVerifiedBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text variant="caption" weight="semibold" style={styles.autoVerifiedText}>
                  Verified automatically
                </Text>
              </View>
            )}

            {/* Verify Button */}
            <Button
              title="Verify Code"
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  infoText: {
    marginBottom: 8,
  },
  phoneNumber: {
    marginBottom: 16,
  },
  otpInput: {
    marginBottom: 32,
  },
  autoVerifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -20,
    marginBottom: 20,
  },
  autoVerifiedText: {
    color: '#16a34a',
  },
  verifyButton: {
    marginBottom: 24,
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
});
