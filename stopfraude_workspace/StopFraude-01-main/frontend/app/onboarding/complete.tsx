import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';
import apiService from '../../src/services/api';

export default function CompleteScreen() {
  const router = useRouter();
  const { language, selectedContacts, userProfile, setUser } = useAppStore();
  const t = translations[language];
  const [loading, setLoading] = useState(false);
  const [testingCall, setTestingCall] = useState(false);

  // Create a local user object for offline-first approach
  const createLocalUser = () => {
    const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    // Use the real phone/name from the profile step; fallback only if somehow missing
    const fallbackPhone = `+373${Math.floor(Math.random() * 90000000 + 10000000)}`;
    return {
      id,
      phone: userProfile?.phone || fallbackPhone,
      name: userProfile?.name,
      email: userProfile?.email,
      language,
      emergency_contacts: selectedContacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
      })),
      is_active: true,
      onboarding_completed: true,
      created_at: now,
      updated_at: now,
    };
  };

  // Sync user to backend with up to 5 retries and exponential backoff
  const syncUserToBackend = async (localUser: any, attempt = 1): Promise<boolean> => {
    const MAX_RETRIES = 5;
    const RETRY_DELAYS = [2000, 4000, 8000, 15000, 30000];
    try {
      const user = await apiService.createUser(localUser.phone, language, {
        name: localUser.name,
        email: localUser.email,
      });
      if (selectedContacts.length > 0) {
        const cleanContacts = selectedContacts.map(c => ({
          id: c.id, name: c.name, phone: c.phone, email: c.email || undefined,
        }));
        await apiService.addEmergencyContacts(user.id, cleanContacts);
      }
      const updatedUser = await apiService.updateUser(user.id, {
        onboarding_completed: true,
        is_active: true,
      });
      setUser(updatedUser);
      console.log(`Backend sync succeeded on attempt ${attempt}. Real user ID: ${updatedUser.id}`);
      return true;
    } catch (e) {
      console.log(`Backend sync attempt ${attempt} failed:`, e);
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return syncUserToBackend(localUser, attempt + 1);
      }
      console.warn('All sync attempts failed. User will remain local until next app launch.');
      return false;
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    // Set a local user immediately so the user can navigate without waiting
    const localUser = createLocalUser();
    setUser(localUser as any);
    // Kick off background sync with retries — do NOT await
    syncUserToBackend(localUser);
    router.replace('/(tabs)');
    setLoading(false);
  };

  const testSampleCall = async () => {
    setTestingCall(true);
    try {
      const phoneToUse = userProfile?.phone || `+373${Math.floor(Math.random() * 90000000 + 10000000)}`;
      const user = await apiService.createUser(phoneToUse, language, {
        name: userProfile?.name,
        email: userProfile?.email,
      });
      
      if (selectedContacts.length > 0) {
        const cleanContacts = selectedContacts.map(c => ({
          id: c.id, name: c.name, phone: c.phone, email: c.email || undefined,
        }));
        await apiService.addEmergencyContacts(user.id, cleanContacts);
      }
      
      const call = await apiService.createDemoScamCall(user.id);
      
      const updatedUser = await apiService.updateUser(user.id, {
        onboarding_completed: true,
        is_active: true,
      });
      setUser(updatedUser);
      
      Alert.alert(
        'Test Complete!',
        `Scam detected with ${call.scam_score}% confidence.\nType: ${call.scam_type?.replace('_', ' ')}`,
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      console.error('Error testing call:', error);
      // On failure, offer to skip to dashboard
      Alert.alert(
        'Server Unavailable',
        'Could not reach the server for the test. This can happen with slow connections. You can go to the dashboard and try later.',
        [
          { text: 'Try Again', onPress: () => testSampleCall() },
          { text: 'Go to Dashboard', onPress: () => completeOnboarding() },
        ]
      );
    } finally {
      setTestingCall(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Animation */}
        <View style={styles.successContainer}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={60} color="#fff" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t.complete.title}</Text>
        <Text style={styles.subtitle}>{t.complete.subtitle}</Text>

        {/* Alert Contacts */}
        <View style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>{t.complete.alertContacts}</Text>
          <View style={styles.contactsList}>
            {selectedContacts.map((contact, index) => (
              <View key={contact.id} style={styles.contactRow}>
                <View style={styles.contactBadge}>
                  <Text style={styles.contactBadgeText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <Ionicons name="notifications" size={20} color="#22c55e" />
              </View>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
            <Text style={styles.featureText}>24/7 call monitoring active</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="flash" size={24} color="#22c55e" />
            <Text style={styles.featureText}>AI scam detection enabled</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="chatbubbles" size={24} color="#22c55e" />
            <Text style={styles.featureText}>SMS alerts configured</Text>
          </View>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testSampleCall}
          disabled={testingCall || loading}
        >
          {testingCall ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <>
              <Ionicons name="flask" size={20} color="#6366f1" />
              <Text style={styles.testButtonText}>{t.complete.testCall}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={completeOnboarding}
          disabled={loading || testingCall}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.dashboardButtonText}>{t.complete.goDashboard}</Text>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </>
          )}
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
    paddingBottom: 180,
    alignItems: 'center',
  },
  successContainer: {
    marginTop: 40,
    marginBottom: 32,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  contactsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  contactsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  contactsList: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  contactPhone: {
    fontSize: 13,
    color: '#6b7280',
  },
  featuresCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 48,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    backgroundColor: '#f0f0ff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  testButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardButton: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
