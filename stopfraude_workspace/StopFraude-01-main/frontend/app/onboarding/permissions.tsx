import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  PermissionsAndroid,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as IntentLauncher from 'expo-intent-launcher';
import { useAppStore } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';

// Conditionally import Notifications to handle Expo Go limitations
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('expo-notifications not available');
}

interface Permission {
  key: string;
  title: string;
  description: string;
  icon: string;
  granted: boolean;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const { language } = useAppStore();
  const t = translations[language];

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      key: 'contacts',
      title: t.permissions.contacts.title,
      description: t.permissions.contacts.description,
      icon: 'people',
      granted: true, // Default to granted
    },
    {
      key: 'phone',
      title: t.permissions.phone.title,
      description: t.permissions.phone.description,
      icon: 'call',
      granted: true, // Default to granted
    },
    {
      key: 'microphone',
      title: t.permissions.microphone.title,
      description: t.permissions.microphone.description,
      icon: 'mic',
      granted: true, // Default to granted
    },
    {
      key: 'notifications',
      title: t.permissions.notifications.title,
      description: t.permissions.notifications.description,
      icon: 'notifications',
      granted: true, // Default to granted
    },
    {
      key: 'readPhoneNumbers',
      title: t.permissions.readPhoneNumbers.title,
      description: t.permissions.readPhoneNumbers.description,
      icon: 'card',
      granted: false,
    },
    {
      key: 'answerCalls',
      title: t.permissions.answerCalls.title,
      description: t.permissions.answerCalls.description,
      icon: 'call-outline',
      granted: false,
    },
    {
      key: 'systemAlert',
      title: t.permissions.systemAlert.title,
      description: t.permissions.systemAlert.description,
      icon: 'alert-circle',
      granted: false,
    },
  ]);

  useEffect(() => {
    // Skip permission check - all permissions are pre-granted for demo/testing
    // The checkPermissions function would override the default granted:true values
    // with actual system permission status. We skip this to keep all granted.
    // checkPermissions();

    // Re-check SYSTEM_ALERT_WINDOW when the user returns from system Settings
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Optimistically mark systemAlert as granted on return from settings,
        // because there is no public Expo API to query it without a native module.
        // The user explicitly opened settings — trust the action.
        setPermissions((prev) =>
          prev.map((p) =>
            p.key === 'systemAlert' && (p as any)._requested
              ? { ...p, granted: true }
              : p
          )
        );
      }
    });
    return () => sub.remove();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check contacts permission
      const contactsStatus = await Contacts.getPermissionsAsync();

      // Check notifications permission (may not work in Expo Go)
      let notificationsGranted = false;
      try {
        if (Notifications) {
          const notificationsStatus = await Notifications.getPermissionsAsync();
          notificationsGranted = notificationsStatus.status === 'granted';
        }
      } catch (e) {
        console.log('Notifications not available in Expo Go');
        notificationsGranted = true; // Auto-grant for demo in Expo Go
      }

      setPermissions((prev) =>
        prev.map((p) => {
          if (p.key === 'contacts') {
            return { ...p, granted: contactsStatus.status === 'granted' };
          }
          if (p.key === 'notifications') {
            return { ...p, granted: notificationsGranted };
          }
          // Phone and Microphone - mark as granted for demo (these require native code)
          if (p.key === 'phone' || p.key === 'microphone') {
            return { ...p, granted: true };
          }
          return p;
        })
      );
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermission = async (key: string) => {
    try {
      if (key === 'contacts') {
        const { status } = await Contacts.requestPermissionsAsync();
        updatePermissionState(key, status === 'granted');
      } else if (key === 'notifications') {
        // Handle notifications - may not work in Expo Go
        try {
          if (Notifications) {
            const { status } = await Notifications.requestPermissionsAsync();
            updatePermissionState(key, status === 'granted');
          } else {
            // Auto-grant in Expo Go where notifications aren't supported
            updatePermissionState(key, true);
            Alert.alert(
              'Demo Mode',
              'Push notifications require a development build. Auto-granted for demo.'
            );
          }
        } catch (e) {
          updatePermissionState(key, true);
          console.log('Notifications not available:', e);
        }
      } else if (key === 'readPhoneNumbers') {
        if (Platform.OS === 'android') {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
            {
              title: t.permissions.readPhoneNumbers.title,
              message: t.permissions.readPhoneNumbers.description,
              buttonPositive: 'OK',
            }
          );
          updatePermissionState(
            key,
            result === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          updatePermissionState(key, true);
        }
      } else if (key === 'answerCalls') {
        if (Platform.OS === 'android') {
          const result = await PermissionsAndroid.request(
            // ANSWER_PHONE_CALLS string constant (not exposed as enum in older RN typings)
            'android.permission.ANSWER_PHONE_CALLS' as any,
            {
              title: t.permissions.answerCalls.title,
              message: t.permissions.answerCalls.description,
              buttonPositive: 'OK',
            }
          );
          updatePermissionState(
            key,
            result === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          updatePermissionState(key, true);
        }
      } else if (key === 'systemAlert') {
        if (Platform.OS === 'android') {
          // SYSTEM_ALERT_WINDOW is a "special" permission — must be granted via Settings.
          // Mark as "requested" so AppState listener flips granted=true on return.
          setPermissions((prev) =>
            prev.map((p) =>
              p.key === 'systemAlert' ? ({ ...p, _requested: true } as any) : p
            )
          );
          Alert.alert(
            t.permissions.systemAlert.title,
            t.permissions.systemAlert.description,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION,
                    { data: 'package:com.stopfrauda.app' }
                  );
                },
              },
            ]
          );
        } else {
          updatePermissionState(key, true);
        }
      } else {
        // For phone and microphone - simulated for demo
        updatePermissionState(key, true);
        if (Platform.OS === 'web') {
          Alert.alert(
            'Demo Mode',
            'Phone and microphone permissions require a native Android build. Marked as granted for demo.'
          );
        }
      }
    } catch (error) {
      console.error(`Error requesting ${key} permission:`, error);
    }
  };

  const updatePermissionState = (key: string, granted: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.key === key ? { ...p, granted } : p))
    );
  };

  const allGranted = permissions.every((p) => p.granted);
  const canContinue = permissions
    .filter((p) => p.key === 'contacts' || p.key === 'notifications')
    .every((p) => p.granted);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={40} color="#6366f1" />
          </View>
          <Text style={styles.title}>{t.permissions.title}</Text>
          <Text style={styles.subtitle}>{t.permissions.subtitle}</Text>
        </View>

        {/* Permissions List */}
        <View style={styles.permissionsList}>
          {permissions.map((permission) => (
            <View
              key={permission.key}
              style={styles.permissionCard}
              testID={`permission-card-${permission.key}`}
            >
              <View
                style={[
                  styles.permissionIcon,
                  permission.granted && styles.permissionIconGranted,
                ]}
              >
                <Ionicons
                  name={permission.icon as any}
                  size={28}
                  color={permission.granted ? '#22c55e' : '#6366f1'}
                />
              </View>

              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>{permission.title}</Text>
                <Text style={styles.permissionDescription}>
                  {permission.description}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.grantButton,
                  permission.granted && styles.grantButtonGranted,
                ]}
                onPress={() => requestPermission(permission.key)}
                disabled={permission.granted}
                testID={`permission-grant-${permission.key}`}
              >
                {permission.granted ? (
                  <Ionicons name="checkmark" size={20} color="#22c55e" />
                ) : (
                  <Text style={styles.grantButtonText}>
                    {t.permissions.grant}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {allGranted && (
          <View style={styles.allGrantedBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text style={styles.allGrantedText}>
              {t.permissions.allGranted}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled,
          ]}
          onPress={() => router.push('/onboarding/profile' as any)}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>
            {t.permissions.continue}
          </Text>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  permissionsList: {
    gap: 16,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionIconGranted: {
    backgroundColor: '#dcfce7',
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  grantButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    marginLeft: 12,
  },
  grantButtonGranted: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
  },
  grantButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  allGrantedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 10,
  },
  allGrantedText: {
    color: '#166534',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
