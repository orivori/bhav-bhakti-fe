import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/atoms';
import { Deity } from '@/types/feed';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { logDeityFilterUsed } from '@/utils/analytics/engagementEvents';

// Sub-tab-agnostic selection value - the hub owns the actual state (see
// CLAUDE.md's deity-filter redesign notes), this component only reflects and
// emits it. Not named "Ringtone*" anything, deliberately - this same type/row
// is meant to be reused once Aarti/Bhajan have real content.
export type DeityFilterSelection =
  | { kind: 'trending' }
  | { kind: 'liked' }
  | { kind: 'deity'; deityId: number };

interface DeityFilterRowProps {
  deities: Deity[];
  selected: DeityFilterSelection;
  onSelect: (selection: DeityFilterSelection) => void;
}

// Fixed display order for the primary row, independent of each deity's
// `sortOrder` in the DB (which doesn't match this product-chosen sequence -
// e.g. Vishnu/Lakshmi sort ahead of Hanuman/Kali there). Matched against
// Deity.name, case-insensitively.
const PRIMARY_DEITY_NAMES = [
  'ganesha',
  'shiva',
  'hanuman',
  'krishna',
  'rama',
  'durga',
  'kali',
  'saraswati',
];

// At most this many deity chips sit in the row itself; the rest go in the
// "More" sheet, which only appears when more than this many deities qualify.
const MAX_INLINE_DEITIES = 8;

const CHIP_SIZE = 56;

// Chip labels wrap to at most two lines. Every label in the row reserves the
// height of two lines, so one-line and two-line chips line up evenly. Values
// match the Text atom's caption line heights (20 English, 24 Devanagari) -
// set explicitly, with an explicit width, per the CLAUDE.md §71 fix for
// Android clipping Hindi text it measures itself.
const getChipLabelLineHeight = (language: string) => (language === 'en' ? 20 : 24);

function resolveDisplayName(deity: Deity, language: string): string {
  return deity.displayName?.[language] || deity.displayName?.en || deity.name;
}

function ChipLabel({ text, selected, language }: { text: string; selected: boolean; language: string }) {
  const lineHeight = getChipLabelLineHeight(language);
  return (
    <Text
      variant="caption"
      weight={selected ? 'semibold' : 'medium'}
      style={[styles.chipLabel, { lineHeight, minHeight: lineHeight * 2 }, selected && styles.chipLabelSelected]}
      numberOfLines={2}
    >
      {text}
    </Text>
  );
}

function DeityCircle({
  deity,
  language,
  selected,
}: {
  deity: Deity;
  language: string;
  selected: boolean;
}) {
  const gradientColors = (deity.colors && deity.colors.length >= 2
    ? deity.colors.slice(0, 2)
    : [goldenTempleTheme.colors.primary[300], goldenTempleTheme.colors.primary[500]]) as [string, string];

  return (
    <View style={styles.chipColumn}>
      <View style={[styles.circleWrapper, selected && styles.circleWrapperSelected]}>
        <LinearGradient colors={gradientColors} style={styles.circle}>
          <Text style={styles.emoji}>{deity.icon || '🙏'}</Text>
        </LinearGradient>
      </View>
      <ChipLabel text={resolveDisplayName(deity, language)} selected={selected} language={language} />
    </View>
  );
}

