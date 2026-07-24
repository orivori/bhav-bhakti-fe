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

import { Text } from '@/components/atoms';
import { Deity } from '@/types/feed';
import { useTranslation } from '@/hooks/useTranslation';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

// Sub-tab-agnostic selection value - the hub owns the actual state (see
// CLAUDE.md's deity-filter redesign notes), this component only reflects and
// emits it. Not named "Ringtone*" anything, deliberately - this same type/row
// is meant to be reused once Aarti/Bhajan have real content.
export type DeityFilterSelection =
  | { kind: 'trending' }
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

const CHIP_SIZE = 56;

function resolveDisplayName(deity: Deity, language: string): string {
  return deity.displayName?.[language] || deity.displayName?.en || deity.name;
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
      <Text
        variant="caption"
        weight={selected ? 'semibold' : 'medium'}
        style={[styles.chipLabel, selected && styles.chipLabelSelected]}
        numberOfLines={1}
      >
        {resolveDisplayName(deity, language)}
      </Text>
    </View>
  );
}

export default function DeityFilterRow({ deities, selected, onSelect }: DeityFilterRowProps) {
  const { language } = useTranslation();
  const [moreVisible, setMoreVisible] = useState(false);

  const { primaryDeities, overflowDeities } = useMemo(() => {
    const byName = new Map(deities.map((d) => [d.name.toLowerCase(), d]));

    const primary = PRIMARY_DEITY_NAMES
      .map((name) => byName.get(name))
      .filter((d): d is Deity => Boolean(d));

    const primaryIds = new Set(primary.map((d) => d.id));
    // Sorting by sortOrder here is what naturally puts "Others" (sortOrder
    // 9999) last in this list without needing to special-case it by name.
    const overflow = deities
      .filter((d) => !primaryIds.has(d.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return { primaryDeities: primary, overflowDeities: overflow };
  }, [deities]);

  const isDeitySelected = (deityId: number) =>
    selected.kind === 'deity' && selected.deityId === deityId;

  const isOverflowSelected = selected.kind === 'deity' &&
    overflowDeities.some((d) => d.id === selected.deityId);

  const handleSelectDeity = (deityId: number) => {
    onSelect({ kind: 'deity', deityId });
    setMoreVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trending - always present, default/auto-selected by whatever the
            parent initializes `selected` to. */}
        <TouchableOpacity
          style={styles.chipColumn}
          onPress={() => onSelect({ kind: 'trending' })}
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
          <Text
            variant="caption"
            weight={selected.kind === 'trending' ? 'semibold' : 'medium'}
            style={[styles.chipLabel, selected.kind === 'trending' && styles.chipLabelSelected]}
          >
            Trending
          </Text>
        </TouchableOpacity>

        {/* Liked - reserved slot only. Deliberately no onPress: not built yet. */}
        <View style={[styles.chipColumn, styles.chipDisabled]}>
          <View style={styles.circleWrapper}>
            <View style={[styles.circle, styles.circleDisabled]}>
              <Ionicons name="heart" size={22} color={goldenTempleTheme.colors.text.muted} />
            </View>
          </View>
          <Text variant="caption" weight="medium" style={[styles.chipLabel, styles.chipLabelDisabled]}>
            Liked
          </Text>
        </View>

        {primaryDeities.map((deity) => (
          <TouchableOpacity
            key={deity.id}
            onPress={() => handleSelectDeity(deity.id)}
            activeOpacity={0.75}
          >
            <DeityCircle deity={deity} language={language} selected={isDeitySelected(deity.id)} />
          </TouchableOpacity>
        ))}

        {/* More - expand trigger for remaining deities + Others */}
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
          <Text
            variant="caption"
            weight={isOverflowSelected ? 'semibold' : 'medium'}
            style={[styles.chipLabel, isOverflowSelected && styles.chipLabelSelected]}
          >
            More
          </Text>
        </TouchableOpacity>
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
              More Deities
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  chipColumn: {
    width: 68,
    alignItems: 'center',
    gap: 6,
  },
  chipDisabled: {
    opacity: 0.4,
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
  circleDisabled: {
    backgroundColor: goldenTempleTheme.colors.muted[200],
  },
  moreCircle: {
    backgroundColor: goldenTempleTheme.colors.muted[200],
  },
  emoji: {
    fontSize: 26,
  },
  chipLabel: {
    color: goldenTempleTheme.colors.text.secondary,
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  chipLabelDisabled: {
    color: goldenTempleTheme.colors.text.muted,
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
