import React, { useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle } from 'react-native';

interface OTPInputProps {
  value: string;
  onChange: (otp: string) => void;
  length?: number;
  error?: string;
  label?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
}

const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  error,
  label = 'Enter OTP',
  disabled = false,
  autoFocus = true,
  style,
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChangeText = (text: string, index: number) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');

    // If more than one character is pasted
    if (numericText.length > 1) {
      const otpArray = numericText.slice(0, length).split('');
      const newOTP = Array(length).fill('').map((_, i) => otpArray[i] || '').join('');
      onChange(newOTP);

      // Focus on the last filled input or the next empty one
      const nextIndex = Math.min(numericText.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single character input
    const otpArray = value.split('');
    otpArray[index] = numericText;
    const newOTP = otpArray.join('');
    onChange(newOTP);

    // Auto-focus next input
    if (numericText && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      // If backspace on empty field, focus previous field
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Clear the current input when focused
    if (value[index]) {
      const otpArray = value.split('');
      otpArray[index] = '';
      onChange(otpArray.join(''));
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}

      <View style={styles.inputContainer}>
        {Array.from({ length }, (_, index) => {
          const inputStyle = [
            styles.input,
            error && styles.inputError,
            value[index] && styles.inputFilled,
            disabled && styles.inputDisabled,
          ];

          return (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={inputStyle}
              value={value[index] || ''}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => handleFocus(index)}
              keyboardType="numeric"
              maxLength={1}
              editable={!disabled}
              autoFocus={autoFocus && index === 0}
              selectTextOnFocus
              textAlignVertical="center"
            />
          );
        })}
      </View>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: '#374151',
    fontWeight: '500',
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  input: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputFilled: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default OTPInput;
