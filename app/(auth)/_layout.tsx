import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="language-onboarding" />
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