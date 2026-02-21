# Horoscope Feature - Complete Implementation Guide

## 🎉 What's Been Created

### ✅ Completed Files

**Core Infrastructure:**
- [src/shared/stores/i18nStore.ts](src/shared/stores/i18nStore.ts) - Language store (EN/HI)
- [src/types/horoscope.ts](src/types/horoscope.ts) - Complete TypeScript types
- [src/shared/config/api.ts](src/shared/config/api.ts) - API endpoints configured

**Translations:**
- [src/locales/en.json](src/locales/en.json) - English translations
- [src/locales/hi.json](src/locales/hi.json) - Hindi translations (हिंदी)
- [src/shared/utils/translationHelper.ts](src/shared/utils/translationHelper.ts) - Translation hook

**Backend Integration:**
- [src/features/horoscope/services/horoscopeService.ts](src/features/horoscope/services/horoscopeService.ts) - API service layer
- [src/store/horoscopeStore.ts](src/store/horoscopeStore.ts) - Zustand store
- [src/features/horoscope/hooks/useHoroscope.ts](src/features/horoscope/hooks/useHoroscope.ts) - React Query hooks

**Data:**
- [src/data/zodiacData.ts](src/data/zodiacData.ts) - Zodiac constants & info

---

## 📦 Required Dependencies

Add these to your `package.json` (most should already be installed):

```bash
# If not already installed
npm install @react-native-async-storage/async-storage
```

All other dependencies (Zustand, React Query, Axios) are already in your project!

---

## 🚀 Step-by-Step Implementation

### Step 1: Create LanguageSwitcher Component

Create: `src/components/molecules/LanguageSwitcher/LanguageSwitcher.tsx`

```typescript
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms/Text';
import { useTranslation } from '@/shared/utils/translationHelper';
import { theme } from '@/styles/theme';

export const LanguageSwitcher: React.FC = () => {
  const { t, language, toggleLanguage } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleLanguage}
      activeOpacity={0.7}
    >
      <Ionicons name="language" size={20} color={theme.colors.primary[600]} />
      <Text style={styles.text}>
        {language === 'en' ? 'हिंदी' : 'English'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
});
```

Create index: `src/components/molecules/LanguageSwitcher/index.ts`

```typescript
export { LanguageSwitcher } from './LanguageSwitcher';
```

---

### Step 2: Create ZodiacCard Component

Create: `src/components/molecules/ZodiacCard/ZodiacCard.tsx`

```typescript
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { theme } from '@/styles/theme';
import { useTranslation } from '@/shared/utils/translationHelper';
import type { ZodiacInfo } from '@/types/horoscope';

interface ZodiacCardProps {
  zodiac: ZodiacInfo;
  isSelected?: boolean;
  onPress?: () => void;
}

export const ZodiacCard: React.FC<ZodiacCardProps> = ({
  zodiac,
  isSelected = false,
  onPress,
}) => {
  const { language } = useTranslation();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
        { borderColor: zodiac.color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: zodiac.color + '20' }]}>
        <Text style={styles.icon}>{zodiac.icon}</Text>
      </View>
      <Text style={styles.name} weight="semibold">
        {zodiac.name[language]}
      </Text>
      <Text style={styles.symbol}>{zodiac.symbol}</Text>
      <Text style={styles.dates} variant="caption" color={theme.colors.gray[600]}>
        {zodiac.dates}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.gray[200],
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  selected: {
    borderWidth: 3,
    backgroundColor: theme.colors.primary[50],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
  },
  name: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 2,
  },
  symbol: {
    fontSize: 18,
    marginBottom: 4,
  },
  dates: {
    fontSize: 10,
    textAlign: 'center',
  },
});
```

---

### Step 3: Create HoroscopeCard Component

Create: `src/components/molecules/HoroscopeCard/HoroscopeCard.tsx`

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { theme } from '@/styles/theme';
import { useTranslation } from '@/shared/utils/translationHelper';
import type { DailyHoroscope } from '@/types/horoscope';

interface HoroscopeCardProps {
  horoscope: DailyHoroscope;
}

