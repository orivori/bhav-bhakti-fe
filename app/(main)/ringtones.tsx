import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItemInfo,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '@/components/atoms';
import RingtoneFeedCard from '@/components/molecules/RingtoneFeedCard/RingtoneFeedCard';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useFeed } from '@/features/feed/hooks/useFeed';
import { useDeities } from '@/features/feed/hooks/useDeities';
import { DeityCard } from '@/components/molecules/DeityCard';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useTranslation } from '@/hooks/useTranslation';
import type { Deity } from '@/features/feed/hooks/useDeities';
import * as Haptics from 'expo-haptics';

// Isolated Search Component to prevent keyboard disappearing
const IsolatedSearchBar = ({ onSearchSubmit, currentLanguage }: {
  onSearchSubmit: (query: string) => void;
  currentLanguage: string;
}) => {
  const [localSearchText, setLocalSearchText] = React.useState('');

  const handleSubmit = () => {
    onSearchSubmit(localSearchText.trim());
  };

  return (
    <View style={styles.searchContainer}>
      <Ionicons
        name="search-outline"
        size={20}
        color="#333333"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder={currentLanguage === 'hi' ? 'रिंगटोन खोजें...' : 'Search ringtones...'}
        placeholderTextColor="#8B7355"
        value={localSearchText}
        onChangeText={setLocalSearchText}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor="#D4824A"
      />
    </View>
  );
};

