import React from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

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
          placeholderTextColor={goldenTempleTheme.colors.text.muted}
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
    color: goldenTempleTheme.colors.text.primary,
    fontWeight: '500',
    marginBottom: goldenTempleTheme.spacing.sm,
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: goldenTempleTheme.colors.border,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.inputBackground,
  },
  inputWrapperError: {
    borderColor: goldenTempleTheme.colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: goldenTempleTheme.colors.backgrounds.muted,
    opacity: goldenTempleTheme.opacity.disabled,
  },
  input: {
    flex: 1,
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm + 4,
    color: goldenTempleTheme.colors.text.primary,
    fontSize: 16,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  leftIconContainer: {
    paddingLeft: goldenTempleTheme.spacing.sm + 4,
  },
  rightIconContainer: {
    paddingRight: goldenTempleTheme.spacing.sm + 4,
  },
  errorText: {
    color: goldenTempleTheme.colors.error,
    fontSize: 14,
    marginTop: 4,
  },
});

export default Input;
