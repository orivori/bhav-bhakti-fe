import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface OrnateCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'ornate';
}

const OrnateCard: React.FC<OrnateCardProps> = ({
  children,
  style,
  variant = 'primary',
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return goldenTempleTheme.gradients.temple;
      case 'secondary':
        return goldenTempleTheme.gradients.bronze;
      case 'ornate':
        return goldenTempleTheme.gradients.ornate;
      default:
        return goldenTempleTheme.gradients.temple;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Ornate golden border */}
      <LinearGradient
        colors={getGradientColors()}
        style={styles.borderGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Inner card with warm background */}
        <View style={styles.innerCard}>
          {children}
        </View>
      </LinearGradient>

      {/* Decorative corner elements */}
      <View style={styles.topLeftCorner} />
      <View style={styles.topRightCorner} />
      <View style={styles.bottomLeftCorner} />
      <View style={styles.bottomRightCorner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    margin: goldenTempleTheme.spacing.sm,
  },
  borderGradient: {
    borderRadius: goldenTempleTheme.borderRadius.lg,
    padding: 3, // Border thickness
    ...goldenTempleTheme.shadows.ornate,
  },
  innerCard: {
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    borderRadius: goldenTempleTheme.borderRadius.lg - 3,
    padding: goldenTempleTheme.spacing.md,
    minHeight: 80,
  },
  // Decorative corner elements
  topLeftCorner: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 12,
    height: 12,
    borderTopLeftRadius: goldenTempleTheme.borderRadius.lg,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: goldenTempleTheme.colors.accent.DEFAULT,
  },
  topRightCorner: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderTopRightRadius: goldenTempleTheme.borderRadius.lg,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: goldenTempleTheme.colors.accent.DEFAULT,
  },
  bottomLeftCorner: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 12,
    height: 12,
    borderBottomLeftRadius: goldenTempleTheme.borderRadius.lg,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: goldenTempleTheme.colors.accent.DEFAULT,
  },
  bottomRightCorner: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderBottomRightRadius: goldenTempleTheme.borderRadius.lg,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: goldenTempleTheme.colors.accent.DEFAULT,
  },
});

export default OrnateCard;