import React from 'react';
import { View, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { useScreenshotProtectionSettings } from '@/utils/screenshotProtection';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface ScreenshotProtectionSettingsProps {
  showAsCard?: boolean;
  showDescription?: boolean;
}

export default function ScreenshotProtectionSettings({
  showAsCard = true,
  showDescription = true,
}: ScreenshotProtectionSettingsProps) {
  const { isEnabled, toggle } = useScreenshotProtectionSettings();

  const containerStyle = [
    styles.container,
    showAsCard && styles.card,
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isEnabled ? 'shield' : 'shield-outline'}
            size={24}
            color={isEnabled ? goldenTempleTheme.colors.primary.DEFAULT : goldenTempleTheme.colors.text.secondary}
          />
        </View>

        <View style={styles.textContainer}>
          <Text variant="body" weight="semibold" style={styles.title}>
            Screenshot Protection
          </Text>
          {showDescription && (
            <Text variant="caption" color="secondary" style={styles.description}>
              Prevents users from taking screenshots of the app content
            </Text>
          )}
        </View>

        <Switch
          value={isEnabled}
          onValueChange={toggle}
          trackColor={{
            false: goldenTempleTheme.colors.text.muted,
            true: goldenTempleTheme.colors.primary.DEFAULT,
          }}
          thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
          ios_backgroundColor={goldenTempleTheme.colors.text.muted}
        />
      </View>

      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusDot,
          isEnabled ? styles.statusActive : styles.statusInactive
        ]} />
        <Text variant="caption" color={isEnabled ? 'primary' : 'secondary'}>
          {isEnabled ? 'Protection Active' : 'Protection Disabled'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: 'rgba(218, 165, 32, 0.1)',
    borderRadius: goldenTempleTheme.borderRadius.lg,
    padding: goldenTempleTheme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
    ...goldenTempleTheme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: 2,
  },
  description: {
    lineHeight: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.xs,
    marginTop: goldenTempleTheme.spacing.sm,
    paddingLeft: 52, // Align with text
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
  },
  statusInactive: {
    backgroundColor: goldenTempleTheme.colors.text.muted,
  },
});