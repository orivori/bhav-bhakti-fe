import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#C0392B', // Red accent color to match design
        tabBarInactiveTintColor: '#8B7355', // Medium brown for inactive items
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // Fully opaque white background
          borderTopWidth: 1,
          borderTopColor: 'rgba(139, 115, 85, 0.2)', // Light brown border
          paddingBottom: Math.max(insets.bottom, 8), // Safe area padding
          paddingTop: 12,
          height: Math.max(80 + insets.bottom, 88), // Dynamic height with safe area
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mantras"
        options={{
          title: 'Mantra',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ringtones"
        options={{
          title: 'Ringtone',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="daily-status"
        options={{
          title: 'Status',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: 'Rashifal',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" size={size} color={color} />
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
