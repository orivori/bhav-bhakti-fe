import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useFeed } from '@/features/feed/hooks/useFeed';
import { useTranslation } from '@/hooks/useTranslation';
import type { Feed } from '@/types/feed';

const MANTRA_CATEGORIES = [
  {
    id: 'ganesh',
    title: { en: 'Ganesh Mantras', hi: 'गणेश मंत्र' },
    subtitle: { en: 'Remove obstacles', hi: 'विघ्न हरण' },
    colors: ['#ff6b35', '#f7931e'],
    icon: '🐘',
  },
  {
    id: 'shiva',
    title: { en: 'Shiva Mantras', hi: 'शिव मंत्र' },
    subtitle: { en: 'Inner peace', hi: 'आंतरिक शांति' },
    colors: ['#4a90e2', '#357abd'],
    icon: '🔱',
  },
  {
    id: 'durga',
    title: { en: 'Durga Mantras', hi: 'दुर्गा मंत्र' },
    subtitle: { en: 'Divine strength', hi: 'दिव्य शक्ति' },
    colors: ['#d4af37', '#b8860b'],
    icon: '🗿',
  },
  {
    id: 'lakshmi',
    title: { en: 'Lakshmi Mantras', hi: 'लक्ष्मी मंत्र' },
    subtitle: { en: 'Prosperity', hi: 'समृद्धि' },
    colors: ['#e91e63', '#ad1457'],
    icon: '🪷',
  },
  {
    id: 'hanuman',
    title: { en: 'Hanuman Mantras', hi: 'हनुमान मंत्र' },
    subtitle: { en: 'Courage & strength', hi: 'साहस और शक्ति' },
    colors: ['#ff9800', '#f57c00'],
    icon: '💪',
  },
  {
    id: 'universal',
    title: { en: 'Universal Mantras', hi: 'सार्वभौमिक मंत्र' },
    subtitle: { en: 'Healing & peace', hi: 'उपचार और शांति' },
    colors: ['#4caf50', '#388e3c'],
    icon: '🕉️',
  },
];

