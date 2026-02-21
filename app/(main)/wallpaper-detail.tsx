import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Text } from '@/components/atoms';
import { mockWallpapers } from '@/data/mockWallpapers';
import { usePremiumStore } from '@/store/premiumStore';
import { downloadWallpaper, shareWallpaper } from '@/utils/downloadWallpaper';
import { useTranslation } from '@/hooks/useTranslation';

const { width, height } = Dimensions.get('window');

export default function WallpaperDetailScreen() {
  const params = useLocalSearchParams();
  const wallpaper = mockWallpapers.find((w) => w.id === params.id);
  const [liked, setLiked] = useState(false);
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t } = useTranslation();

  if (!wallpaper) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant="h4" weight="semibold">
            {t('wallpapers.noWallpapersFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDownload = async () => {
    if (wallpaper.isPremium && !isPremium) {
      setShowPaywall(true);
      return;
    }

    await downloadWallpaper({
      imageUrl: wallpaper.imageUrl,
      title: wallpaper.title,
      addWatermark: true,
    });
  };

  const handleShare = async () => {
    await shareWallpaper(wallpaper.imageUrl, wallpaper.title);
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: wallpaper.imageUrl }} style={styles.backgroundImage} blurRadius={10} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setLiked(!liked)}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#ef4444' : '#fff'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer}>
          {/* Main Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: wallpaper.imageUrl }} style={styles.mainImage} />
            {wallpaper.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text variant="caption" style={styles.premiumText}>
                  {t('wallpaperDetail.premiumBadge')}
                </Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.titleSection}>
              <Text variant="h3" weight="bold" style={styles.title}>
                {wallpaper.title}
              </Text>
              <View style={styles.categoryBadge}>
                <Text variant="caption" weight="medium" style={styles.categoryText}>
                  {wallpaper.category}
                </Text>
              </View>
            </View>

            <Text variant="body" color="secondary" style={styles.description}>
              {wallpaper.description}
            </Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="download-outline" size={20} color="#3b82f6" />
                <View style={styles.statContent}>
                  <Text variant="h4" weight="bold">
                    {(wallpaper.downloads / 1000).toFixed(1)}K
                  </Text>
                  <Text variant="caption" color="secondary">
                    {t('wallpapers.downloads')}
                  </Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={20} color="#ef4444" />
                <View style={styles.statContent}>
                  <Text variant="h4" weight="bold">
                    {(wallpaper.likes / 1000).toFixed(1)}K
                  </Text>
                  <Text variant="caption" color="secondary">
                    {t('wallpapers.likes')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              <Text variant="body" weight="semibold" style={styles.tagsLabel}>
                {t('wallpapers.tags')}
              </Text>
              <View style={styles.tagsRow}>
                {wallpaper.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text variant="caption" style={styles.tagText}>
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color="#3b82f6" />
            <Text variant="body" weight="medium" color="primary">
              {t('wallpaperDetail.share')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text variant="body" weight="semibold" style={styles.downloadText}>
              {t('wallpaperDetail.download')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  imageContainer: {
    width: width,
    height: height * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
  },
  premiumBadge: {
    position: 'absolute',
    top: 36,
    right: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  premiumText: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: -24,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    color: '#1e40af',
  },
  description: {
    marginBottom: 24,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statContent: {
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  tagsContainer: {
    gap: 12,
  },
  tagsLabel: {
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    color: '#4b5563',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadText: {
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacing: {
    height: 24,
  },
});
