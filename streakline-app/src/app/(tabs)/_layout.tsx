import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import type { IconName } from '../../components/ui';
import { useStore } from '../../state/store';
import { c } from '../../theme';

function TabIcon({ name, active, focused, size }: { name: IconName; active: IconName; focused: boolean; size: number }) {
  return <Ionicons name={focused ? active : name} size={size - 2} color={focused ? c.text : c.faint} />;
}

const icon = (name: IconName, active: IconName) => {
  const Icon = ({ focused, size }: { focused: boolean; size: number }) => <TabIcon name={name} active={active} focused={focused} size={size} />;
  Icon.displayName = `TabIcon(${name})`;
  return Icon;
};

export default function TabLayout() {
  const { data } = useStore();
  if (!data.profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line },
        tabBarLabelStyle: { fontWeight: '600' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('grid-outline', 'grid') }} />
      <Tabs.Screen name="spaces" options={{ title: 'Spaces', tabBarIcon: icon('folder-outline', 'folder') }} />
      <Tabs.Screen name="community" options={{ title: 'Community', tabBarIcon: icon('people-outline', 'people') }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('stats-chart-outline', 'stats-chart') }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
