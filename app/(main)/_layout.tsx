import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF5722', // Orange accent to match cream theme
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
          title: 'Mantras',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ringtones"
        options={{
          title: 'Ringtones',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="daily-status"
        options={{
          title: 'Status',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
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

    </Tabs>
  );
}
