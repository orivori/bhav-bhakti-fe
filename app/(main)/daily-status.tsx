import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

export default function DailyStatusScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text variant="h4" weight="semibold" style={styles.title}>
          Find your perfect mantra
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Content will be added later */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.backgrounds.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    borderBottomWidth: 1,
    borderBottomColor: goldenTempleTheme.colors.primary[200],
    ...goldenTempleTheme.shadows.sm,
  },
  backButton: {
    padding: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: goldenTempleTheme.colors.primary[50],
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: goldenTempleTheme.colors.text.primary,
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: goldenTempleTheme.spacing.lg,
    backgroundColor: goldenTempleTheme.colors.backgrounds.primary,
  },
});