import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { useAppStore } from '../src/store/appStore';
import * as SplashScreen from 'expo-splash-screen';
import notificationService, { PushNotificationData } from '../src/services/notificationService';
import callMonitorService from '../src/services/callMonitorService';
import callProtectionService from '../src/services/callProtectionService';
import apiService from '../src/services/api';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { user, loadPersistedState } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const notificationInitialized = useRef(false);

  // Initialize notifications and services
  useEffect(() => {
    const initServices = async () => {
      try {
        // Initialize notification service
        if (!notificationInitialized.current) {
          const token = await notificationService.initialize();
          console.log('Notification service initialized, token:', token ? 'received' : 'none');
          
          // Set up notification handlers
          notificationService.setOnNotificationReceived((data: PushNotificationData) => {
            console.log('Notification received in foreground:', data);
            if (data.type === 'scam_alert') {
              Alert.alert(
                'Scam Alert!',
                `Suspicious call detected from ${data.caller_number}\n${data.scam_type?.replace('_', ' ')} (${data.confidence}% confidence)`,
                [
                  { text: 'Dismiss', style: 'cancel' },
                  { 
                    text: 'View Details', 
                    onPress: () => {
                      if (data.call_id) {
                        router.push({
                          pathname: '/call-details',
                          params: { callId: data.call_id }
                        });
                      }
                    }
                  },
                ]
              );
            }
          });

          notificationService.setOnNotificationResponse((data: PushNotificationData) => {
            console.log('User tapped notification:', data);
            if (data.type === 'scam_alert' && data.call_id) {
              router.push({
                pathname: '/call-details',
                params: { callId: data.call_id }
              });
            }
          });

          notificationInitialized.current = true;
        }
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initServices();

    return () => {
      notificationService.cleanup();
    };
  }, []);

  // Initialize call monitor when user is available
  useEffect(() => {
    if (user?.id && user?.onboarding_completed) {
      const initCallMonitor = async () => {
        try {
          // Initialize call monitor service
          await callMonitorService.initialize(user.id);
          
          // Initialize call protection service (native call detection + recording)
          if (Platform.OS === 'android') {
            await callProtectionService.initialize(user.id);
            await callProtectionService.startProtection();
            console.log('Native call protection started');
          }
          
          // Register device with backend for push notifications
          const token = notificationService.getPushToken();
          if (token) {
            await notificationService.registerDeviceWithBackend(user.id, token);
          }
        } catch (error) {
          console.error('Error initializing call monitor:', error);
        }
      };
      initCallMonitor();
    }
    
    // Cleanup on unmount
    return () => {
      if (Platform.OS === 'android') {
        callProtectionService.stop();
      }
      callMonitorService.stop();
    };
  }, [user?.id, user?.onboarding_completed]);

  // Background re-sync: if user still has a local-xxx ID (onboarding sync failed),
  // retry every 30 seconds until we get a real server ID
  useEffect(() => {
    if (!user?.id?.startsWith('local-') || !user?.onboarding_completed) return;

    const { language: lang, setUser: storeSetUser } = useAppStore.getState();

    const attemptResync = async () => {
      try {
        console.log('Local user detected, attempting backend re-sync...');
        const serverUser = await apiService.createUser(user.phone, lang);
        if (user.emergency_contacts?.length > 0) {
          await apiService.addEmergencyContacts(serverUser.id, user.emergency_contacts.map(c => ({
            id: c.id, name: c.name, phone: c.phone,
          })));
        }
        const updated = await apiService.updateUser(serverUser.id, {
          onboarding_completed: true,
          is_active: true,
        });
        storeSetUser(updated);
        console.log(`Re-sync succeeded. New real ID: ${updated.id}`);
      } catch (e) {
        console.log('Re-sync attempt failed, will retry in 30s:', e);
      }
    };

    attemptResync();
    const interval = setInterval(attemptResync, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      await loadPersistedState();
      setIsReady(true);
      await SplashScreen.hideAsync();
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user?.onboarding_completed && !inAuthGroup) {
      // Redirect to onboarding if not completed
      router.replace('/onboarding/welcome');
    } else if (user?.onboarding_completed && !inTabsGroup && segments[0] !== 'call-details' && segments[0] !== 'recording-settings') {
      // Redirect to dashboard if onboarding is completed
      router.replace('/(tabs)');
    }
  }, [user, segments, isReady]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="call-details" 
          options={{ 
            headerShown: true,
            title: 'Call Details',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="recording-settings" 
          options={{ 
            headerShown: false,
            presentation: 'card'
          }} 
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
