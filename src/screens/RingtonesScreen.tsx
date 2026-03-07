import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import RingtoneFeedCard from '@/components/molecules/RingtoneFeedCard/RingtoneFeedCard';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useRingtones } from '@/features/feed/hooks/useRingtones';

interface RingtonesScreenProps {
  onBack?: () => void;
}

export default function RingtonesScreen({ onBack }: RingtonesScreenProps) {
  const {
    ringtones,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    loadRingtones,
    handleRefresh,
    handleLoadMore,
    handleLike,
    handleShare,
    handleDownload,
  } = useRingtones();

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
            Loading ringtones...
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
          No Ringtones Yet
        </Text>
        <Text variant="body" style={styles.emptySubtitle}>
          Sacred ringtones are coming soon!
        </Text>
      </View>
    );
  }, [isLoading, error, loadRingtones]);

  const keyExtractor = useCallback((item: Feed) => item.id.toString(), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        )}
        <Text variant="h3" style={styles.headerTitle}>
          Sacred Ringtones
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Ringtones List */}
      <FlatList
        data={ringtones}
        renderItem={renderRingtone}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    paddingBottom: 100,
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
});