export default function RingtonesPage() {
  const { contentPadding } = useTabBarHeight();
  const { language: currentLanguage } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeity, setSelectedDeity] = useState<Deity | null>(null);

  // Fetch deities for filter
  const {
    data: deities = [],
    isLoading: deitiesLoading,
    error: deitiesError,
  } = useDeities({ type: 'ringtone' });

  // Stop other audio when this screen becomes focused, and stop ringtones when leaving
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎵 Ringtones screen focused - stopping other audio');

      // Access global audio manager to stop other audio (mantras)
      if (global.globalAudioSessionManager) {
        // Only stop main audio (mantras), not ringtones
        if (global.globalAudioSessionManager.currentSound) {
          global.globalAudioSessionManager.stopCurrentAudio('ringtones');
        }
      }

      return () => {
        console.log('🎵 Ringtones screen unfocused - stopping all ringtones');
        // Stop all ringtones when leaving the screen
        if (global.globalAudioSessionManager) {
          global.globalAudioSessionManager.stopAllRingtones();
        }
      };
    }, [])
  );
  // Build filters for ringtone feeds
  const feedFilters: any = { type: 'ringtone' as const };
  if (selectedDeity) {
    feedFilters.deityId = selectedDeity.id;
  }
  if (searchQuery && searchQuery.trim()) {
    feedFilters.search = searchQuery.trim();
  }

  const {
    feeds: ringtones,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    retry: loadRingtones,
    refresh: handleRefresh,
    loadMore: handleLoadMore,
    likeFeed: handleLike,
    shareFeed: handleShare,
    downloadFeed: handleDownload,
  } = useFeed({
    limit: 10,
    filters: feedFilters,
  });

  const handleSearchSubmit = (query: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(query);
  };

  const handleDeityPress = useCallback((deity: Deity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDeity(selectedDeity?.id === deity.id ? null : deity);
  }, [selectedDeity]);

  const renderDeityCard = ({ item }: { item: Deity }) => (
    <DeityCard
      deity={item}
      isSelected={selectedDeity?.id === item.id}
      onPress={handleDeityPress}
      language={currentLanguage}
    />
  );


  const renderRingtone = useCallback(({ item: ringtone }: ListRenderItemInfo<Feed>) => (
    <RingtoneFeedCard
      key={ringtone.id}
      feed={ringtone}
      onLike={handleLike}
      onShare={handleShare}
      onDownload={handleDownload}
    />
  ), [handleLike, handleShare, handleDownload]);

  const renderFooter = useCallback(() => {
    if (!hasMore) {
      return (
        <View style={styles.endMessage}>
          <Text variant="caption" style={styles.endText}>
            🎵 You've heard all the ringtones! 🎵
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="caption" style={styles.loadingText}>
            Loading more ringtones...
          </Text>
        </View>
      );
    }

    return <View style={styles.footerSpacing} />;
  }, [hasMore, isLoadingMore]);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="body" style={styles.loadingText}>
            Loading sacred ringtones...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="musical-notes-outline" size={48} color="#FF6B35" />
          </View>
          <Text variant="h4" style={styles.errorTitle}>
            Oops! Something went wrong
          </Text>
          <Text variant="body" style={styles.errorMessage}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRingtones()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="musical-notes" size={48} color="#FF8C42" />
        </View>
        <Text variant="h4" style={styles.emptyTitle}>
          {searchQuery ? 'No Ringtones Found' : 'No Ringtones Yet'}
        </Text>
        <Text variant="body" style={styles.emptySubtitle}>
          {searchQuery ? 'Try different search terms' : 'Sacred ringtones are coming soon!'}
        </Text>
      </View>
    );
  }, [isLoading, error, loadRingtones]);


  // Prepare data with header items
  const listData = [
    { type: 'header', key: 'header' },
    { type: 'deities', key: 'deities' },
    ...ringtones.map(item => ({ type: 'ringtone', key: item.id.toString(), data: item }))
  ];

  const renderItem = ({ item, index }: any) => {
    if (item.type === 'header') {
      return (
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <Text style={styles.appTitle}>Bhav Bhakti</Text>
            <TouchableOpacity
              style={styles.profileAvatar}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/profile');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <IsolatedSearchBar
            onSearchSubmit={handleSearchSubmit}
            currentLanguage={currentLanguage}
          />
        </View>
      );
    }

    if (item.type === 'deities') {
      return (
        <View style={styles.stickySection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: goldenTempleTheme.spacing.lg }]}>
            {currentLanguage === 'hi' ? 'अपने भगवान को चुनें' : 'Choose your God'}
          </Text>

          {deitiesLoading ? (
            <View style={styles.loadingContainer}>
              <Text color="secondary">Loading deities...</Text>
            </View>
          ) : deitiesError ? (
            <View style={styles.errorContainer}>
              <Text color="secondary">Failed to load deities</Text>
            </View>
          ) : (
            <View style={styles.fullWidthDeityContainer}>
              <FlatList
                data={deities}
                renderItem={renderDeityCard}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.deitiesList}
                style={styles.deityList}
              />
            </View>
          )}
        </View>
      );
    }

    // Ringtone item
    return (
      <View style={styles.ringtoneItemContainer}>
        {renderRingtone({
          item: item.data,
          index: index - 2,
          separators: {
            highlight: () => {},
            unhighlight: () => {},
            updateProps: () => {}
          }
        } as any)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        stickyHeaderIndices={[1]} // Make the deities section sticky
        style={styles.list}
        contentContainerStyle={[
          { paddingBottom: contentPadding },
          ringtones.length === 0 && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.7}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        updateCellsBatchingPeriod={16}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da',
  },
  headerSection: {
    backgroundColor: '#fff6da',
  },
  stickySection: {
    backgroundColor: '#fff6da',
    paddingTop: goldenTempleTheme.spacing.xs,
    paddingBottom: goldenTempleTheme.spacing.md,
    width: '100%',
    alignSelf: 'stretch',
  },
  fullWidthDeityContainer: {
    width: '100%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingTop: goldenTempleTheme.spacing.lg,
    paddingBottom: 4,
    minHeight: 60,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 28,
    includeFontPadding: false,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4824A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: goldenTempleTheme.spacing.lg,
    marginVertical: goldenTempleTheme.spacing.sm,
    borderWidth: 1,
    borderColor: '#D4C4A8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
    padding: 0,
    margin: 0,
    height: 20,
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    
  },
  emptyContainer: {
    flexGrow: 1,
    
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  footerSpacing: {
    height: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
  },
  endMessage: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#8E8E93',
    fontSize: 14,
  },
  // Empty State
  emptyIcon: {
    width: 100,
    height: 100,
    backgroundColor: '#FFF5F0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 280,
    color: '#8E8E93',
    lineHeight: 22,
  },
  // Error State
  errorIcon: {
    width: 100,
    height: 100,
    backgroundColor: '#FFF5F0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  errorMessage: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
    color: '#8E8E93',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  // Deities Section
  section: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingBottom: goldenTempleTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  loadingContainer: {
    padding: goldenTempleTheme.spacing.lg,
    alignItems: 'center',
  },
  errorContainer: {
    padding: goldenTempleTheme.spacing.lg,
    alignItems: 'center',
  },
  deitiesList: {
    // paddingLeft: 0,
    // paddingRight: goldenTempleTheme.spacing.sm,
    // paddingVertical: 0,
    // gap: 1,
  },
  deityList: {
    marginTop: 0,
    marginLeft: 0,
    width: '100%',
  },
  ringtoneItemContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});