export default function MantrasScreen() {
  const { t, language } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter for mantra-type feeds
  const feedFilters = selectedCategory
    ? { type: 'mantra' as const, tags: [selectedCategory] }
    : { type: 'mantra' as const };

  const {
    feeds: mantras,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    loadMore,
    refresh,
    likeFeed,
    viewFeed,
    error,
  } = useFeed({
    filters: feedFilters,
    limit: 20
  });

  const handleCategoryPress = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleMantraPress = useCallback((mantra: Feed) => {
    // Track view
    viewFeed(mantra.id.toString());

    // Navigate to audio player with mantra data
    router.push({
      pathname: '/(main)/audio-player',
      params: {
        feedId: mantra.id.toString(),
        title: mantra.caption || 'Mantra',
        audioUrl: mantra.media?.[0]?.audioUrl || mantra.media?.[0]?.mediaUrl || '',
        thumbnailUrl: mantra.media?.[0]?.thumbnailUrl || mantra.media?.[0]?.mediaUrl || '',
        artist: mantra.user?.name || 'Unknown Artist',
        duration: mantra.media?.[0]?.duration?.toString() || '0',
        isLiked: mantra.isLiked ? 'true' : 'false',
      },
    });
  }, [viewFeed]);

  const handleLikePress = useCallback((mantraId: string, event: any) => {
    event?.stopPropagation();
    likeFeed(mantraId);
  }, [likeFeed]);

  const renderMantraCard = useCallback(({ item: mantra }: { item: Feed }) => (
    <TouchableOpacity
      style={styles.mantraCard}
      onPress={() => handleMantraPress(mantra)}
      activeOpacity={0.8}
    >
      <Image
        source={{
          uri: mantra.media?.[0]?.thumbnailUrl || mantra.media?.[0]?.mediaUrl || 'https://via.placeholder.com/80x80'
        }}
        style={styles.mantraImage}
        resizeMode="cover"
      />

      <View style={styles.mantraContent}>
        <Text variant="body" weight="semibold" style={styles.mantraTitle} numberOfLines={2}>
          {mantra.caption || 'Untitled Mantra'}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {mantra.user?.name || 'Unknown Artist'}
        </Text>

        <View style={styles.mantraStats}>
          <View style={styles.statItem}>
            <Ionicons name="play" size={12} color={goldenTempleTheme.colors.text.secondary} />
            <Text variant="caption" style={styles.statText}>
              {mantra.viewsCount || 0}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={12} color={goldenTempleTheme.colors.text.secondary} />
            <Text variant="caption" style={styles.statText}>
              {mantra.media?.[0]?.duration ? `${Math.floor((mantra.media[0].duration || 0) / 60)}:${String((mantra.media[0].duration || 0) % 60).padStart(2, '0')}` : '0:00'}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handleMantraPress(mantra)}
        activeOpacity={0.7}
      >
        <Ionicons name="play" size={20} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.likeButton, mantra.isLiked && styles.likeButtonActive]}
        onPress={(e) => handleLikePress(mantra.id.toString(), e)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={mantra.isLiked ? "heart" : "heart-outline"}
          size={18}
          color={mantra.isLiked ? "#e91e63" : goldenTempleTheme.colors.text.secondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleMantraPress, handleLikePress]);

  const renderCategoryCard = useCallback(({ item: category }: { item: typeof MANTRA_CATEGORIES[0] }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(selectedCategory === category.id ? null : category.id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={category.colors}
        style={styles.categoryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text variant="body" weight="semibold" style={styles.categoryTitle}>
          {category.title[language] || category.title.en}
        </Text>
        <Text variant="caption" style={styles.categorySubtitle}>
          {category.subtitle[language] || category.subtitle.en}
        </Text>
        {selectedCategory === category.id && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark" size={16} color="#ffffff" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  ), [language, selectedCategory, handleCategoryPress]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={goldenTempleTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text variant="h4" weight="semibold" style={styles.title}>
            {t('mantras.findPerfectMantra')}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={goldenTempleTheme.colors.secondary.DEFAULT} />
          <Text variant="body" style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text variant="body" style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={goldenTempleTheme.colors.text.primary} />
        </TouchableOpacity>
        <Text variant="h4" weight="semibold" style={styles.title}>
          {t('mantras.findPerfectMantra')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={goldenTempleTheme.colors.primary.DEFAULT}
          />
        }
      >
        {/* Preview Explorer Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="bold" style={styles.sectionTitle}>
            {t('mantras.previewExplorer')}
          </Text>
          <Text variant="caption" style={styles.sectionSubtitle}>
            {t('mantras.exploreMostPopular')}
          </Text>
        </View>

        {/* Find Perfect Mantra Card */}
        <View style={styles.section}>
          <LinearGradient
            colors={goldenTempleTheme.gradients.divine}
            style={styles.promoCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.promoContent}>
              <Text variant="h3" weight="bold" style={styles.promoTitle}>
                {t('mantras.findPerfectMantra')}
              </Text>
              <Text variant="body" style={styles.promoDescription}>
                {t('mantras.sacredCollection')}
              </Text>
            </View>
            <Text style={styles.promoIcon}>🕉️</Text>
          </LinearGradient>
        </View>

        {/* Browse by Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h4" weight="bold" style={styles.sectionTitle}>
              {t('mantras.browseBycategory')}
            </Text>
            {selectedCategory && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleCategoryPress(null)}
              >
                <Text variant="caption" style={styles.clearButtonText}>
                  {t('mantras.all')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={MANTRA_CATEGORIES}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.categoryRow}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesContainer}
          />
        </View>

        {/* All Mantras Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="bold" style={styles.sectionTitle}>
            {selectedCategory
              ? t('mantras.selectedMantras')
              : t('mantras.allMantras')
            }
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text variant="body" color="secondary">
                {t('common.loading')}
              </Text>
            </View>
          ) : mantras.length > 0 ? (
            <FlatList
              data={mantras}
              renderItem={renderMantraCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.mantrasContainer}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() =>
                isLoadingMore ? (
                  <View style={styles.loadingMore}>
                    <Text variant="caption" color="secondary">
                      {t('common.loading')}
                    </Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={48} color={goldenTempleTheme.colors.text.secondary} />
              <Text variant="body" style={styles.emptyText}>
                {t('mantras.noMantrasFound')}
              </Text>
              <Text variant="caption" color="secondary" style={styles.emptySubtext}>
                {t('mantras.tryDifferentCategory')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  sectionTitle: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: goldenTempleTheme.spacing.xs,
  },
  sectionSubtitle: {
    color: goldenTempleTheme.colors.text.secondary,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  clearButton: {
    backgroundColor: goldenTempleTheme.colors.primary[100],
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: goldenTempleTheme.spacing.xs,
    borderRadius: goldenTempleTheme.borderRadius.sm,
  },
  clearButtonText: {
    color: goldenTempleTheme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  promoCard: {
    borderRadius: goldenTempleTheme.borderRadius.lg,
    padding: goldenTempleTheme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...goldenTempleTheme.shadows.md,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: goldenTempleTheme.spacing.xs,
  },
  promoDescription: {
    color: goldenTempleTheme.colors.text.secondary,
  },
  promoIcon: {
    fontSize: 48,
    marginLeft: goldenTempleTheme.spacing.md,
  },
  categoriesContainer: {
    gap: goldenTempleTheme.spacing.sm,
  },
  categoryRow: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    borderRadius: goldenTempleTheme.borderRadius.md,
    overflow: 'hidden',
    ...goldenTempleTheme.shadows.sm,
  },
  categoryGradient: {
    padding: goldenTempleTheme.spacing.md,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: goldenTempleTheme.spacing.xs,
  },
  categoryTitle: {
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: goldenTempleTheme.spacing.xs / 2,
  },
  categorySubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: goldenTempleTheme.spacing.xs,
    right: goldenTempleTheme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mantrasContainer: {
    gap: goldenTempleTheme.spacing.sm,
  },
  mantraCard: {
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    borderRadius: goldenTempleTheme.borderRadius.md,
    padding: goldenTempleTheme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...goldenTempleTheme.shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  mantraImage: {
    width: 60,
    height: 60,
    borderRadius: goldenTempleTheme.borderRadius.sm,
    backgroundColor: goldenTempleTheme.colors.muted.DEFAULT,
  },
  mantraContent: {
    flex: 1,
    marginLeft: goldenTempleTheme.spacing.md,
    marginRight: goldenTempleTheme.spacing.sm,
  },
  mantraTitle: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: goldenTempleTheme.spacing.xs / 2,
  },
  mantraStats: {
    flexDirection: 'row',
    marginTop: goldenTempleTheme.spacing.xs,
    gap: goldenTempleTheme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: goldenTempleTheme.colors.text.secondary,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: goldenTempleTheme.spacing.sm,
    ...goldenTempleTheme.shadows.sm,
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: goldenTempleTheme.colors.primary[200],
  },
  likeButtonActive: {
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    borderColor: '#e91e63',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.xl,
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.xl,
  },
  emptyText: {
    color: goldenTempleTheme.colors.text.primary,
    marginTop: goldenTempleTheme.spacing.sm,
    marginBottom: goldenTempleTheme.spacing.xs,
  },
  emptySubtext: {
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
  },
  errorText: {
    color: goldenTempleTheme.colors.text.primary,
    marginTop: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});