import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/atoms';
import RingtonesTabContent from '@/components/molecules/RingtonesTabContent';
import { usePlaybackStore } from '@/store/playbackStore';

// Route kept as 'ringtones' deliberately (see CLAUDE.md's Audio hub restructure
// notes) - this used to be a standalone Ringtones screen; it's now the "Audio"
// hub, with Ringtones as one of several horizontal sub-tabs (Aartis/Bhajans
// alongside it, more later). Keeping the route name avoids touching any
// existing router.push/router.replace call site that targets it.

type SubTab = 'ringtones' | 'aarti' | 'bhajan';
const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'ringtones', label: 'Ringtones' },
  { key: 'aarti', label: 'Aartis' },
  { key: 'bhajan', label: 'Bhajans' },
];

function isSubTab(value: unknown): value is SubTab {
  return value === 'ringtones' || value === 'aarti' || value === 'bhajan';
}

export default function AudioHubScreen() {
  const params = useLocalSearchParams<{ subTab?: string }>();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('ringtones');

  // Reactive, not once-only (deliberately no ref-guard, unlike audio-player.tsx's
  // autoPlay param): a repeated tap on the same Home quick-link while already
  // sitting on a different sub-tab must still switch tabs every time, and since
  // expo-router's Tabs don't unmount this screen between navigations, params
  // changing on an already-mounted screen is exactly what this needs to react to.
  useEffect(() => {
    if (isSubTab(params.subTab)) {
      setActiveSubTab(params.subTab);
    }
  }, [params.subTab]);

  // Sub-tab-switch stop logic - approved design: touches the `ephemeral` slot
  // unconditionally by key, never reads or compares `persistent`. This exists
  // because RingtoneFeedCard's own useFocusEffect-based stop-on-blur only fires
  // on navigator-level screen focus changes, not on this hub's internal sub-tab
  // state - switching Ringtones -> Aartis/Bhajans in place would otherwise leave
  // a ringtone playing with no mini-player and no visible control to stop it.
  useEffect(() => {
    const { ephemeral } = usePlaybackStore.getState();
    if (ephemeral) {
      try {
        ephemeral.controls.stop();
      } catch (error) {
        console.error('Error stopping ringtone during sub-tab switch (player likely already released):', error);
      }
      usePlaybackStore.setState({ ephemeral: null });
    }
  }, [activeSubTab]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h3" style={styles.headerTitle}>
          Audio
        </Text>
      </View>

      <View style={styles.subTabRow}>
        {SUB_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.subTabButton, activeSubTab === tab.key && styles.subTabButtonActive]}
            onPress={() => setActiveSubTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.subTabLabel, activeSubTab === tab.key && styles.subTabLabelActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {activeSubTab === 'ringtones' && <RingtonesTabContent />}
        {activeSubTab === 'aarti' && (
          <View style={styles.placeholderContainer}>
            <Text variant="h4" style={styles.placeholderTitle}>
              Aartis Coming Soon
            </Text>
            <Text variant="body" style={styles.placeholderSubtitle}>
              This sub-tab is a placeholder - real Aarti content is separate future work.
            </Text>
          </View>
        )}
        {activeSubTab === 'bhajan' && (
          <View style={styles.placeholderContainer}>
            <Text variant="h4" style={styles.placeholderTitle}>
              Bhajans Coming Soon
            </Text>
            <Text variant="body" style={styles.placeholderSubtitle}>
              This sub-tab is a placeholder - real Bhajan content is separate future work.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  subTabButtonActive: {
    backgroundColor: '#C41E3A',
  },
  subTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
  },
  subTabLabelActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  placeholderTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  placeholderSubtitle: {
    textAlign: 'center',
    maxWidth: 280,
    color: '#8E8E93',
    lineHeight: 22,
  },
});
