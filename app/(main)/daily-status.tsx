import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import FeedList from '@/components/molecules/FeedList';
import { useFeed } from '@/features/feed/hooks';
import { Feed } from '@/types/feed';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function DailyStatusScreen() {
  const { contentPadding } = useTabBarHeight();

  // Initialize feed data with wallpaper type filter
  const {
    feeds,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    retry,
    viewFeed,
    likeFeed,
    shareFeed,
    downloadFeed,
  } = useFeed({
    limit: 10,
    filters: {
      type: 'wallpaper', // Filter for wallpaper feeds only
    },
  });

  const handleFeedPress = (feed: Feed) => {
    // Add haptic feedback for feed press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log('🖼️ Daily Status: Feed pressed:', {
      id: feed.id,
      type: feed.type,
      caption: feed.caption,
      mediaCount: feed.media?.length || 0
    });

    // Track view
    viewFeed(feed.id.toString());

    // For wallpaper feeds, you can add specific navigation logic
    // For now, just log the action
    console.log('ℹ️ Daily Status: Wallpaper feed pressed');
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text variant="h4" weight="semibold" style={styles.title}>
          Daily Status
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* <View style={styles.subtitleContainer}>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Browse beautiful wallpapers for daily inspiration
        </Text>
      </View> */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FeedList
        feeds={feeds}
        onLoadMore={loadMore}
        onRefresh={refresh}
        onFeedPress={handleFeedPress}
        onLike={likeFeed}
        onShare={shareFeed}
        onDownload={downloadFeed}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isRefreshing={isRefreshing}
        error={error}
        emptyTitle="No wallpapers yet"
        emptySubtitle="Check back later for beautiful wallpapers!"
        onRetry={retry}
        autoPlayVideo={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingBottom: contentPadding
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Same cream background as home screen
  },
  headerSection: {
    backgroundColor: '#FFF8F0',
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
  subtitleContainer: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
  },
});