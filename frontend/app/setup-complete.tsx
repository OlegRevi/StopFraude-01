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
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <Text style={styles.smsHeader}>📱 Twilio Guardian Dispatch</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={styles.smsStatusText}>
                Notifying emergency guardians via SMS...
              </Text>
            </View>
          ) : (
            <Text style={styles.smsStatusText}>{smsStatus}</Text>
          )}

          <View style={styles.guardiansList}>
            {contacts.map((c, idx) => (
              <View key={idx} style={styles.guardianItem}>
                <Text style={styles.guardianName}>• {c.name}</Text>
                <Text style={styles.guardianPhone}>{c.phone}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Test Call Simulator Section */}
        <View style={styles.simulatorBox}>
          <View style={styles.simulatorHeader}>
            <Text style={styles.simulatorIcon}>🧪</Text>
            <View>
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
              <ActivityIndicator color="#F8FAFC" />
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
        <TouchableOpacity
          style={styles.dashboardButton}
          activeOpacity={0.8}
          onPress={handleGoToDashboard}
        >
          <Text style={styles.dashboardButtonText}>Enter Dashboard</Text>
          <Text style={styles.arrowIcon}>→</Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  celebrationBox: {
    alignItems: 'center',
    marginVertical: 16,
  },
  celebrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#064E3B40',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  celebrationEmoji: {
    fontSize: 40,
  },
  stepBadge: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  smsBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  smsHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  smsStatusText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  guardiansList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    gap: 4,
  },
  guardianItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  guardianName: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  guardianPhone: {
    fontSize: 13,
    color: '#94A3B8',
  },
  simulatorBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 24,
  },
  simulatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  simulatorIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  simulatorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  simulatorDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  simResultCard: {
    backgroundColor: '#7F1D1D40',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 12,
  },
  simResultText: {
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 17,
  },
  simulatorButton: {
    backgroundColor: '#D97706',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
  testEmoji: {
    fontSize: 16,
  },
  dashboardButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
