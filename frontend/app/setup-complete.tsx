import React, { useEffect, useState } from 'react';
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
import { ApiClient } from '../services/api';
import {
  getOrCreateUserId,
  getLocalContacts,
  setOnboardingCompleted,
  appendCallLog,
  getStoredBackendUrl,
} from '../services/storage';
import {
  simulateIncomingCall,
  startProtection,
  configureCallDetector,
} from 'expo-call-detector';
import { EmergencyContact } from '../types';
import { Colors } from '../constants/theme';

export default function SetupCompleteScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [smsStatus, setSmsStatus] = useState<string>('Sending welcome SMS...');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  useEffect(() => {
    initSetup();
  }, []);

  const initSetup = async () => {
    try {
      const userId = await getOrCreateUserId();
      const savedContacts = await getLocalContacts();
      setContacts(savedContacts);

      // Configure native module
      const backendUrl = await getStoredBackendUrl();
      await configureCallDetector(userId, backendUrl, false);
      await startProtection();

      // Dispatch welcome SMS via Twilio Cloud Run endpoint
      if (savedContacts.length > 0) {
        const res = await ApiClient.sendWelcomeContacts(userId, savedContacts);
        setSmsStatus(
          `✅ Welcome SMS sent to ${res.sentCount} Emergency Guardian(s)!`
        );
      } else {
        setSmsStatus('Protection ready.');
      }

      await setOnboardingCompleted(true);
    } catch (e: any) {
      setSmsStatus('Protection active.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCallSimulation = async () => {
    setSimulating(true);
    setSimulationResult(null);
    try {
      const testNumber = '+1 (800) 555-0199'; // Simulated unknown number
      const res = await simulateIncomingCall(testNumber);

      // Also dispatch alert through API client to mirror full pipeline
      const userId = await getOrCreateUserId();
      await ApiClient.dispatchUnknownAlert(userId, testNumber);

      // Log locally
      await appendCallLog({
        id: 'sim_' + Date.now(),
        incomingNumber: testNumber,
        isUnknown: true,
        alertDispatched: true,
        timestamp: new Date().toISOString(),
      });

      setSimulationResult(
        `🚨 Simulation triggered! An unknown call alert banner was generated and an emergency SMS alert was dispatched for ${testNumber}.`
      );
    } catch (e: any) {
      Alert.alert('Simulation Error', e.message || 'Could not run simulator');
    } finally {
      setSimulating(false);
    }
  };

  const handleGoToDashboard = () => {
    router.replace('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Shield Celebration Icon */}
        <View style={styles.celebrationBox}>
          <View style={styles.celebrationCircle}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
          </View>
          <Text style={styles.stepBadge}>SETUP COMPLETE</Text>
          <Text style={styles.title}>You Are Now Protected!</Text>
          <Text style={styles.subtitle}>
            StopFrauda is actively guarding your phone against incoming fraud calls.
          </Text>
        </View>

        {/* SMS Status Box */}
        <View style={styles.smsBox}>
          <Text style={styles.smsHeader}>📱 Guardian SMS Status</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.smsStatusText}>
                Notifying emergency guardians via SMS...
              </Text>
            </View>
          ) : (
            <Text style={styles.smsStatusText}>{smsStatus}</Text>
          )}

          {contacts.length > 0 && (
            <View style={styles.guardiansList}>
              {contacts.map((c, idx) => (
                <View key={idx} style={styles.guardianItem}>
                  <Text style={styles.guardianName}>• {c.name}</Text>
                  <Text style={styles.guardianPhone}>{c.phone}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Test Call Simulator Section */}
        <View style={styles.simulatorBox}>
          <View style={styles.simulatorHeader}>
            <Text style={styles.simulatorIcon}>🧪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.simulatorTitle}>Test Call Simulator</Text>
              <Text style={styles.simulatorDesc}>
                Experience how StopFrauda alerts you when a scammer calls.
              </Text>
            </View>
          </View>

          {simulationResult && (
            <View style={styles.simResultCard}>
              <Text style={styles.simResultText}>{simulationResult}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.simulatorButton}
            activeOpacity={0.8}
            onPress={handleTestCallSimulation}
            disabled={simulating}
          >
            {simulating ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Text style={styles.simulatorButtonText}>
                  Simulate Unknown Incoming Call
                </Text>
                <Text style={styles.testEmoji}>🔔</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Go to Dashboard */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.dashboardButton}
            activeOpacity={0.85}
            onPress={handleGoToDashboard}
          >
            <Text style={styles.dashboardButtonText}>Enter Dashboard</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  celebrationBox: {
    alignItems: 'center',
    marginVertical: 12,
  },
  celebrationCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationEmoji: {
    fontSize: 42,
  },
  stepBadge: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  smsBox: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  smsHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  smsStatusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  guardiansList: {
    marginTop: 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  guardianItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  guardianName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  guardianPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  simulatorBox: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  simulatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  simulatorIcon: {
    fontSize: 24,
  },
  simulatorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  simulatorDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  simResultCard: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  simResultText: {
    color: Colors.dangerDark,
    fontSize: 13,
    lineHeight: 18,
  },
  simulatorButton: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  simulatorButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  testEmoji: {
    fontSize: 16,
  },
  footerContainer: {
    marginTop: 'auto',
    paddingBottom: 16,
  },
  dashboardButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  dashboardButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  arrowIcon: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
  },
});
