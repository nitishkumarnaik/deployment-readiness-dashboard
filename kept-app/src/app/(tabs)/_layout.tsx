import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useStore } from '../../state/store';
import { useColors } from '../../theme';

export default function TabLayout() {
  const c = useColors();
  const { data } = useStore();
  if (!data.profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ focused, size }) => <Ionicons name="sunny-outline" color={focused ? c.primary : c.muted} size={size} /> }}
      />
      <Tabs.Screen
        name="train"
        options={{ title: 'Train', tabBarIcon: ({ focused, size }) => <Ionicons name="barbell-outline" color={focused ? c.primary : c.muted} size={size} /> }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: 'Insights', tabBarIcon: ({ focused, size }) => <Ionicons name="stats-chart-outline" color={focused ? c.primary : c.muted} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ focused, size }) => <Ionicons name="settings-outline" color={focused ? c.primary : c.muted} size={size} /> }}
      />
    </Tabs>
  );
}
