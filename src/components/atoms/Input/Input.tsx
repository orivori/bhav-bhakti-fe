import React from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  multiline = false,
  numberOfLines,
  leftIcon,
  rightIcon,
  style,
  inputStyle,
}) => {
  const inputWrapperStyle = [
    styles.inputWrapper,
    error && styles.inputWrapperError,
    disabled && styles.inputWrapperDisabled,
  ];

  const inputStyles = [
    styles.input,
    multiline && styles.multilineInput,
    inputStyle,
  ];

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}

      <View style={inputWrapperStyle}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={inputStyles}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
        />

        {rightIcon && (
          <View style={styles.rightIconContainer}>
            {rightIcon}
          </View>
        )}
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
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputWrapperDisabled: {
    backgroundColor: '#f3f4f6',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 16,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  leftIconContainer: {
    paddingLeft: 12,
  },
  rightIconContainer: {
    paddingRight: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
});

export default Input;
