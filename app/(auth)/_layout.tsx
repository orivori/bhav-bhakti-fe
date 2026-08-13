import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      {/* Explicit solid color, not 'transparent' - react-native-screens gives
          each pushed screen its own native surface that paints before React's
          JS tree commits into it, so a transparent contentStyle can briefly
          show the native default (often white) during a push transition. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: goldenTempleTheme.colors.background } }}>
        <Stack.Screen name="phone-login" />
        <Stack.Screen name="verify-otp" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});