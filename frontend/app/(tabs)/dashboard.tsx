import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  addCallScreenedListener,
  startProtection,
  stopProtection,
  simulateIncomingCall,
} from 'expo-call-detector';
import {
  getLocalContacts,
  getLocalCallLogs,
  appendCallLog,
  getProtectionActive,
  setProtectionActive,
  getOrCreateUserId,
} from '../../services/storage';
import { ApiClient } from '../../services/api';
import { EmergencyContact, CallLogEntry } from '../../types';

export default function DashboardScreen() {
  const [isActive, setIsActive] = useState(true);
  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallLogEntry[]>([]);
  const [activeAlert, setActiveAlert] = useState<{
    number: string;
    isUnknown: boolean;
    name?: string;
    timestamp: string;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadData();

    // Listen to real-time incoming call screening events
    const subscription = addCallScreenedListener(async (event) => {
      const now = new Date().toISOString();
      const newEntry: CallLogEntry = {
        id: 'call_' + Date.now(),
        incomingNumber: event.phoneNumber,
        isUnknown: event.isUnknown,
        alertDispatched: event.isUnknown,
        timestamp: now,
        callerName: event.contactName || undefined,
      };

      await appendCallLog(newEntry);
      setRecentCalls((prev) => [newEntry, ...prev.slice(0, 9)]);

      setActiveAlert({
        number: event.phoneNumber,
        isUnknown: event.isUnknown,
        name: event.contactName,
        timestamp: now,
      });

      if (event.isUnknown) {
        const userId = await getOrCreateUserId();
        await ApiClient.dispatchUnknownAlert(userId, event.phoneNumber, now);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadData = async () => {
    const active = await getProtectionActive();
    setIsActive(active);

    const contacts = await getLocalContacts();
    setGuardians(contacts);

    const logs = await getLocalCallLogs();
    setRecentCalls(logs.slice(0, 5));
  };

  const toggleProtection = async (val: boolean) => {
    setIsActive(val);
    await setProtectionActive(val);
    if (val) {
      await startProtection();
    } else {
      await stopProtection();
    }
  };

  const handleSimulateCall = async (unknown: boolean) => {
    setSimulating(true);
    try {
      const numberToSimulate = unknown ? '+1 (800) 555-0199' : guardians[0]?.phone || '+1 555-0123';
      const res = await simulateIncomingCall(numberToSimulate);

      const entry: CallLogEntry = {
        id: 'sim_' + Date.now(),
        incomingNumber: numberToSimulate,
        isUnknown: res.isUnknown,
        alertDispatched: res.isUnknown,
        timestamp: new Date().toISOString(),
        callerName: res.contactName || undefined,
      };

      await appendCallLog(entry);
      setRecentCalls((prev) => [entry, ...prev.slice(0, 9)]);

      setActiveAlert({
        number: numberToSimulate,
        isUnknown: res.isUnknown,
        name: res.contactName,
        timestamp: new Date().toISOString(),
      });

      if (res.isUnknown) {
        const userId = await getOrCreateUserId();
        await ApiClient.dispatchUnknownAlert(userId, numberToSimulate);
      }
    } catch (e: any) {
      Alert.alert('Simulator', e.message || 'Error running test call');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Real-time Alert Banner if Active */}
        {activeAlert && (
          <View
            style={[
              styles.alertBanner,
              activeAlert.isUnknown ? styles.alertUnknown : styles.alertSafe,
            ]}
          >
            <View style={styles.alertBannerHeader}>
              <Text style={styles.alertEmoji}>
                {activeAlert.isUnknown ? '🚨' : '✅'}
              </Text>
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertBannerTitle}>
                  {activeAlert.isUnknown
                    ? 'UNKNOWN CALLER DETECTED!'
                    : 'VERIFIED CONTACT CALL'}
                </Text>
                <Text style={styles.alertBannerDesc}>
                  {activeAlert.isUnknown
                    ? `Number ${activeAlert.number} is NOT in contacts. SMS dispatched to ${guardians.length} guardians.`
                    : `${activeAlert.name || 'Known contact'} (${activeAlert.number})`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveAlert(null)}>
                <Text style={styles.alertDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Big Shield Status Card */}
        <View style={[styles.statusCard, isActive ? styles.statusActive : styles.statusInactive]}>
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={styles.statusLabel}>PROTECTION STATUS</Text>
              <Text style={styles.statusTitle}>
                {isActive ? 'Shield Active & Guarding' : 'Protection Paused'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={toggleProtection}
              trackColor={{ false: '#334155', true: '#0284C7' }}
              thumbColor={isActive ? '#38BDF8' : '#94A3B8'}
            />
          </View>

          <View style={styles.shieldGraphic}>
            <Text style={styles.shieldEmoji}>{isActive ? '🛡️' : '⚠️'}</Text>
          </View>

          <Text style={styles.statusFooterText}>
            {isActive
              ? `Real-time call screening active • ${guardians.length} Guardians on standby`
              : 'Incoming unknown calls will not trigger SMS alerts'}
          </Text>
        </View>

        {/* Quick Simulator Bar */}
        <View style={styles.simulatorCard}>
          <Text style={styles.sectionTitle}>🧪 Live Call Simulation</Text>
          <Text style={styles.sectionSubtitle}>
            Test how StopFrauda responds to incoming calls:
          </Text>
          <View style={styles.simButtonsRow}>
            <TouchableOpacity
              style={[styles.simButton, styles.simButtonUnknown]}
              activeOpacity={0.8}
              onPress={() => handleSimulateCall(true)}
              disabled={simulating}
            >
              <Text style={styles.simButtonText}>🚨 Unknown Caller</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simButton, styles.simButtonSafe]}
              activeOpacity={0.8}
              onPress={() => handleSimulateCall(false)}
              disabled={simulating}
            >
              <Text style={styles.simButtonText}>✅ Safe Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Guardians List */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Active Emergency Guardians</Text>
            <Text style={styles.badgeCount}>{guardians.length}/5</Text>
          </View>

          {guardians.length === 0 ? (
            <Text style={styles.emptyText}>No emergency guardians selected.</Text>
          ) : (
            guardians.map((g, idx) => (
              <View key={idx} style={styles.guardianRow}>
                <View style={styles.guardianAvatar}>
                  <Text style={styles.guardianInitial}>
                    {g.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.guardianInfo}>
                  <Text style={styles.guardianName}>{g.name}</Text>
                  <Text style={styles.guardianPhone}>{g.phone}</Text>
                </View>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedText}>SMS READY</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Screened Calls Preview */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>📞 Recent Call Screenings</Text>

          {recentCalls.length === 0 ? (
            <Text style={styles.emptyText}>
              No calls screened yet. Incoming calls will appear here.
            </Text>
          ) : (
            recentCalls.map((c) => (
              <View key={c.id} style={styles.callRow}>
                <Text style={styles.callEmoji}>{c.isUnknown ? '🚨' : '✅'}</Text>
                <View style={styles.callInfo}>
                  <Text style={styles.callNumber}>
                    {c.callerName ? `${c.callerName} (${c.incomingNumber})` : c.incomingNumber}
                  </Text>
                  <Text style={styles.callTime}>
                    {new Date(c.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} • {c.isUnknown ? 'Unknown (SMS Alert Sent)' : 'Known Contact'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
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
  },
  alertBanner: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  alertUnknown: {
    backgroundColor: '#7F1D1D30',
    borderColor: '#EF4444',
  },
  alertSafe: {
    backgroundColor: '#064E3B30',
    borderColor: '#10B981',
  },
  alertBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  alertBannerDesc: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  alertDismiss: {
    fontSize: 16,
    color: '#94A3B8',
    padding: 4,
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    marginBottom: 16,
  },
  statusActive: {
    backgroundColor: '#0F2847',
    borderColor: '#38BDF8',
  },
  statusInactive: {
    backgroundColor: '#1E293B',
    borderColor: '#64748B',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.5,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  shieldGraphic: {
    alignItems: 'center',
    marginVertical: 14,
  },
  shieldEmoji: {
    fontSize: 64,
  },
  statusFooterText: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '500',
  },
  simulatorCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  simButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  simButtonUnknown: {
    backgroundColor: '#DC2626',
  },
  simButtonSafe: {
    backgroundColor: '#059669',
  },
  simButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: '#0284C720',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  guardianAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  guardianInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  guardianPhone: {
    fontSize: 12,
    color: '#94A3B8',
  },
  verifiedTag: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  callEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  callInfo: {
    flex: 1,
  },
  callNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  callTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
