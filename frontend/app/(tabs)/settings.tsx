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
import { Colors } from '../../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();

  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [autoRejectCalls, setAutoRejectCalls] = useState(false);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
  const [backendUrl, setBackendUrl] = useState('https://stopfrauda-backend-539120389345.europe-west1.run.app');

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <View style={styles.statusActiveBadge}>
              <Text style={styles.statusActiveText}>ACTIVE</Text>
            </View>
          </View>

          <Text style={styles.planDetailText}>
            Status: <Text style={styles.boldText}>{subscription?.status || 'active'}</Text>
          </Text>
          <Text style={styles.planDetailText}>
            Renewal:{' '}
            <Text style={styles.boldText}>
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
              <Text style={styles.settingTitle}>Emergency Guardian SMS</Text>
              <Text style={styles.settingSubtitle}>
                Instantly alert emergency guardians when an unknown caller rings
              </Text>
            </View>
            <Switch
              value={smsAlertsEnabled}
              onValueChange={setSmsAlertsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Auto-Silence Unknowns</Text>
              <Text style={styles.settingSubtitle}>
                Automatically disallow calls from numbers not registered in contacts
              </Text>
            </View>
            <Switch
              value={autoRejectCalls}
              onValueChange={handleToggleAutoReject}
              trackColor={{ false: Colors.border, true: Colors.danger }}
              thumbColor="#FFFFFF"
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

          {guardians.length === 0 ? (
            <Text style={styles.emptyText}>No emergency guardians selected.</Text>
          ) : (
            guardians.map((g, idx) => (
              <View key={idx} style={styles.guardianItem}>
                <Text style={styles.guardianName}>• {g.name}</Text>
                <Text style={styles.guardianPhone}>{g.phone}</Text>
              </View>
            ))
          )}
        </View>

        {/* Cloud Run Backend URL Config */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>☁️ Cloud Run Backend Endpoint</Text>
          <Text style={styles.inputSubtitle}>
            Your Cloud Run backend API endpoint:
          </Text>

          <TextInput
            style={styles.urlInput}
            value={backendUrl}
            onChangeText={setBackendUrl}
            placeholder="https://stopfrauda-backend-xyz.run.app"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.saveUrlButton}
            activeOpacity={0.85}
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  planBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  planBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  statusActiveBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActiveText: {
    color: Colors.successDark,
    fontWeight: '800',
    fontSize: 11,
  },
  planDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  boldText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  guardianItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  guardianName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  guardianPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    paddingVertical: 8,
  },
  inputSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  urlInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    marginBottom: 10,
  },
  saveUrlButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveUrlText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: Colors.dangerLight,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetButtonText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
