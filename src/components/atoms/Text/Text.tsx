import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import {
  getHindiTextProps,
  getEnhancedLineHeight,
  containsDevanagari,
  getOptimizedTextStyle,
  getHeadingPadding
} from '@/utils/textUtils';

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
  // Check if text contains Devanagari for enhanced styling
  const hasHindiText = containsDevanagari(children);

  // Check if this is a heading variant
  const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5'].includes(variant);

  const variantStyles: Record<string, TextStyle> = {
    h1: {
      fontSize: 36,
      lineHeight: hasHindiText ? getEnhancedLineHeight(36, children, true) : 40,
      paddingVertical: hasHindiText ? getHeadingPadding(children, 36) : 0,
    },
    h2: {
      fontSize: 30,
      lineHeight: hasHindiText ? getEnhancedLineHeight(30, children, true) : 36,
      paddingVertical: hasHindiText ? getHeadingPadding(children, 30) : 0,
    },
    h3: {
      fontSize: 24,
      lineHeight: hasHindiText ? getEnhancedLineHeight(24, children, true) : 32,
      paddingVertical: hasHindiText ? getHeadingPadding(children, 24) : 0,
    },
    h4: {
      fontSize: 20,
      lineHeight: hasHindiText ? getEnhancedLineHeight(20, children, true) : 28,
      paddingVertical: hasHindiText ? getHeadingPadding(children, 20) : 0,
    },
    h5: {
      fontSize: 18,
      lineHeight: hasHindiText ? getEnhancedLineHeight(18, children, true) : 24,
      paddingVertical: hasHindiText ? getHeadingPadding(children, 18) : 0,
    },
    body: {
      fontSize: 14,
      lineHeight: hasHindiText ? getEnhancedLineHeight(14, children, false) : 20,
    },
    caption: {
      fontSize: 14,
      lineHeight: hasHindiText ? getEnhancedLineHeight(14, children, false) : 20,
    },
    overline: {
      fontSize: 12,
      lineHeight: hasHindiText ? getEnhancedLineHeight(12, children, false) : 16,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
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

  // Get font size for optimized text style
  const currentVariantStyle = variantStyles[variant];
  const fontSize = currentVariantStyle?.fontSize || 14;

  // Get enhanced text props for Hindi text
  const optimizedTextProps = getHindiTextProps(children);

  // Get optimized text style for current text and font size
  const optimizedTextStyle = getOptimizedTextStyle(children, fontSize);

  // Additional style for heading compound words like "मंत्ररिंगटोन"
  const headingEnhancement = hasHindiText && isHeading ? {
    marginVertical: 3, // Extra margin for headings
    paddingHorizontal: 1, // Slight horizontal padding
  } : {};

  const combinedStyle = [
    styles.defaultText,
    optimizedTextStyle,
    variantStyles[variant],
    color && colorStyles[color],
    weightStyles[weight],
    alignStyles[align],
    headingEnhancement,
    style,
  ];

  return (
    <RNText
      style={combinedStyle}
      {...optimizedTextProps}
      {...props}
    >
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
