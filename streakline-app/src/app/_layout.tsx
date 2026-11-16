import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '../state/store';
import { c } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: c.bg }}>
      <StoreProvider>
        <AppStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const { ready } = useStore();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: c.bg },
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="focus" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="tracker/new" options={{ presentation: 'modal', title: 'New tracker' }} />
        <Stack.Screen name="tracker/[id]" options={{ title: '' }} />
        <Stack.Screen name="space/new" options={{ presentation: 'modal', title: 'New space' }} />
        <Stack.Screen name="space/[id]" options={{ title: '' }} />
        <Stack.Screen name="block/new" options={{ presentation: 'modal', title: 'Add to space' }} />
        <Stack.Screen name="note/[id]" options={{ title: 'Note' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
        <Stack.Screen name="share/[id]" options={{ presentation: 'modal', title: 'Share streak' }} />
      </Stack>
    </>
  );
}
