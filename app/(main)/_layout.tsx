import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D4824A', // Orange color to match design
        tabBarInactiveTintColor: '#666666', // Darker gray for inactive items
        tabBarStyle: {
          backgroundColor: '#fff6da', // Cream background to match app theme
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
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <SvgUri
              uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/home_icon.svg"
              width={size}
              height={size}
              fill={focused ? '#D4824A' : '#666666'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mantras"
        options={{
          title: 'Mantra',
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <SvgUri
              uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/mantra_icon.svg"
              width={size}
              height={size}
              fill={focused ? '#D4824A' : '#666666'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ringtones"
        options={{
          title: 'Ringtone',
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <SvgUri
              uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/ringtone_icon.svg"
              width={size}
              height={size}
              fill={focused ? '#D4824A' : '#666666'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="daily-status"
        options={{
          title: 'Status',
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <SvgUri
              uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/status_icon.svg"
              width={size}
              height={size}
              fill={focused ? '#D4824A' : '#666666'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: 'Rashifal',
          headerShown: false,
          tabBarIcon: ({ size, focused }) => (
            <SvgUri
              uri="https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/sun_icon.svg"
              width={size}
              height={size}
              fill={focused ? '#D4824A' : '#666666'}
            />
          ),
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
        name="wallpaper-detail"
        options={{
          href: null, // Hide from tabs
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
        name="mantra-quiz"
        options={{
          href: null, // Hide from tabs - only accessible from mantras page
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
  );
}
