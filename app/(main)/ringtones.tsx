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
import { spiritualTheme } from '@/styles/spiritualTheme';

export default function RingtonesScreen() {
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
    backgroundColor: spiritualTheme.colors.backgrounds.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spiritualTheme.spacing.md,
    paddingVertical: spiritualTheme.spacing.sm,
    backgroundColor: spiritualTheme.colors.backgrounds.card,
    borderBottomWidth: 1,
    borderBottomColor: spiritualTheme.colors.primary[200],
    ...spiritualTheme.shadows.sm,
  },
  backButton: {
    padding: spiritualTheme.spacing.sm,
    borderRadius: spiritualTheme.borderRadius.md,
    backgroundColor: spiritualTheme.colors.primary[50],
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: spiritualTheme.colors.text.primary,
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spiritualTheme.spacing.lg,
    backgroundColor: spiritualTheme.colors.backgrounds.primary,
  },
});