import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0F172A',
        },
        headerTintColor: '#F8FAFC',
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Shield',
          headerTitle: 'StopFrauda Shield',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>🛡️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Call Logs',
          headerTitle: 'Screened Calls',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Preferences & Plan',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
