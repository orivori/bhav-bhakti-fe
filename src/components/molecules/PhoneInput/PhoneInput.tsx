import React from 'react';
import { View, StyleSheet, ViewStyle, TextInput } from 'react-native';
import { Text } from '@/components/atoms';

// India-only for now - no country picker. See CLAUDE.md if this ever needs
// to support other countries again (the removed picker/COUNTRIES-array
// version is in git history).
const CALLING_CODE = '+91';

interface PhoneInputProps {
  value: string;
  onChangeText: (phoneNumber: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  error,
  label = 'Phone Number',
  placeholder = 'Enter your phone number',
  disabled = false,
  style,
}) => {
  const inputWrapperStyle = [
    styles.inputWrapper,
    error && styles.inputWrapperError,
    disabled && styles.inputWrapperDisabled,
  ];

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text weight="medium" style={styles.label}>
          {label}
        </Text>
      )}

      <View style={inputWrapperStyle}>
        <View style={styles.callingCodeContainer}>
          <Text weight="medium" style={styles.callingCode}>
            {CALLING_CODE}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          editable={!disabled}
        />
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
    marginBottom: 8,
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputWrapperDisabled: {
    backgroundColor: '#f3f4f6',
  },
  callingCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  callingCode: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
});

export default PhoneInput;
