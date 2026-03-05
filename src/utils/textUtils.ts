import { Platform, TextStyle } from 'react-native';

/**
 * Utility functions for improved text rendering, especially for Devanagari script
 */

/**
 * Checks if the given text contains Devanagari characters
 * Devanagari Unicode range: U+0900-U+097F
 */
export const containsDevanagari = (text: any): boolean => {
  if (typeof text !== 'string') return false;
  return /[\u0900-\u097F]/.test(text);
};

/**
 * Checks if the given text contains complex script characters that need special font support
 */
export const needsComplexScriptSupport = (text: any): boolean => {
  if (typeof text !== 'string') return false;
  // Devanagari, Arabic, Thai, etc.
  return /[\u0900-\u097F\u0600-\u06FF\u0E00-\u0E7F]/.test(text);
};

/**
 * Gets the appropriate font family for the given text content
 */
export const getOptimizedFontFamily = (text: any): string => {
  const hasDevanagari = containsDevanagari(text);

  if (hasDevanagari) {
    // Use platform-specific fonts with better Devanagari support
    if (Platform.OS === 'android') {
      // Better Android fonts for Devanagari in order of preference
      return 'sans-serif-medium'; // Better Devanagari rendering with proper matra spacing
    } else if (Platform.OS === 'ios') {
      return 'Devanagari Sangam MN'; // iOS system Devanagari font
    }
  }

  return 'System'; // Default system font for non-Devanagari text
};

/**
 * Gets optimized text style for better rendering of complex scripts
 */
export const getOptimizedTextStyle = (text: any, fontSize: number = 14): TextStyle => {
  const baseStyle: TextStyle = {
    fontFamily: getOptimizedFontFamily(text),
  };

  // Add platform-specific optimizations for complex scripts
  if (needsComplexScriptSupport(text)) {
    if (Platform.OS === 'android') {
      return {
        ...baseStyle,
        textAlignVertical: 'center',
        includeFontPadding: false,
        lineHeight: Math.max(fontSize * 1.5, 22), // Increased line height for proper matra display
        paddingVertical: 3, // Extra vertical padding to prevent clipping
        marginVertical: 1, // Additional margin for complex scripts
      };
    } else if (Platform.OS === 'ios') {
      return {
        ...baseStyle,
        lineHeight: Math.max(fontSize * 1.4, 20), // Controlled line height for iOS
        paddingVertical: 2,
        marginVertical: 1,
      };
    }
  }

  return baseStyle;
};

/**
 * Common text props for better rendering of Hindi/Devanagari text
 */
export const getOptimizedTextProps = () => ({
  allowFontScaling: false, // Prevent system font scaling issues
  maxFontSizeMultiplier: 1.2, // Limit font scaling
  adjustsFontSizeToFit: false, // Prevent automatic font size adjustment that can clip matras
});

/**
 * Enhanced text props specifically for Hindi text with matras
 */
export const getHindiTextProps = (text: any) => {
  const hasDevanagari = containsDevanagari(text);

  if (hasDevanagari) {
    return {
      ...getOptimizedTextProps(),
      // Additional props for Hindi text
      numberOfLines: undefined, // Allow full height for complex scripts
      ellipsizeMode: 'tail' as const,
      minimumFontScale: 1, // Prevent font scaling that can break matras
    };
  }

  return getOptimizedTextProps();
};

/**
 * Validates if a font supports Devanagari characters
 * This is a simple check - in production, you might want more sophisticated validation
 */
export const fontSupportsDevanagari = (fontFamily: string): boolean => {
  const devanagariSupportingFonts = [
    'Devanagari Sangam MN',
    'sans-serif',
    'sans-serif-medium',
    'Noto Sans Devanagari',
    'Mangal',
    'Kokila',
    'Aparajita',
  ];

  return devanagariSupportingFonts.some(font =>
    fontFamily.toLowerCase().includes(font.toLowerCase())
  );
};

/**
 * Gets enhanced line height for Hindi text to prevent matra clipping
 */
export const getEnhancedLineHeight = (fontSize: number, text: any, isHeading: boolean = false): number => {
  const hasDevanagari = containsDevanagari(text);

  if (hasDevanagari) {
    // Extra generous line height for headings with compound words
    if (isHeading) {
      return Math.max(fontSize * 1.9, fontSize + 18); // Very generous for headings
    }
    // Increase line height significantly for Devanagari to accommodate matras
    return Math.max(fontSize * 1.6, 24);
  }

  return fontSize * 1.2; // Standard line height for other text
};

/**
 * Gets extra padding for heading text to prevent clipping
 */
export const getHeadingPadding = (text: any, fontSize: number): number => {
  const hasDevanagari = containsDevanagari(text);

  if (hasDevanagari) {
    // More padding for larger headings
    if (fontSize >= 24) return 6; // h1, h2, h3
    if (fontSize >= 18) return 4; // h4
    return 2; // smaller headings
  }

  return 0; // No extra padding for non-Hindi text
};
