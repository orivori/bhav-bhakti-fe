import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

export default function MainLayout() {
  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
      screenOptions={{
        tabBarActiveTintColor: goldenTempleTheme.colors.primary.DEFAULT, // Vibrant temple gold
        tabBarInactiveTintColor: goldenTempleTheme.colors.text.primary, // Light text for visibility
        tabBarStyle: {
          backgroundColor: 'rgba(44, 24, 16, 0.85)', // Semi-transparent warm brown
          borderTopWidth: 1,
          borderTopColor: 'rgba(218, 165, 32, 0.3)', // Golden border
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
          position: 'absolute',
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
        name="wallpapers"
        options={{
          title: 'Browse',
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
        name="mantras"
        options={{
          href: null, // Hide from tabs
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="ringtones"
        options={{
          href: null, // Hide from tabs
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="daily-status"
        options={{
          href: null, // Hide from tabs
          headerShown: false,
        }}
      />
    </Tabs>
  );
}