import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/atoms';
import SearchBar from '@/components/molecules/SearchBar';
import StatusTabContent from '@/components/molecules/StatusTabContent';
import ThoughtTabContent from '@/components/molecules/ThoughtTabContent';
import WallpapersTabContent from '@/components/molecules/WallpapersTabContent';
import DeityFilterRow, { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';
import { useDeities } from '@/features/feed/hooks/useDeities';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';

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
// labelKey points at the wallpaperHub.* i18n keys added alongside this
// screen's search-bar/pill overhaul (mirroring the Audio hub's audio.* keys)
// - this screen previously had zero translation (every sub-tab label
// hardcoded English).
const SUB_TABS: { key: SubTab; labelKey: string; showDeityFilter: boolean }[] = [
  { key: 'status', labelKey: 'wallpaperHub.status', showDeityFilter: true },
  { key: 'thought', labelKey: 'wallpaperHub.thought', showDeityFilter: false },
  { key: 'wallpapers', labelKey: 'wallpaperHub.wallpapers', showDeityFilter: true },
];

function isSubTab(value: unknown): value is SubTab {
  return value === 'status' || value === 'thought' || value === 'wallpapers';
}

export default function WallpaperHubScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ subTab?: string }>();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('status');
  const activeTabConfig = SUB_TABS.find((tab) => tab.key === activeSubTab)!;

  // Same pattern as Mantra Explorer/Audio hub's own back button: this hub is
  // reachable both via tab-bar switch (no back-history) and via real
  // router.push (Home's quick-link, choose-start.tsx's onboarding flow, real
  // back-history) - rather than depend on the Tabs navigator's implicit
  // back-history, always navigate straight to Home.
  const handleBackToHome = useCallback(() => {
    router.replace('/(main)' as any);
  }, []);

  // Deliberately NOT restricted to activeSubTab - searches across both real
  // Feed types together regardless of which sub-tab is showing, matching the
  // Audio hub's search behavior. Only two real types exist here - 'status' is
  // not its own Feed.type, it's the unfiltered superset of 'wallpaper' (see
  // CLAUDE.md's Wallpaper Hub content-model notes), so the restriction is
  // 'wallpaper,thought', not three values.
  const handleSearchSubmit = useCallback((query: string) => {
    if (query.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(main)/search-results',
        params: {
          query: query.trim(),
          type: 'wallpaper,thought',
          // Route name is kept as 'daily-status' even though it's labeled
          // "Wallpapers" - see the note at the top of this file.
          returnTo: '/(main)/daily-status',
        },
      });
    }
  }, []);

  // Hub-level, deliberately shared across all sub-tabs (not re-declared inside
  // StatusTabContent/WallpapersTabContent/ThoughtTabContent) - selecting
  // Ganesha must persist when switching sub-tabs, and the hub is the one
  // screen in this tree that never unmounts, so state held here survives
  // sub-tab switches for free.
  const [selectedFilter, setSelectedFilter] = useState<DeityFilterSelection>({ kind: 'trending' });
  const { data: deities = [] } = useDeities();

  // Only one of StatusTabContent/ThoughtTabContent/WallpapersTabContent is
  // ever mounted at a time (see the conditional render below), so one shared
  // ref safely tracks whichever sub-tab's FlatList is currently active.
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

  // No playback-stop-on-switch effect here (unlike the Audio hub) - wallpapers
  // and thoughts have no audio/playback concept, so there's nothing analogous
  // to stop when switching sub-tabs or filters.

  return (
    <SafeAreaView style={styles.container}>
      {/* Search header - replaces the former centered "Wallpapers" title
          entirely, same back-chevron + search bar pattern as the Audio hub
          and Mantra Explorer's headers. */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToHome}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={goldenTempleTheme.colors.text.primary} />
        </TouchableOpacity>
        <SearchBar
          placeholder={t('wallpaperHub.searchPlaceholder')}
          onSearchSubmit={handleSearchSubmit}
          containerStyle={styles.headerSearchBar}
        />
      </View>

      {/* Sub-tab row now comes before the deity filter (matches the Audio
          hub's order - this screen previously had them reversed). */}
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
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
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

      <View style={styles.content}>
        {activeSubTab === 'status' && <StatusTabContent ref={activeListRef} filter={selectedFilter} />}
        {activeSubTab === 'thought' && <ThoughtTabContent ref={activeListRef} />}
        {activeSubTab === 'wallpapers' && <WallpapersTabContent ref={activeListRef} filter={selectedFilter} />}
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
  // own background, matching the Audio hub's header exactly. SearchBar's own
  // visual style (the cream input pill) is untouched - this only affects the
  // header row's own container.
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
  // paddingHorizontal above, and the bar needs flex:1 to fill the remaining
  // width beside the back button.
  headerSearchBar: {
    flex: 1,
    marginHorizontal: 0,
  },
  // Same white-background removal as the header above.
  subTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: 12,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  // Matches SearchBar's own background fill (its searchContainer style) -
  // same cream tone as the search bar above, matching the Audio hub.
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
  },
  // Was templeRed (#C41E3A) - switched to the app's established primary
  // action color, matching the Audio hub's selected-pill fill exactly (solid
  // fill, not a gradient - no gradient pattern exists for sub-tab pills
  // anywhere in this app).
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