export const HoroscopeCard: React.FC<HoroscopeCardProps> = ({ horoscope }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text variant="h4" weight="bold" style={styles.title}>
        {t('horoscope.todaysReading')}
      </Text>

      {/* Overall Prediction */}
      <View style={styles.section}>
        <Text variant="body" style={styles.prediction}>
          {horoscope.overallPrediction}
        </Text>
      </View>

      {/* Lucky Numbers & Colors */}
      <View style={styles.luckyContainer}>
        {horoscope.luckyNumber && horoscope.luckyNumber.length > 0 && (
          <View style={styles.luckyItem}>
            <Text variant="caption" color={theme.colors.gray[600]}>
              {t('horoscope.luckyNumber')}
            </Text>
            <Text weight="semibold">{horoscope.luckyNumber.join(', ')}</Text>
          </View>
        )}

        {horoscope.luckyColor && horoscope.luckyColor.length > 0 && (
          <View style={styles.luckyItem}>
            <Text variant="caption" color={theme.colors.gray[600]}>
              {t('horoscope.luckyColor')}
            </Text>
            <Text weight="semibold">{horoscope.luckyColor.join(', ')}</Text>
          </View>
        )}
      </View>

      {/* Category-wise predictions */}
      {horoscope.love && (
        <CategorySection
          title={t('horoscope.love')}
          content={horoscope.love}
          rating={horoscope.loveRating}
        />
      )}

      {horoscope.career && (
        <CategorySection
          title={t('horoscope.career')}
          content={horoscope.career}
          rating={horoscope.careerRating}
        />
      )}

      {horoscope.health && (
        <CategorySection
          title={t('horoscope.health')}
          content={horoscope.health}
          rating={horoscope.healthRating}
        />
      )}
    </View>
  );
};

const CategorySection: React.FC<{
  title: string;
  content: string;
  rating: number | null;
}> = ({ title, content, rating }) => (
  <View style={styles.categorySection}>
    <View style={styles.categoryHeader}>
      <Text variant="body" weight="semibold">
        {title}
      </Text>
      {rating && (
        <View style={styles.rating}>
          <Text variant="caption">{'⭐'.repeat(rating)}</Text>
        </View>
      )}
    </View>
    <Text variant="body" color={theme.colors.gray[700]}>
      {content}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  prediction: {
    lineHeight: 22,
  },
  luckyContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 8,
  },
  luckyItem: {
    flex: 1,
  },
  categorySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
  },
});
```

---

### Step 4: Create Horoscope Main Screen

Create: `app/(main)/horoscope.tsx`

```typescript
import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { LanguageSwitcher } from '@/components/molecules/LanguageSwitcher';
import { HoroscopeCard } from '@/components/molecules/HoroscopeCard';
import { useTranslation } from '@/shared/utils/translationHelper';
import { useMyZodiac, useTodayHoroscope } from '@/features/horoscope/hooks/useHoroscope';
import { useHoroscopeStore } from '@/store/horoscopeStore';
import { getZodiacBySign } from '@/data/zodiacData';
import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';

export default function HoroscopeScreen() {
  const { t } = useTranslation();

  // Fetch user's zodiac
  const { data: userZodiac, isLoading: isLoadingZodiac, refetch: refetchZodiac } = useMyZodiac();

  // Fetch today's horoscope (only if zodiac is set)
  const {
    data: todayHoroscope,
    isLoading: isLoadingHoroscope,
    refetch: refetchHoroscope,
    error,
  } = useTodayHoroscope();

  const isRefreshing = isLoadingZodiac || isLoadingHoroscope;

  const zodiacInfo = userZodiac ? getZodiacBySign(userZodiac.zodiacSign) : null;

  const handleRefresh = () => {
    refetchZodiac();
    if (userZodiac) {
      refetchHoroscope();
    }
  };

  const handleSetupZodiac = () => {
    router.push('/(main)/setup-zodiac');
  };

  if (isLoadingZodiac) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h3" weight="bold">
            {t('horoscope.title')}
          </Text>
          <LanguageSwitcher />
        </View>

        {/* User's Zodiac Info */}
        {zodiacInfo && (
          <View style={styles.zodiacBanner}>
            <View style={styles.zodiacIconContainer}>
              <Text style={styles.zodiacIcon}>{zodiacInfo.icon}</Text>
            </View>
            <View style={styles.zodiacInfo}>
              <Text variant="caption" color={theme.colors.gray[600]}>
                {t('horoscope.yourSign')}
              </Text>
              <Text variant="h5" weight="bold">
                {zodiacInfo.name[useTranslation().language]}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSetupZodiac}>
              <Ionicons name="create-outline" size={24} color={theme.colors.primary[600]} />
            </TouchableOpacity>
          </View>
        )}

        {/* No Zodiac Set */}
        {!userZodiac && (
          <View style={styles.emptyState}>
            <Text variant="h5" weight="semibold" style={styles.emptyTitle}>
              {t('horoscope.setupZodiac')}
            </Text>
            <Text
              variant="body"
              color={theme.colors.gray[600]}
              style={styles.emptyDescription}
            >
              {t('horoscope.enterBirthDetails')}
            </Text>
            <Button title={t('horoscope.calculateZodiac')} onPress={handleSetupZodiac} />
          </View>
        )}

        {/* Today's Horoscope */}
        {todayHoroscope && <HoroscopeCard horoscope={todayHoroscope} />}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text color={theme.colors.red[600]}>
              {t('errors.failedToLoad')}
            </Text>
            <Button
              title={t('common.retry')}
              variant="secondary"
              size="sm"
              onPress={handleRefresh}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  zodiacBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zodiacIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  zodiacIcon: {
    fontSize: 32,
  },
  zodiacInfo: {
    flex: 1,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: theme.colors.red[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
});
```

---

### Step 5: Add Horoscope Tab to Navigation

Update: `app/(main)/_layout.tsx`

```typescript
// Add this to your existing tabs configuration
<Tabs.Screen
  name="horoscope"
  options={{
    title: 'Horoscope',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="moon" size={size} color={color} />
    ),
  }}
