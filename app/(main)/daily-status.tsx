import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/atoms';
import StatusTabContent from '@/components/molecules/StatusTabContent';
import ThoughtTabContent from '@/components/molecules/ThoughtTabContent';
import WallpapersTabContent from '@/components/molecules/WallpapersTabContent';
import DeityFilterRow, { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';
import { useDeities } from '@/features/feed/hooks/useDeities';

// Route kept as 'daily-status' deliberately (see CLAUDE.md's Wallpaper Hub
// notes, mirroring the Audio hub restructure) - this used to be a standalone
// Daily Status screen; it's now the "Wallpapers" hub, with Status as one of
// three horizontal sub-tabs (Thought for the Day / Wallpapers alongside it).
// Keeping the route name avoids touching any existing router.push/
// router.replace call site that targets it (Home's quick-link, choose-start's
// onboarding flow).

type SubTab = 'status' | 'thought' | 'wallpapers';

// showDeityFilter is declared right alongside each sub-tab's own registration
// entry - the same array that's already the single source of truth for "what
// sub-tabs exist" - rather than as a separate lookup a future sub-tab could
// forget to update. TypeScript requires the field on every entry. Thought for
// the Day is the first real use of showDeityFilter: false - the exact case
// this mechanism was built for during the Audio hub work.
const SUB_TABS: { key: SubTab; label: string; showDeityFilter: boolean }[] = [
  { key: 'status', label: 'Status', showDeityFilter: true },
  { key: 'thought', label: 'Thought for the Day', showDeityFilter: false },
  { key: 'wallpapers', label: 'Wallpapers', showDeityFilter: true },
];

function isSubTab(value: unknown): value is SubTab {
  return value === 'status' || value === 'thought' || value === 'wallpapers';
}

export default function WallpaperHubScreen() {
  const params = useLocalSearchParams<{ subTab?: string }>();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('status');
  const activeTabConfig = SUB_TABS.find((tab) => tab.key === activeSubTab)!;

  // Hub-level, deliberately shared across all sub-tabs (not re-declared inside
  // StatusTabContent/WallpapersTabContent/ThoughtTabContent) - selecting
  // Ganesha must persist when switching sub-tabs, and the hub is the one
  // screen in this tree that never unmounts, so state held here survives
  // sub-tab switches for free.
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

  // No playback-stop-on-switch effect here (unlike the Audio hub) - wallpapers
  // and thoughts have no audio/playback concept, so there's nothing analogous
  // to stop when switching sub-tabs or filters.

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h3" style={styles.headerTitle}>
          Wallpapers
        </Text>
      </View>

      {/* Visibility is declared per sub-tab (see SUB_TABS above), not hardcoded
          here - Thought for the Day sets showDeityFilter: false since deity
          selection doesn't apply to that content type. */}
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
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {activeSubTab === 'status' && <StatusTabContent filter={selectedFilter} />}
        {activeSubTab === 'thought' && <ThoughtTabContent />}
        {activeSubTab === 'wallpapers' && <WallpapersTabContent filter={selectedFilter} />}
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
});
