import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import MiniPlayer from '@/components/molecules/MiniPlayer';
import HomeIcon from '../../assets/icons/home.svg';
import MantraIcon from '../../assets/icons/om.svg';
import AudioIcon from '../../assets/icons/audio.svg';
import WallpapersIcon from '../../assets/icons/sun_solid.svg';
import StoriesIcon from '../../assets/icons/stories.svg';
import { logFirstNavigationChoiceIfNewUser } from '@/utils/analytics/activationEvents';
import { logHeroMenuClicked } from '@/utils/analytics/engagementEvents';
import { resolvePendingAppReopened } from '@/utils/analytics/retentionEvents';

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B00', // Orange color to match design
        tabBarInactiveTintColor: '#666666', // Darker gray for inactive items
        tabBarStyle: {
          backgroundColor: goldenTempleTheme.colors.background, // Cream background to match app theme
          borderTopWidth: 1,
          borderTopColor: 'rgba(139, 115, 85, 0.3)', // Light border
          paddingBottom: Math.max(insets.bottom, 8), // Safe area padding
          paddingTop: 8,
          height: Math.max(75 + insets.bottom, 83), // Slightly reduced height
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: goldenTempleTheme.colors.text.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title'),
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <HomeIcon
              width={size}
              height={size}
              fill={focused ? '#FF6B00' : '#666666'}
            />
          ),
        }}
        listeners={{ tabPress: () => logHeroMenuClicked({ tab_name: 'home' }) }}
      />
      <Tabs.Screen
        name="mantras"
        options={{
          title: t('tabs.mantra'),
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <MantraIcon
              width={size}
              height={size}
              fill={focused ? '#FF6B00' : '#666666'}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            logHeroMenuClicked({ tab_name: 'mantra' });
            logFirstNavigationChoiceIfNewUser('mantra');
            resolvePendingAppReopened('mantra');
          },
        }}
      />
      <Tabs.Screen
        name="ringtones"
        options={{
          title: t('tabs.audio'),
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <AudioIcon
              width={size}
              height={size}
              fill={focused ? '#FF6B00' : '#666666'}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            logHeroMenuClicked({ tab_name: 'audio' });
            logFirstNavigationChoiceIfNewUser('audio');
            resolvePendingAppReopened('audio');
          },
        }}
      />
      <Tabs.Screen
        name="daily-status"
        options={{
          title: t('tabs.wallpapers'),
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <WallpapersIcon
              width={size}
              height={size}
              fill={focused ? '#FF6B00' : '#666666'}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            logHeroMenuClicked({ tab_name: 'wallpapers' });
            logFirstNavigationChoiceIfNewUser('wallpapers');
            resolvePendingAppReopened('wallpapers');
          },
        }}
      />
      {/* Stories took Rashifal's tab slot (Bhav_Bhakti_Stories_Plan.md,
          section 6). Rashifal's screens stay, hidden below: Home's Rashifal
          quick link and daily-horoscope card, and the daily push, still
          open them. */}
      <Tabs.Screen
        name="stories"
        options={{
          title: t('tabs.stories'),
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <StoriesIcon
              width={size}
              height={size}
              fill={focused ? '#FF6B00' : '#666666'}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            logHeroMenuClicked({ tab_name: 'stories' });
            logFirstNavigationChoiceIfNewUser('stories');
            resolvePendingAppReopened('stories');
          },
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          href: null, // No longer a tab (Stories took its slot) - opened from Home
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="story-series"
        options={{
          href: null, // Hide from tabs - opened from a series tile on Stories
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tabs but keep for navigation
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null, // Hide from tabs but keep for navigation
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="legal-document"
        options={{
          href: null, // Hide from tabs - only accessible from Profile
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="delete-account"
        options={{
          href: null, // Hide from tabs - only accessible from Profile
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="wallpapers"
        options={{
          href: null, // Hide from tabs but keep for navigation
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="spiritual"
        options={{
          href: null, // Hide from tabs but keep for navigation
        }}
      />
      <Tabs.Screen
        name="zodiac-selection"
        options={{
          href: null, // Hide from tabs
           headerShown: false,
        }}
      />
      <Tabs.Screen
        name="horoscope-detail"
        options={{
          href: null, // Hide from tabs
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="audio-player"
        options={{
          href: null, // Hide from tabs
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search-results"
        options={{
          href: null, // Hide from tabs
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="choose-start"
        options={{
          href: null, // Hide from tabs - only accessible via navigation
          headerShown: false,
        }}
      />

    </Tabs>
    <MiniPlayer />
    </>
  );
}
