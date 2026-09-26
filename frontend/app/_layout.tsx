import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0F172A" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0F172A',
          },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: '#0F172A',
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
