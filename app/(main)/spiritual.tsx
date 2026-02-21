import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

import { Text } from '@/components/atoms';
import { mockSpiritualContent } from '@/data/mockSpiritual';
import { ContentType, Language } from '@/types/spiritual';
import { usePremiumStore } from '@/store/premiumStore';
import { useTranslation } from '@/hooks/useTranslation';

export default function SpiritualScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ContentType | 'All'>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | 'All'>('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t, language } = useTranslation();

  const types: Array<ContentType | 'All'> = ['All', 'Aarti', 'Bhajan', 'Mantra'];
  const languages: Array<Language | 'All'> = ['All', 'Hindi', 'Sanskrit', 'English'];

  const getTypeName = (type: ContentType | 'All') => {
    const typeMap: Record<ContentType | 'All', string> = {
      'All': t('spiritual.allTypes'),
      'Aarti': t('spiritual.aarti'),
      'Bhajan': t('spiritual.bhajan'),
      'Mantra': t('spiritual.mantra'),
    };
    return typeMap[type];
  };

  const getLanguageName = (lang: Language | 'All') => {
    const langMap: Record<Language | 'All', string> = {
      'All': t('spiritual.allLanguages'),
      'Hindi': t('spiritual.hindi'),
      'Sanskrit': t('spiritual.sanskrit'),
      'English': t('spiritual.english'),
      'Marathi': t('spiritual.marathi'),
      'Bengali': t('spiritual.bengali'),
      'Tamil': t('spiritual.tamil'),
    };
    return langMap[lang];
  };

  const filteredContent = useMemo(() => {
    return mockSpiritualContent.filter((content) => {
      const matchesSearch =
        searchQuery.length === 0 ||
        content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.deity?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === 'All' || content.type === selectedType;
      const matchesLanguage =
        selectedLanguage === 'All' || content.language === selectedLanguage;

      return matchesSearch && matchesType && matchesLanguage;
    });
  }, [searchQuery, selectedType, selectedLanguage]);

  const handlePlayPause = async (content: any) => {
    if (content.isPremium && !isPremium) {
      setShowPaywall(true);
      return;
    }

    try {
      if (playingId === content.id) {
        // Stop playing
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingId(null);
      } else {
        // Stop previous sound if any
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }

        // Play new sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: content.audioUrl },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setPlayingId(content.id);

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setPlayingId(null);
          }
        });
      }
    } catch (error) {
      Alert.alert(t('spiritual.playbackError'), t('spiritual.failedToPlay'));
    }
  };

  const renderContentCard = (content: any) => {
    const isPlaying = playingId === content.id;

    return (
      <TouchableOpacity
        key={content.id}
        style={styles.contentCard}
        onPress={() => handlePlayPause(content)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: content.thumbnailUrl }} style={styles.thumbnail} />

        {/* Play Button Overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#fff"
            />
          </View>
        </View>

        {content.isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={10} color="#fbbf24" />
          </View>
        )}

        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
              <Text variant="caption" style={styles.typeText}>
                {content.type}
              </Text>
            </View>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={12} color="#6b7280" />
              <Text variant="caption" color="secondary">
                {content.duration}
              </Text>
            </View>
          </View>

          <Text variant="body" weight="semibold" style={styles.cardTitle} numberOfLines={2}>
            {content.title}
          </Text>

          {content.deity && (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {content.deity}
            </Text>
          )}

          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <Ionicons name="headset-outline" size={14} color="#9ca3af" />
              <Text variant="caption" color="secondary">
                {(content.plays / 1000).toFixed(1)}K {t('spiritual.plays')}
              </Text>
            </View>
            <View style={styles.langBadge}>
              <Text variant="caption" color="secondary">
                {content.language}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h3" weight="bold">
          {t('spiritual.title')}
        </Text>
        <Text variant="caption" color="secondary">
          {language === 'hi' ? 'आरती, भजन और मंत्र' : 'Aartis, Bhajans & Mantras'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('spiritual.search')}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Type Filter */}
      <View style={styles.filterSection}>
        <Text variant="body" weight="semibold" style={styles.filterLabel}>
          {t('spiritual.type')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {types.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterPill,
                selectedType === type && styles.filterPillActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                variant="body"
                weight="medium"
                style={[
                  styles.filterText,
                  selectedType === type && styles.filterTextActive,
                ]}
              >
                {getTypeName(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Language Filter */}
      <View style={styles.filterSection}>
        <Text variant="body" weight="semibold" style={styles.filterLabel}>
          {t('spiritual.language')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {languages.map((language) => (
            <TouchableOpacity
              key={language}
              style={[
                styles.filterPill,
                selectedLanguage === language && styles.filterPillActive,
              ]}
              onPress={() => setSelectedLanguage(language)}
            >
              <Text
                variant="body"
                weight="medium"
                style={[
                  styles.filterText,
                  selectedLanguage === language && styles.filterTextActive,
                ]}
              >
                {getLanguageName(language)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredContent.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="#d1d5db" />
            <Text variant="h4" weight="semibold" style={styles.emptyTitle}>
              {t('spiritual.noContentFound')}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {t('spiritual.tryDifferentFilter')}
            </Text>
          </View>
        ) : (
          <View style={styles.contentGrid}>
            {filteredContent.map((content) => renderContentCard(content))}
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
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterSection: {
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  contentCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
  },
  thumbnail: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
  playOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
    borderRadius: 12,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    color: '#1e40af',
    fontWeight: '600',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
