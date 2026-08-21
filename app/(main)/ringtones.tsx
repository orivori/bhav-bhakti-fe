import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/atoms';
import SearchBar from '@/components/molecules/SearchBar';
import RingtonesTabContent from '@/components/molecules/RingtonesTabContent';
import AartiTabContent from '@/components/molecules/AartiTabContent';
import BhajanTabContent from '@/components/molecules/BhajanTabContent';
import { usePlaybackStore } from '@/store/playbackStore';
import DeityFilterRow, { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';
import { useDeities } from '@/features/feed/hooks/useDeities';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';

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
// labelKey points at the new `audio.*` i18n keys added for this hub's first
// ever i18n wiring - this screen previously had zero translation (every
// string hardcoded English), unlike Mantra Explorer.
const SUB_TABS: { key: SubTab; labelKey: string; showDeityFilter: boolean }[] = [
  { key: 'ringtones', labelKey: 'audio.ringtones', showDeityFilter: true },
  { key: 'aarti', labelKey: 'audio.aarti', showDeityFilter: true },
  { key: 'bhajan', labelKey: 'audio.bhajan', showDeityFilter: true },
];

function isSubTab(value: unknown): value is SubTab {
  return value === 'ringtones' || value === 'aarti' || value === 'bhajan';
}

export default function AudioHubScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ subTab?: string }>();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('ringtones');
  const activeTabConfig = SUB_TABS.find((tab) => tab.key === activeSubTab)!;

  // Same pattern as Mantra Explorer's own back button (CLAUDE.md §56 Phase 1):
  // this hub is reachable both via tab-bar switch (no back-history) and via
  // real router.push (from Home/choose-start.tsx/AutoplayFeedCard, real
  // back-history) - rather than depend on the Tabs navigator's implicit
  // back-history, always navigate straight to Home.
  const handleBackToHome = useCallback(() => {
    router.replace('/(main)' as any);
  }, []);

  // Deliberately NOT restricted to activeSubTab - searches across all three
  // of ringtone/aarti/bhajan together regardless of which sub-tab is
  // showing, per product decision. feed.validator.js/feed.service.js were
  // widened to accept a comma-separated `type` list (Op.in server-side)
  // specifically to support this.
  const handleSearchSubmit = useCallback((query: string) => {
    if (query.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(main)/search-results',
        params: {
          query: query.trim(),
          type: 'ringtone,aarti,bhajan',
          // Matches the established returnTo pattern (audio-player.tsx,
          // Mantra Explorer) - route name is kept as 'ringtones' even
          // though it's labeled "Audio", see the note at the top of this
          // file.
          returnTo: '/(main)/ringtones',
        },
      });
    }
  }, []);

  // Hub-level, deliberately shared across all sub-tabs (not re-declared inside
  // RingtonesTabContent/AartiTabContent/BhajanTabContent) - selecting Ganesha
  // must persist when switching sub-tabs, and the hub is the one screen in
  // this tree that never unmounts, so state held here survives sub-tab
  // switches for free. Consumed by RingtonesTabContent -> useRingtones() and
  // Aarti/BhajanTabContent -> useAudioFeed().
  const [selectedFilter, setSelectedFilter] = useState<DeityFilterSelection>({ kind: 'trending' });
  const { data: deities = [] } = useDeities();

  // Only one of RingtonesTabContent/AartiTabContent/BhajanTabContent is ever
  // mounted at a time (see the conditional render below), so one shared ref
  // safely tracks whichever sub-tab's FlatList is currently active.
  const activeListRef = useRef<FlatList>(null);

  useScrollToTopOnTabPress(useCallback(() => {
    activeListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []));

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
      {/* Search header - replaces the former "Audio" title entirely, same
          back-chevron + search bar pattern as Mantra Explorer's header. */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToHome}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={goldenTempleTheme.colors.text.primary} />
        </TouchableOpacity>
        <SearchBar
          placeholder={t('audio.searchPlaceholder')}
          onSearchSubmit={handleSearchSubmit}
          containerStyle={styles.headerSearchBar}
        />
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
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
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

      <View style={styles.content}>
        {activeSubTab === 'ringtones' && <RingtonesTabContent ref={activeListRef} filter={selectedFilter} />}
        {activeSubTab === 'aarti' && <AartiTabContent ref={activeListRef} filter={selectedFilter} />}
        {activeSubTab === 'bhajan' && <BhajanTabContent ref={activeListRef} filter={selectedFilter} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  // White background + shadow removed entirely (was visually a separate
  // card sitting on top of the page) - now blends directly into the page's
  // own background, matching Mantra Explorer's header exactly. SearchBar's
  // own visual style (the cream input pill) is untouched - this only
  // affects the header row's own container.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: goldenTempleTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    marginRight: goldenTempleTheme.spacing.sm,
  },
  // Overrides SearchBar's own default marginHorizontal:spacing.lg gutter -
  // this header row already provides that edge spacing via its own
  // paddingHorizontal above, and the bar needs flex:1 to fill the
  // remaining width beside the back button.
  headerSearchBar: {
    flex: 1,
    marginHorizontal: 0,
  },
  // Same white-background/shadow removal as the header above.
  subTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: 12,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  // Matches SearchBar's own background fill (its searchContainer style) -
  // was a near-white '#F8F9FA' before, now the same cream tone as the
  // search bar directly above it.
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
  },
  // Was templeRed (#C41E3A) - switched to the app's established primary
  // action color (the same token behind "Send Verification Code" and other
  // primary buttons, via Button.tsx's default 'primary' variant).
  subTabButtonActive: {
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
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
