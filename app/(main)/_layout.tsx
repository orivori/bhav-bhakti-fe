import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spiritualTheme } from '@/styles/spiritualTheme';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: spiritualTheme.colors.primary.DEFAULT, // Vibrant temple orange
        tabBarInactiveTintColor: spiritualTheme.colors.text.secondary, // Muted text
        tabBarStyle: {
          backgroundColor: spiritualTheme.colors.backgrounds.card, // Deep purple card
          borderTopWidth: 1,
          borderTopColor: spiritualTheme.colors.border, // Orange border with transparency
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
          ...spiritualTheme.shadows.md, // Add temple glow effect
        },
        headerStyle: {
          backgroundColor: spiritualTheme.colors.backgrounds.card,
        },
        headerTintColor: spiritualTheme.colors.text.primary,
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
        name="spiritual"
        options={{
          title: 'Spiritual',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size}) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
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
    </Tabs>
  );
}