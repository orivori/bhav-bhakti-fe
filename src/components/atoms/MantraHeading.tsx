import React from 'react';
import { Platform } from 'react-native';
import HindiText from './HindiText';
import { TextProps as RNTextProps } from 'react-native';

interface MantraHeadingProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4';
  children: React.ReactNode;
}

/**
 * Specialized component for mantra and ringtone headings
 * Optimized specifically for compound words like "मंत्ररिंगटोन"
 */
const MantraHeading: React.FC<MantraHeadingProps> = ({
  variant = 'h3',
  children,
  style,
  ...props
}) => {
  // Size mapping for heading variants
  const sizeMap = {
    h1: 36,
    h2: 30,
    h3: 24,
    h4: 20,
  };

  const fontSize = sizeMap[variant];

  // Ultra-generous styling for mantra/ringtone compound words
  const extraStyle = {
    // Maximum line height to accommodate all matras
    lineHeight: Math.max(fontSize * 2.2, fontSize + 24),
    // Extra padding to prevent any clipping
    paddingVertical: Platform.OS === 'android' ? 10 : 8,
    paddingHorizontal: 3,
    marginVertical: 6,
    // Ensure no overflow clipping
    overflow: 'visible' as const,
    // Platform specific optimizations
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center' as const,
    }),
  };

  return (
    <HindiText
      fontSize={fontSize}
      weight="semibold"
      isHeading={true}
      style={[extraStyle, style]}
      numberOfLines={undefined}
      adjustsFontSizeToFit={false}
      {...props}
    >
      {children}
    </HindiText>
  );
};

export default MantraHeading;
