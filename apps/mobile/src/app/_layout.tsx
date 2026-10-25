import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TrackerProvider } from '../lib/provider';
import { colors } from '../components/ui';
export default function Layout() {
  return <SafeAreaProvider><TrackerProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="workout" options={{ title: 'Your workout' }} />
    <Stack.Screen name="account" options={{ title: 'Account & sync' }} />
  </Stack></TrackerProvider></SafeAreaProvider>;
}
