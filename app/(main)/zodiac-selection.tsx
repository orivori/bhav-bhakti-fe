import React, { useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { useTranslation } from '@/hooks/useTranslation';
import { useZodiacStore } from '@/store/zodiacStore';
import { ZODIAC_SIGNS } from '@/data/zodiacData';

export default function ZodiacSelectionScreen() {
  const { t, language } = useTranslation();
  const { selectedZodiac, setZodiac, initializeZodiac } = useZodiacStore();

  useEffect(() => {
    initializeZodiac();
  }, []);

  const handleZodiacSelect = async (sign: string) => {
    await setZodiac(sign as any);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text variant="h3" weight="bold">{t('horoscope.selectZodiac')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.gridContainer}>
        {ZODIAC_SIGNS.map((zodiac) => (
          <TouchableOpacity
            key={zodiac.id}
            style={[
              styles.zodiacCard,
              selectedZodiac === zodiac.zodiacSign && styles.selectedCard,
            ]}
            onPress={() => handleZodiacSelect(zodiac.zodiacSign)}
          >
            <Text style={styles.zodiacIcon}>{zodiac.icon}</Text>
            <Text variant="body" weight="semibold" style={styles.zodiacName}>
              {language === 'hi' ? zodiac.name.hi : zodiac.name.en}
            </Text>
            <Text variant="caption" color="secondary" style={styles.zodiacDates}>
              {zodiac.dates}
            </Text>
            {selectedZodiac === zodiac.zodiacSign && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              </View>
            )}
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  zodiacCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedCard: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  zodiacIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  zodiacName: {
    marginBottom: 4,
    textAlign: 'center',
  },
  zodiacDates: {
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