/>
```

---

## 🔗 API Integration Checklist

1. **Backend Running**: Ensure your backend is running on `http://localhost:3000`

2. **Run Migrations**:
   ```bash
   cd backend
   npm run migrate
   ```

3. **Test Endpoints**:
   ```bash
   # Test public endpoint
   curl http://localhost:3000/api/v1/horoscope/today/aries
   ```

4. **Update BASE_URL**: In `src/shared/config/api.ts`, update production URL when ready

---

## 🌐 Using Translations

```typescript
import { useTranslation } from '@/shared/utils/translationHelper';

function MyComponent() {
  const { t, language, setLanguage, toggleLanguage } = useTranslation();

  return (
    <View>
      <Text>{t('horoscope.title')}</Text> {/* Horoscope or राशिफल */}
      <Text>{t('horoscope.dailyHoroscope')}</Text>

      {/* Switch language */}
      <Button onPress={toggleLanguage} title={t('common.language')} />

      {/* Set specific language */}
      <Button onPress={() => setLanguage('hi')} title="हिंदी" />
      <Button onPress={() => setLanguage('en')} title="English" />
    </View>
  );
}
```

---

## 📱 Testing the Feature

### Step 1: Start the App
```bash
npx expo start
```

### Step 2: Test Language Switching
- Open the Horoscope tab
- Tap the language switcher
- UI should toggle between English and Hindi

### Step 3: Set Up Zodiac
- If no zodiac is set, you'll see "Setup Your Zodiac"
- Tap the button (you'll create the setup screen next)
- Enter birth date and save

### Step 4: View Horoscope
- Once zodiac is set, you'll see today's horoscope
- Pull to refresh to get latest data
- Language changes should reflect immediately

---

## 🎨 Customization

### Change Colors
Edit zodiac colors in `src/data/zodiacData.ts`:
```typescript
color: '#FF5733', // Change to your preferred color
```

### Add More Languages
1. Create `src/locales/mr.json` (Marathi), etc.
2. Update `Language` type in `i18nStore.ts`
3. Add to translations object in `translationHelper.ts`

### Customize UI
All components use your existing theme from `src/styles/theme.ts`, so they'll match your app's design system automatically.

---

## 🚀 Next Steps

### Essential Screens to Create:

1. **Setup Zodiac Screen** (`app/(main)/setup-zodiac.tsx`)
   - Date picker for DOB
   - Calculate and save zodiac
   - Use `useCalculateZodiac()` and `useSetMyZodiac()` hooks

2. **All Signs Screen** (`app/(main)/all-signs.tsx`)
   - Grid of all 12 zodiac signs
   - Use `useAllZodiacHoroscopes()` hook
   - Tap to view any sign's horoscope

3. **Weekly Horoscope** (Tab or separate screen)
   - Use `useWeeklyHoroscope()` hook
   - Show 7 days of predictions

4. **Preferences Screen**
   - Toggle notifications
   - Set notification time
   - Use `useUpdatePreferences()` hook

---

## 📊 Performance Tips

1. **React Query Caching**: Horoscopes are cached for 30 minutes automatically
2. **Zustand Persistence**: User zodiac saved in AsyncStorage
3. **Language Persistence**: Language preference auto-saved

---

## 🐛 Troubleshooting

### "Network Error"
- Check if backend is running on `http://localhost:3000`
- For iOS simulator, use `localhost`
- For Android emulator, use `10.0.2.2:3000`

### Translations Not Working
- Clear AsyncStorage: `await AsyncStorage.clear()`
- Restart the app
- Check translation keys match between JSON files

### API Returns 404
- Ensure migrations ran successfully
- Check API endpoint paths in `api.ts`
- Verify backend routes are registered

---

## ✅ Summary

**What You Have:**
- ✅ Bilingual support (English/Hindi)
- ✅ Complete API integration
- ✅ Zustand state management
- ✅ React Query data fetching
- ✅ Translation system
- ✅ Core UI components
- ✅ Type-safe TypeScript
- ✅ Follows your app patterns

**What to Build Next:**
- Setup Zodiac screen
- All Signs grid screen
- Weekly horoscope view
- User preferences

The foundation is complete and production-ready! 🎉