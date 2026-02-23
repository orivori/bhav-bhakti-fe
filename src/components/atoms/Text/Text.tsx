import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' |'h5' | 'body' | 'caption' | 'overline';
  color?: 'primary' | 'secondary' | 'accent' | 'muted' | 'error' | 'success' | 'warning' | 'gold' | 'bronze';
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
    primary: { color: goldenTempleTheme.colors.text.primary },
    secondary: { color: goldenTempleTheme.colors.text.secondary },
    accent: { color: goldenTempleTheme.colors.text.accent },
    muted: { color: goldenTempleTheme.colors.text.muted },
    error: { color: goldenTempleTheme.colors.error },
    success: { color: goldenTempleTheme.colors.success },
    warning: { color: goldenTempleTheme.colors.warning },
    gold: { color: goldenTempleTheme.colors.primary.DEFAULT },
    bronze: { color: goldenTempleTheme.colors.secondary.DEFAULT },
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
    color: goldenTempleTheme.colors.text.primary,
  },
});

export default Text;
