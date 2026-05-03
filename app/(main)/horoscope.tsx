import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  TextInput,
  Modal,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { ZODIAC_SIGNS } from '@/data/zodiacData';
import type { ZodiacSign } from '@/types/horoscope';
import { useZodiacCalculation } from '@/features/profile/hooks/useZodiac';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 3; // 3 columns with padding

// Isolated Search Component
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
        placeholder={currentLanguage === 'hi' ? 'अपनी राशि खोजें' : 'Search for your rashi'}
        placeholderTextColor="#8B7355"
        value={localSearchText}
        onChangeText={setLocalSearchText}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor="#D4824A"
      />
      <TouchableOpacity style={styles.micButton}>
        <Ionicons
          name="mic"
          size={18}
          color="#D4824A"
        />
      </TouchableOpacity>
    </View>
  );
};

export default function HoroscopeScreen() {
  const { language } = useTranslation();
  const { contentPadding } = useTabBarHeight();

  // Zodiac calculation hook
  const zodiacCalculation = useZodiacCalculation({
    onSuccess: (data) => {
      console.log('✅ Zodiac calculation successful:', data);

      if (data.success && data.data) {
        const { sign, rashi } = data.data;

        // Show result to user
        Alert.alert(
          language === 'hi' ? 'आपकी राशि' : 'Your Rashi',
          language === 'hi'
            ? `आपकी राशि: ${rashi}\nपश्चिमी राशि: ${sign}`
            : `Your Rashi: ${rashi}\nWestern Sign: ${sign}`,
          [
            {
              text: language === 'hi' ? 'ठीक है' : 'OK',
              onPress: () => setShowBirthModal(false)
            }
          ]
        );
      } else {
        Alert.alert(
          language === 'hi' ? 'त्रुटि' : 'Error',
          language === 'hi' ? 'राशि की गणना नहीं हो सकी' : 'Could not calculate rashi'
        );
      }
    },
    onError: (error) => {
      console.error('❌ Zodiac calculation failed:', error);
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'राशि की गणना में त्रुटि हुई' : 'Error calculating rashi'
      );
    }
  });
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacSign | null>(null);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [slideAnim] = useState(new Animated.Value(0));
  const [showDateSelectors, setShowDateSelectors] = useState(false);

  // Reset animation when modal is closed
  useEffect(() => {
    if (!showBirthModal) {
      slideAnim.setValue(0);
    }
  }, [showBirthModal, slideAnim]);

  const handleSearchSubmit = (query: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Handle search logic here
    console.log('Search for rashi:', query);
  };

  const handleZodiacPress = (zodiacSign: ZodiacSign) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedZodiac(zodiacSign);

    // Navigate directly to horoscope details
    router.push({
      pathname: '/horoscope-detail',
      params: { zodiacSign: zodiacSign }
    });
  };

  const handleContinue = () => {
    if (selectedZodiac) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: '/horoscope-detail',
        params: { zodiacSign: selectedZodiac }
      });
    }
  };

  const handleBirthDetailsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBirthModal(true);
    // Small delay to ensure modal is rendered before animation starts
    setTimeout(() => {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }, 50);
  };

  const closeBirthModal = () => {
    setShowDateSelectors(false);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setShowBirthModal(false);
      setBirthDay(null);
      setBirthMonth(null);
      setBirthYear(null);
      setBirthTime('');
      setBirthPlace('');
    });
  };

  const openDateSelector = () => {
    setShowDateSelectors(!showDateSelectors);
  };

  const formatSelectedDate = () => {
    if (!birthDay || !birthMonth || !birthYear) return '';
    const monthNames = language === 'hi'
      ? ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return `${birthDay} ${monthNames[birthMonth - 1]}, ${birthYear}`;
  };

  // Generate arrays for dropdowns
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1920; year--) {
      years.push(year);
    }
    return years;
  };

  const generateMonths = () => {
    const months = language === 'hi'
      ? ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return months.map((month, index) => ({ label: month, value: index + 1 }));
  };

  const generateDays = () => {
    if (!birthMonth || !birthYear) return Array.from({ length: 31 }, (_, i) => i + 1);

    const daysInMonth = new Date(birthYear, birthMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const isFormValid = birthDay && birthMonth && birthYear;

  const calculateRashi = () => {
    if (!isFormValid) {
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'कृपया अपनी जन्म तिथि दर्ज करें' : 'Please enter your birth date'
      );
      return;
    }

    // Format date as YYYY-MM-DD for API
    const formattedDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;

    console.log('🔮 Calculating rashi for date:', formattedDate);

    // Call the backend API
    zodiacCalculation.mutate({
      dateOfBirth: formattedDate
    });
  };

  const renderZodiacCard = ({ item }: { item: typeof ZODIAC_SIGNS[0] }) => {
    const isSelected = selectedZodiac === item.zodiacSign;

    return (
      <TouchableOpacity
        style={[
          styles.zodiacCard,
          isSelected && styles.selectedCard
        ]}
        onPress={() => handleZodiacPress(item.zodiacSign)}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          {/* Zodiac Icon */}
          <Text style={[
            styles.zodiacIcon,
            { color: isSelected ? '#FFFFFF' : '#CA3500' }
          ]}>
            {item.icon}
          </Text>

          {/* Zodiac Name */}
          <Text style={[
            styles.zodiacName,
            { color: isSelected ? '#FFFFFF' : '#CA3500' }
          ]}>
            {item.name[language as 'en' | 'hi'] || item.name.en}
          </Text>
        </View>

        {isSelected && (
          <LinearGradient
            colors={['#CA3500', '#E76A4A']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: contentPadding + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Bhav Bhakti</Text>
          <TouchableOpacity
            style={styles.profileButton}
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
          currentLanguage={language}
        />

        {/* Birth Details Link */}
        <TouchableOpacity
          style={styles.birthDetailsContainer}
          onPress={handleBirthDetailsPress}
          activeOpacity={0.7}
        >
          <Text style={styles.birthDetailsText}>
            {language === 'hi'
              ? 'अपनी राशि जानने के लिए जन्म विवरण दर्ज करें'
              : 'Enter birth details to find my rashi'}
          </Text>
        </TouchableOpacity>

        {/* Zodiac Signs Grid */}
        <FlatList
          data={ZODIAC_SIGNS}
          renderItem={renderZodiacCard}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedZodiac && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedZodiac}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedZodiac ? ['#CA3500', '#E76A4A'] : ['#CCCCCC', '#AAAAAA']}
            style={styles.continueButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[
              styles.continueButtonText,
              !selectedZodiac && styles.continueButtonTextDisabled
            ]}>
              {language === 'hi' ? 'जारी रखें' : 'Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Birth Details Modal */}
      <Modal
        visible={showBirthModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeBirthModal}
        statusBarTranslucent={false}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={closeBirthModal}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Dimensions.get('window').height, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              {/* Modal Handle */}
              <View style={styles.modalHandle} />

              {/* Keyboard Avoiding View */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Modal Content */}
                  <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {language === 'hi' ? 'अपनी राशि खोजें' : 'Find Your Rashi'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {language === 'hi' ? 'अपना जन्म विवरण दर्ज करें' : 'Enter your birth details'}
                </Text>

                {/* Date of Birth */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>
                    {language === 'hi' ? 'जन्म तिथि' : 'Date of Birth'} *
                  </Text>
                  <View style={styles.datePickerContainer}>
                    <Text style={styles.datePickerLabel}>📅 Date Picker</Text>
                  </View>
                  <TouchableOpacity style={styles.inputContainer} onPress={openDateSelector}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={language === 'hi' ? 'तारीख चुनें' : 'Select Date'}
                      placeholderTextColor="#999"
                      value={formatSelectedDate()}
                      editable={false}
                      pointerEvents="none"
                    />
                    <Ionicons name="calendar" size={20} color="#CA3500" style={styles.inputIcon} />
                  </TouchableOpacity>

                  {/* Custom Date Selector */}
                  {showDateSelectors && (
                    <View style={styles.dateSelectorsContainer}>
                      {/* Year Selector */}
                      <View style={styles.selectorColumn}>
                        <Text style={styles.selectorLabel}>
                          {language === 'hi' ? 'साल' : 'Year'}
                        </Text>
                        <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                          {generateYears().map((year) => (
                            <TouchableOpacity
                              key={year}
                              style={[
                                styles.selectorOption,
                                birthYear === year && styles.selectedOption
                              ]}
                              onPress={() => setBirthYear(year)}
                            >
                              <Text style={[
                                styles.selectorOptionText,
                                birthYear === year && styles.selectedOptionText
                              ]}>
                                {year}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Month Selector */}
                      <View style={styles.selectorColumn}>
                        <Text style={styles.selectorLabel}>
                          {language === 'hi' ? 'महीना' : 'Month'}
                        </Text>
                        <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                          {generateMonths().map((month, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.selectorOption,
                                birthMonth === month.value && styles.selectedOption
                              ]}
                              onPress={() => setBirthMonth(month.value)}
                            >
                              <Text style={[
                                styles.selectorOptionText,
                                birthMonth === month.value && styles.selectedOptionText
                              ]}>
                                {month.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Day Selector */}
                      <View style={styles.selectorColumn}>
                        <Text style={styles.selectorLabel}>
                          {language === 'hi' ? 'दिन' : 'Day'}
                        </Text>
                        <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                          {generateDays().map((day) => (
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.selectorOption,
                                birthDay === day && styles.selectedOption
                              ]}
                              onPress={() => setBirthDay(day)}
                            >
                              <Text style={[
                                styles.selectorOptionText,
                                birthDay === day && styles.selectedOptionText
                              ]}>
                                {day}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>

                {/* Time of Birth */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>
                    {language === 'hi' ? 'जन्म समय (वैकल्पिक)' : 'Time of Birth (Optional)'}
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={language === 'hi' ? 'HH:MM' : 'HH:MM'}
                      placeholderTextColor="#999"
                      value={birthTime}
                      onChangeText={setBirthTime}
                    />
                    <Ionicons name="time" size={20} color="#CA3500" style={styles.inputIcon} />
                  </View>
                  <Text style={styles.inputHelperText}>
                    {language === 'hi' ? 'अधिक सटीक भविष्यवाणी के लिए' : 'For more accurate prediction'}
                  </Text>
                </View>

                {/* Place of Birth */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>
                    {language === 'hi' ? 'जन्म स्थान (वैकल्पिक)' : 'Place of Birth (Optional)'}
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={language === 'hi' ? 'जैसे, मुंबई, महाराष्ट्र' : 'e.g., Mumbai, Maharashtra'}
                      placeholderTextColor="#999"
                      value={birthPlace}
                      onChangeText={setBirthPlace}
                    />
                    <Ionicons name="location" size={20} color="#CA3500" style={styles.inputIcon} />
                  </View>
                  <Text style={styles.inputHelperText}>
                    {language === 'hi' ? 'विस्तृत ज्योतिषीय गणना में सहायक' : 'Helps in detailed astrological calculations'}
                  </Text>
                </View>

                    {/* Calculate Button */}
                    <TouchableOpacity
                      style={[
                        styles.calculateButton,
                        (isFormValid && !zodiacCalculation.isPending) ? styles.calculateButtonEnabled : null
                      ]}
                      onPress={calculateRashi}
                      activeOpacity={0.8}
                      disabled={!isFormValid || zodiacCalculation.isPending}
                    >
                      {zodiacCalculation.isPending ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.loadingText}>
                            {language === 'hi' ? 'गणना हो रही है...' : 'Calculating...'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[
                          styles.calculateButtonText,
                          isFormValid ? styles.calculateButtonTextEnabled : null
                        ]}>
                          {language === 'hi' ? 'मेरी राशि की गणना करें' : 'Calculate my rashi'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da',
  },
  scrollView: {
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
  profileButton: {
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
  micButton: {
    marginLeft: 8,
    padding: 2,
  },
  birthDetailsContainer: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
  },
  birthDetailsText: {
    fontSize: 16,
    color: '#CA3500',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  gridContainer: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    gap: 16,
  },
  zodiacCard: {
    width: ITEM_WIDTH,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F7EBC4',
    borderWidth: 1,
    borderColor: '#D4C4A8',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#CA3500',
    borderWidth: 2,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    zIndex: 1,
  },
  zodiacIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  zodiacName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff6da',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    paddingBottom: 20,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  continueButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: '#666666',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#F7EBC4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    minHeight: '60%',
    maxHeight: '85%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CA3500',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CA3500',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#CA3500',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CA3500',
    marginBottom: 8,
  },
  datePickerContainer: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  datePickerLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CA3500',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    padding: 0,
  },
  inputIcon: {
    marginLeft: 8,
  },
  inputHelperText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
  calculateButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  calculateButtonEnabled: {
    backgroundColor: '#CA3500',
    shadowColor: '#CA3500',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
  },
  calculateButtonTextEnabled: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Custom Date Selector Styles
  dateSelectorsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CA3500',
    marginTop: 8,
    height: 200,
    overflow: 'hidden',
  },
  selectorColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CA3500',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#F7EBC4',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectorScroll: {
    flex: 1,
  },
  selectorOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#CA3500',
  },
  selectorOptionText: {
    fontSize: 14,
    color: '#333333',
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});