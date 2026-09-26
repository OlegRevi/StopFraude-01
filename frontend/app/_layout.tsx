import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#F8FAFC" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#1E293B',
          headerTitleStyle: {
            fontWeight: '700',
            color: '#1E293B',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: '#F8FAFC',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="permissions"
          options={{
            title: 'Permissions Setup',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="contact-picker"
          options={{
            title: 'Emergency Guardians',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            title: 'Select Protection Plan',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="setup-complete"
          options={{
            title: 'Protection Activated',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
