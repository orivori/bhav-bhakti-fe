import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: '#3b82f6' },
    secondary: { backgroundColor: '#6b7280' },
    outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#3b82f6' },
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 32 },
    md: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
    lg: { paddingHorizontal: 24, paddingVertical: 16, minHeight: 52 },
  };

  const textVariantStyles: Record<string, TextStyle> = {
    primary: { color: '#ffffff', fontWeight: '600' },
    secondary: { color: '#ffffff', fontWeight: '600' },
    outline: { color: '#3b82f6', fontWeight: '600' },
  };

  const textSizeStyles: Record<string, TextStyle> = {
    sm: { fontSize: 14 },
    md: { fontSize: 16 },
    lg: { fontSize: 18 },
  };

  const buttonStyle = [
    styles.baseButton,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyle = [
    textVariantStyles[variant],
    textSizeStyles[size],
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? '#3b82f6' : '#ffffff'}
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 8,
  },
});

export default Button;
