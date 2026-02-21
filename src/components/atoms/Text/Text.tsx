import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' |'h5' | 'body' | 'caption' | 'overline';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
}

const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  weight = 'normal',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const variantStyles: Record<string, TextStyle> = {
    h1: { fontSize: 36, lineHeight: 40 },
    h2: { fontSize: 30, lineHeight: 36 },
    h3: { fontSize: 24, lineHeight: 32 },
    h4: { fontSize: 20, lineHeight: 28 },
    body: { fontSize: 14, lineHeight: 20 },
    caption: { fontSize: 14, lineHeight: 20 },
    overline: { fontSize: 12, lineHeight: 16, textTransform: 'uppercase', letterSpacing: 1.5 },
  };

  const colorStyles: Record<string, TextStyle> = {
    primary: { color: '#3b82f6' },
    secondary: { color: '#6b7280' },
    error: { color: '#ef4444' },
    success: { color: '#10b981' },
    warning: { color: '#f59e0b' },
  };

  const weightStyles: Record<string, TextStyle> = {
    normal: { fontWeight: '400' },
    medium: { fontWeight: '500' },
    semibold: { fontWeight: '600' },
    bold: { fontWeight: '700' },
  };

  const alignStyles: Record<string, TextStyle> = {
    left: { textAlign: 'left' },
    center: { textAlign: 'center' },
    right: { textAlign: 'right' },
  };

  const combinedStyle = [
    styles.defaultText,
    variantStyles[variant],
    color && colorStyles[color],
    weightStyles[weight],
    alignStyles[align],
    style,
  ];

  return (
    <RNText style={combinedStyle} {...props}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    color: '#111827',
  },
});

export default Text;
