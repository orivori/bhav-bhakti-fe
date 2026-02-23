import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Text } from '@/components/atoms';
import { mockWallpapers } from '@/data/mockWallpapers';
import { WallpaperCategory } from '@/types/wallpaper';
import { usePremiumStore } from '@/store/premiumStore';
import { useTranslation } from '@/hooks/useTranslation';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

const { width } = Dimensions.get('window');

export default function WallpapersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WallpaperCategory>('All');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t } = useTranslation();

  const categories: WallpaperCategory[] = [
    'All',
    'Gods',
    'Goddesses',
    'Temples',
    'Nature',
    'Festivals',
    'Quotes',
    'Abstract',
  ];

  const getCategoryName = (category: WallpaperCategory) => {
    const categoryMap: Record<WallpaperCategory, string> = {
      'All': t('wallpapers.all'),
      'Gods': t('wallpapers.gods'),
      'Goddesses': t('wallpapers.goddesses'),
      'Temples': t('wallpapers.temples'),
      'Nature': t('wallpapers.nature'),
      'Festivals': t('wallpapers.festivals'),
      'Quotes': t('wallpapers.quotes'),
      'Abstract': t('wallpapers.abstract'),
    };
    return categoryMap[category];
  };

  const filteredWallpapers = useMemo(() => {
    return mockWallpapers.filter((wallpaper) => {
      const matchesSearch =
        searchQuery.length === 0 ||
        wallpaper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallpaper.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || wallpaper.category === selectedCategory;

      const matchesPremium = !showPremiumOnly || wallpaper.isPremium;

      return matchesSearch && matchesCategory && matchesPremium;
    });
  }, [searchQuery, selectedCategory, showPremiumOnly]);

  const handleWallpaperPress = (wallpaper: any) => {
    if (wallpaper.isPremium && !isPremium) {
      setShowPaywall(true);
      return;
    }
    router.push({
      pathname: '/(main)/wallpaper-detail',
      params: { id: wallpaper.id },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={goldenTempleTheme.colors.text.muted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search mantras, ringtones..."
            placeholderTextColor={goldenTempleTheme.colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={goldenTempleTheme.colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons
            name="person-circle-outline"
            size={32}
            color={goldenTempleTheme.colors.primary.DEFAULT}
          />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                variant="body"
                weight="medium"
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {getCategoryName(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.filterButton, showPremiumOnly && styles.filterButtonActive]}
          onPress={() => setShowPremiumOnly(!showPremiumOnly)}
        >
          <Ionicons
            name="star"
            size={16}
            color={showPremiumOnly ? goldenTempleTheme.colors.accent.DEFAULT : goldenTempleTheme.colors.text.muted}
          />
          <Text
            variant="caption"
            style={[
              styles.filterButtonText,
              showPremiumOnly && styles.filterButtonTextActive,
            ]}
          >
            {t('common.premium')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Wallpapers Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredWallpapers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={goldenTempleTheme.colors.text.muted} />
            <Text variant="h4" weight="semibold" style={styles.emptyTitle}>
              {t('wallpapers.noWallpapersFound')}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {t('wallpapers.tryDifferentSearch')}
            </Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredWallpapers.map((wallpaper) => (
              <TouchableOpacity
                key={wallpaper.id}
                style={styles.gridItem}
                onPress={() => handleWallpaperPress(wallpaper)}
              >
                <Image source={{ uri: wallpaper.thumbnailUrl }} style={styles.gridImage} />
                {wallpaper.isPremium && (
                  <View style={styles.gridPremiumBadge}>
                    <Ionicons name="star" size={12} color={goldenTempleTheme.colors.accent.DEFAULT} />
                  </View>
                )}
                <View style={styles.gridOverlay}>
                  <Text variant="body" weight="semibold" style={styles.gridTitle} numberOfLines={1}>
                    {wallpaper.title}
                  </Text>
                  <View style={styles.gridStats}>
                    <View style={styles.gridStat}>
                      <Ionicons name="download-outline" size={12} color="#fff" />
                      <Text variant="caption" style={styles.gridStatText}>
                        {(wallpaper.downloads / 1000).toFixed(1)}K
                      </Text>
                    </View>
                    <View style={styles.gridStat}>
                      <Ionicons name="heart-outline" size={12} color="#fff" />
                      <Text variant="caption" style={styles.gridStatText}>
                        {(wallpaper.likes / 1000).toFixed(1)}K
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: goldenTempleTheme.colors.border,
    ...goldenTempleTheme.shadows.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.xl,
    marginRight: goldenTempleTheme.spacing.md,
    borderWidth: 1,
    borderColor: goldenTempleTheme.colors.border,
  },
  searchIcon: {
    marginRight: goldenTempleTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.primary,
  },
  profileButton: {
    padding: 4,
  },
  filtersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: goldenTempleTheme.colors.border,
    gap: 12,
  },
  categoriesContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
  },
  categoryText: {
    color: goldenTempleTheme.colors.text.secondary,
  },
  categoryTextActive: {
    color: goldenTempleTheme.colors.primary.foreground,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
    marginRight: 24,
  },
  filterButtonActive: {
    backgroundColor: goldenTempleTheme.colors.accent[100],
  },
  filterButtonText: {
    color: goldenTempleTheme.colors.text.secondary,
  },
  filterButtonTextActive: {
    color: goldenTempleTheme.colors.accent[700],
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  gridItem: {
    width: (width - 56) / 2,
    height: 280,
    borderRadius: goldenTempleTheme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
    ...goldenTempleTheme.shadows.md,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPremiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
    borderRadius: 12,
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  gridTitle: {
    color: '#fff',
    marginBottom: 6,
  },
  gridStats: {
    flexDirection: 'row',
    gap: 12,
  },
  gridStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridStatText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 24,
  },
});
