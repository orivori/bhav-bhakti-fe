import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/atoms';
import RingtonesTabContent from '@/components/molecules/RingtonesTabContent';
import { usePlaybackStore } from '@/store/playbackStore';
import DeityFilterRow, { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';
import { useDeities } from '@/features/feed/hooks/useDeities';

// Route kept as 'ringtones' deliberately (see CLAUDE.md's Audio hub restructure
// notes) - this used to be a standalone Ringtones screen; it's now the "Audio"
// hub, with Ringtones as one of several horizontal sub-tabs (Aartis/Bhajans
// alongside it, more later). Keeping the route name avoids touching any
// existing router.push/router.replace call site that targets it.

type SubTab = 'ringtones' | 'aarti' | 'bhajan';

// showDeityFilter is declared right alongside each sub-tab's own registration
// entry - the same array that's already the single source of truth for "what
// sub-tabs exist" - rather than as a separate lookup a future sub-tab could
// forget to update. TypeScript requires the field on every entry, so adding a
// sub-tab (e.g. a future "Thought for the Day") without deciding this value
// is a compile error, not a silent default.
const SUB_TABS: { key: SubTab; label: string; showDeityFilter: boolean }[] = [
  { key: 'ringtones', label: 'Ringtones', showDeityFilter: true },
  { key: 'aarti', label: 'Aartis', showDeityFilter: true },
  { key: 'bhajan', label: 'Bhajans', showDeityFilter: true },
];

function isSubTab(value: unknown): value is SubTab {
  return value === 'ringtones' || value === 'aarti' || value === 'bhajan';
}

export default function AudioHubScreen() {
  const params = useLocalSearchParams<{ subTab?: string }>();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('ringtones');
  const activeTabConfig = SUB_TABS.find((tab) => tab.key === activeSubTab)!;

  // Hub-level, deliberately shared across all sub-tabs (not re-declared inside
  // RingtonesTabContent or any future AartiTabContent/BhajanTabContent) -
  // selecting Ganesha must persist when switching sub-tabs, and the hub is the
  // one screen in this tree that never unmounts, so state held here survives
  // sub-tab switches for free. Consumed by RingtonesTabContent -> useRingtones()
  // today; future Aarti/Bhajan content components will read the same value.
  const [selectedFilter, setSelectedFilter] = useState<DeityFilterSelection>({ kind: 'trending' });
  const { data: deities = [] } = useDeities();

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

  // Stop-on-"leaving the current list behind" logic - approved design: touches
  // the `ephemeral` slot unconditionally by key, never reads or compares
  // `persistent`. Fires on either a sub-tab switch (Ringtones -> Aartis/Bhajans)
  // or a deity-filter change (e.g. tapping a different deity chip while still
  // on Ringtones) - both represent leaving the current list behind, so both use
  // the same stop mechanism rather than two separate implementations.
  useEffect(() => {
    const { ephemeral } = usePlaybackStore.getState();
    if (ephemeral) {
      try {
        ephemeral.controls.stop();
      } catch (error) {
        console.error('Error stopping ringtone during sub-tab/filter switch (player likely already released):', error);
      }
      usePlaybackStore.setState({ ephemeral: null });
    }
  }, [activeSubTab, selectedFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h3" style={styles.headerTitle}>
          Audio
        </Text>
      </View>

      {/* Visibility is declared per sub-tab (see SUB_TABS above), not hardcoded
          here - a future sub-tab that opts out (e.g. "Thought for the Day")
          just sets showDeityFilter: false on its own registration entry. */}
      {activeTabConfig.showDeityFilter && (
        <DeityFilterRow
          deities={deities}
          selected={selectedFilter}
          onSelect={setSelectedFilter}
        />
      )}

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
        {activeSubTab === 'ringtones' && <RingtonesTabContent filter={selectedFilter} />}
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
