import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getLocalContacts,
  getLocalSubscription,
  getAutoReject,
  setAutoReject,
  getStoredBackendUrl,
  setStoredBackendUrl,
  setOnboardingCompleted,
} from '../../services/storage';
import { EmergencyContact, UserSubscription } from '../../types';

export default function SettingsScreen() {
  const router = useRouter();

  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [autoRejectCalls, setAutoRejectCalls] = useState(false);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
  const [backendUrl, setBackendUrl] = useState('http://10.0.2.2:8080');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const contacts = await getLocalContacts();
    setGuardians(contacts);

    const sub = await getLocalSubscription();
    setSubscription(sub);

    const reject = await getAutoReject();
    setAutoRejectCalls(reject);

    const url = await getStoredBackendUrl();
    setBackendUrl(url);
  };

  const handleToggleAutoReject = async (val: boolean) => {
    setAutoRejectCalls(val);
    await setAutoReject(val);
  };

  const handleSaveBackendUrl = async () => {
    await setStoredBackendUrl(backendUrl);
    Alert.alert('Settings Saved', `Backend Cloud Run endpoint updated to: ${backendUrl}`);
  };

  const handleResetSetup = async () => {
    Alert.alert(
      'Reset StopFrauda Setup',
      'Are you sure you want to re-run the onboarding and permissions guide?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await setOnboardingCompleted(false);
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Subscription Plan Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>💳 Protection Subscription</Text>
          <View style={styles.planBadgeRow}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                {subscription?.planType === 'EARLY_BIRD'
                  ? 'EARLY BIRD (1 YEAR FREE)'
                  : 'STANDARD ANNUAL ($10/YR)'}
              </Text>
            </View>
            <Text style={styles.statusActiveText}>ACTIVE</Text>
          </View>

          <Text style={styles.planDetailText}>
            Status: <Text style={styles.boldText}>{subscription?.status || 'active'}</Text>
          </Text>
          <Text style={styles.planDetailText}>
            Renewal: <Text style={styles.boldText}>
              {subscription?.expiresAt
                ? new Date(subscription.expiresAt).toLocaleDateString()
                : '1 Year from activation'}
            </Text>
          </Text>
        </View>

        {/* Call Screening Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>🛡️ Call Protection Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Twilio Emergency SMS</Text>
              <Text style={styles.settingSubtitle}>
                Instantly alert emergency guardians when an unknown caller rings
              </Text>
            </View>
            <Switch
              value={smsAlertsEnabled}
              onValueChange={setSmsAlertsEnabled}
              trackColor={{ false: '#334155', true: '#0284C7' }}
              thumbColor={smsAlertsEnabled ? '#38BDF8' : '#94A3B8'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Auto-Silence / Reject Unknowns</Text>
              <Text style={styles.settingSubtitle}>
                Automatically disallow calls from numbers not registered in contacts
              </Text>
            </View>
            <Switch
              value={autoRejectCalls}
              onValueChange={handleToggleAutoReject}
              trackColor={{ false: '#334155', true: '#DC2626' }}
              thumbColor={autoRejectCalls ? '#EF4444' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Emergency Guardians Management */}
        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionHeader}>👨‍👩‍👧‍👦 Emergency Guardians</Text>
            <TouchableOpacity onPress={() => router.push('/contact-picker')}>
              <Text style={styles.editText}>Edit (5 Max)</Text>
            </TouchableOpacity>
          </View>

          {guardians.map((g, idx) => (
            <View key={idx} style={styles.guardianItem}>
              <Text style={styles.guardianName}>• {g.name}</Text>
              <Text style={styles.guardianPhone}>{g.phone}</Text>
            </View>
          ))}
        </View>

        {/* Cloud Run Backend URL Config */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>☁️ Cloud Run Backend Endpoint</Text>
          <Text style={styles.inputSubtitle}>
            Specify your Cloud Run backend URL (or emulator default http://10.0.2.2:8080):
          </Text>

          <TextInput
            style={styles.urlInput}
            value={backendUrl}
            onChangeText={setBackendUrl}
            placeholder="https://stopfrauda-backend-xyz.run.app"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.saveUrlButton}
            activeOpacity={0.8}
            onPress={handleSaveBackendUrl}
          >
            <Text style={styles.saveUrlText}>Save Backend URL</Text>
          </TouchableOpacity>
        </View>

        {/* Reset Setup */}
        <TouchableOpacity
          style={styles.resetButton}
          activeOpacity={0.8}
          onPress={handleResetSetup}
        >
          <Text style={styles.resetButtonText}>Re-run Setup & Onboarding</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  planBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planBadge: {
    backgroundColor: '#0F2847',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  planBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  statusActiveText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 12,
  },
  planDetailText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  boldText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  guardianItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#33415540',
  },
  guardianName: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  guardianPhone: {
    fontSize: 13,
    color: '#94A3B8',
  },
  inputSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  urlInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
    marginBottom: 10,
  },
  saveUrlButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveUrlText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  resetButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
