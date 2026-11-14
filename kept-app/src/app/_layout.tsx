import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotificationHandler } from '../lib/notifications';
import { StoreProvider, useStore } from '../state/store';
import { useColors } from '../theme';

configureNotificationHandler();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AppStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const c = useColors();
  const { ready } = useStore();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="session" options={{ title: 'Strength session' }} />
        <Stack.Screen name="report" options={{ title: 'Clinician summary' }} />
        <Stack.Screen name="check-in" options={{ presentation: 'modal', title: 'Daily check-in' }} />
        <Stack.Screen name="log-dose" options={{ presentation: 'modal', title: 'Log dose' }} />
        <Stack.Screen name="log-weight" options={{ presentation: 'modal', title: 'Log weight' }} />
        <Stack.Screen name="add-protein" options={{ presentation: 'modal', title: 'Add protein' }} />
      </Stack>
    </>
  );
}