export default function DeityFilterRow({ deities, selected, onSelect }: DeityFilterRowProps) {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const [moreVisible, setMoreVisible] = useState(false);

  // `deities` is already limited to deities with content (useDeities). Order:
  // the fixed primary names first, then everyone else by sortOrder. The
  // first MAX_INLINE_DEITIES sit in the row; any beyond that go in "More".
  const { primaryDeities, overflowDeities } = useMemo(() => {
    const byName = new Map(deities.map((d) => [d.name.toLowerCase(), d]));

    const primary = PRIMARY_DEITY_NAMES
      .map((name) => byName.get(name))
      .filter((d): d is Deity => Boolean(d));

    const primaryIds = new Set(primary.map((d) => d.id));
    // Sorting by sortOrder here is what naturally puts "Others" (sortOrder
    // 9999) last in this list without needing to special-case it by name.
    const rest = deities
      .filter((d) => !primaryIds.has(d.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const ordered = [...primary, ...rest];
    return {
      primaryDeities: ordered.slice(0, MAX_INLINE_DEITIES),
      overflowDeities: ordered.slice(MAX_INLINE_DEITIES),
    };
  }, [deities]);

  const isDeitySelected = (deityId: number) =>
    selected.kind === 'deity' && selected.deityId === deityId;

  const isOverflowSelected = selected.kind === 'deity' &&
    overflowDeities.some((d) => d.id === selected.deityId);

  // Single wrapper around every real onSelect call site below (trending/
  // liked/primary deity/overflow deity) - the one shared hook point for
  // deity_filter_used, reused unchanged across all 3 hub screens that render
  // this component (Mantra Explorer/Audio hub/Wallpaper hub).
  const emitSelect = (selection: DeityFilterSelection) => {
    logDeityFilterUsed({
      filter_type: selection.kind,
      ...(selection.kind === 'deity'
        ? { deity_name: deities.find((d) => d.id === selection.deityId)?.name ?? 'unknown' }
        : {}),
    });
    onSelect(selection);
  };

  const handleSelectDeity = (deityId: number) => {
    emitSelect({ kind: 'deity', deityId });
    setMoreVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All - always present, default/auto-selected by whatever the
            parent initializes `selected` to. */}
        <TouchableOpacity
          style={styles.chipColumn}
          onPress={() => emitSelect({ kind: 'trending' })}
          activeOpacity={0.75}
        >
          <View style={[styles.circleWrapper, selected.kind === 'trending' && styles.circleWrapperSelected]}>
            <LinearGradient
              colors={[goldenTempleTheme.colors.primary[400], goldenTempleTheme.colors.primary[600]]}
              style={styles.circle}
            >
              <Ionicons name="flame" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <ChipLabel text={t('deityFilter.all')} selected={selected.kind === 'trending'} language={language} />
        </TouchableOpacity>

        {/* Liked - wired to the hub's own useXFeed() hook, which branches to
            feedService.getUserLikedFeeds() when this is selected (see
            CLAUDE.md). Same visual treatment as the "All" chip above. */}
        <TouchableOpacity
          style={styles.chipColumn}
          onPress={() => emitSelect({ kind: 'liked' })}
          activeOpacity={0.75}
        >
          <View style={[styles.circleWrapper, selected.kind === 'liked' && styles.circleWrapperSelected]}>
            <LinearGradient
              colors={[goldenTempleTheme.colors.primary[400], goldenTempleTheme.colors.primary[600]]}
              style={styles.circle}
            >
              <Ionicons name="heart" size={22} color="#fff" />
            </LinearGradient>
          </View>
          <ChipLabel text={t('deityFilter.liked')} selected={selected.kind === 'liked'} language={language} />
        </TouchableOpacity>

        {primaryDeities.map((deity) => (
          <TouchableOpacity
            key={deity.id}
            onPress={() => handleSelectDeity(deity.id)}
            activeOpacity={0.75}
          >
            <DeityCircle deity={deity} language={language} selected={isDeitySelected(deity.id)} />
          </TouchableOpacity>
        ))}

        {/* More - expand trigger for the deities beyond the first
            MAX_INLINE_DEITIES; only shown when there are any. */}
        {overflowDeities.length > 0 && (
          <TouchableOpacity
            style={styles.chipColumn}
            onPress={() => setMoreVisible(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.circleWrapper, isOverflowSelected && styles.circleWrapperSelected]}>
              <View style={[styles.circle, styles.moreCircle]}>
                <Ionicons name="ellipsis-horizontal" size={24} color={goldenTempleTheme.colors.text.secondary} />
              </View>
            </View>
            <ChipLabel text={t('deityFilter.more')} selected={isOverflowSelected} language={language} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={moreVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMoreVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text variant="h4" weight="semibold" style={styles.modalTitle}>
              {t('deityFilter.moreDeities')}
            </Text>
            <ScrollView contentContainerStyle={styles.modalGrid}>
              {overflowDeities.map((deity) => (
                <TouchableOpacity
                  key={deity.id}
                  style={styles.modalGridItem}
                  onPress={() => handleSelectDeity(deity.id)}
                  activeOpacity={0.75}
                >
                  <DeityCircle deity={deity} language={language} selected={isDeitySelected(deity.id)} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    // Matches Home's spacing.lg (24px) left/right margin system - shared by
    // all 3 screens that render this component (Mantra Explorer, Audio hub,
    // Wallpaper hub), so this single change intentionally shifts the deity
    // chip row's edges by 8px on all three at once.
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: 12,
    gap: 16,
  },
  chipColumn: {
    width: 68,
    alignItems: 'center',
    gap: 6,
  },
  circleWrapper: {
    width: CHIP_SIZE + 6,
    height: CHIP_SIZE + 6,
    borderRadius: (CHIP_SIZE + 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  circleWrapperSelected: {
    borderColor: goldenTempleTheme.colors.primary.DEFAULT,
  },
  circle: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCircle: {
    backgroundColor: goldenTempleTheme.colors.muted[200],
  },
  emoji: {
    fontSize: 26,
  },
  chipLabel: {
    width: '100%',
    color: goldenTempleTheme.colors.text.secondary,
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: goldenTempleTheme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: goldenTempleTheme.colors.muted[300],
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: 'flex-start',
  },
  modalGridItem: {
    width: 76,
    alignItems: 'center',
  },
});
