import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/theme';
import { StopFraudaBrand } from '../../components/StopFraudaBrand';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          elevation: 2,
        },
        headerShadowVisible: false,
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: Colors.textPrimary,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Shield',
          headerTitle: () => (
            <StopFraudaBrand suffix="Shield" fontSize={18} />
          ),
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
