import { Stack } from 'expo-router';
import { PreferencesProvider } from '../lib/preferences';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  return <PreferencesProvider><SafeAreaProvider><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider></PreferencesProvider>;
}
