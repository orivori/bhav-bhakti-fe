import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, Platform } from 'react-native';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface HindiTextProps extends RNTextProps {
  fontSize?: number;
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  isHeading?: boolean; // New prop for heading text
}

/**
 * Specialized component for displaying Hindi text with optimal matra visibility
 * This component is specifically designed to handle Devanagari script properly
 */
const HindiText: React.FC<HindiTextProps> = ({
  fontSize = 14,
  color = goldenTempleTheme.colors.text.primary,
  weight = 'normal',
  isHeading = false,
  style,
  children,
  ...props
}) => {
  const weightMap = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };

  // Calculate enhanced line height based on whether it's a heading
  const getLineHeight = () => {
    if (isHeading) {
      // Very generous line height for headings (especially for compound words like मंत्ररिंगटोन)
      return Math.max(fontSize * 2.0, fontSize + 20);
    }
    return Math.max(fontSize * 1.7, 26); // Regular Hindi text
  };

  // Calculate padding based on font size and heading status
  const getPadding = () => {
    if (isHeading) {
      if (fontSize >= 24) return { paddingVertical: 8, paddingHorizontal: 2 }; // h1, h2, h3
      if (fontSize >= 18) return { paddingVertical: 6, paddingHorizontal: 1 }; // h4, h5
      return { paddingVertical: 4, paddingHorizontal: 1 }; // smaller headings
    }
    return { paddingVertical: Platform.OS === 'android' ? 4 : 2 };
  };

  // Enhanced styling specifically for Hindi text with matras
  const hindiTextStyle = {
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'Devanagari Sangam MN',
    fontSize,
    fontWeight: weightMap[weight] as any,
    color,
    // Critical properties for proper matra display
    lineHeight: getLineHeight(),
    ...getPadding(),
    marginVertical: isHeading ? 4 : 2, // Extra margin for headings
    textAlignVertical: Platform.OS === 'android' ? 'center' as const : undefined,
    includeFontPadding: Platform.OS === 'android' ? false : undefined,
    // iOS specific optimizations
    ...(Platform.OS === 'ios' && {
      letterSpacing: isHeading ? 0.3 : 0.2, // More spacing for headings
    }),
    // Android specific optimizations
    ...(Platform.OS === 'android' && {
      textAlign: 'left' as const,
      elevation: 0, // Prevent any shadow effects that might clip
    }),
  };

  return (
    <RNText
      style={[styles.hindiText, hindiTextStyle, style]}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      adjustsFontSizeToFit={false}
      numberOfLines={isHeading ? undefined : props.numberOfLines} // Allow full height for headings
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  hindiText: {
    // Base styles for Hindi text
    textDecorationLine: 'none',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
    elevation: 0, // Remove any elevation that might cause clipping
    overflow: 'visible', // Ensure text doesn't get clipped
  },
});

export default HindiText;
