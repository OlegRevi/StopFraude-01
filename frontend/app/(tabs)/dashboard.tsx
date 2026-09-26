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
  Image,
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
import { Colors } from '../../constants/theme';
import { StopFraudaBrand } from '../../components/StopFraudaBrand';

const AVATAR_COLORS = ['#EC4899', '#EF4444', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

function getInitialColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                <Text
                  style={[
                    styles.alertBannerTitle,
                    activeAlert.isUnknown ? styles.alertUnknownTitle : styles.alertSafeTitle,
                  ]}
                >
                  {activeAlert.isUnknown
                    ? 'UNKNOWN CALLER DETECTED!'
                    : 'VERIFIED CONTACT CALL'}
                </Text>
                <Text
                  style={[
                    styles.alertBannerDesc,
                    activeAlert.isUnknown ? styles.alertUnknownDesc : styles.alertSafeDesc,
                  ]}
                >
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
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.shieldGraphic}>
            <View style={[styles.shieldOuterRing, isActive ? styles.shieldRingActive : styles.shieldRingInactive]}>
              {isActive ? (
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.dashboardLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.shieldCircleInactive}>
                  <Text style={styles.shieldEmoji}>⚠️</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.statusFooterText}>
            {isActive
              ? `Real-time call screening active • ${guardians.length} Guardian(s) on standby`
              : 'Incoming unknown calls will not trigger SMS alerts'}
          </Text>
        </View>

        {/* Quick Simulator Bar */}
        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>🧪 Live Call Simulation</Text>
          <Text style={styles.sectionSubtitle}>
            Test how <StopFraudaBrand fontWeight="600" /> responds to incoming calls:
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
        <View style={styles.cardBox}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Emergency Guardians</Text>
            <View style={styles.badgeCountBox}>
              <Text style={styles.badgeCountText}>{guardians.length}/5</Text>
            </View>
          </View>

          {guardians.length === 0 ? (
            <Text style={styles.emptyText}>No emergency guardians designated.</Text>
          ) : (
            guardians.map((g, idx) => (
              <View key={idx} style={styles.guardianRow}>
                <View style={[styles.guardianAvatar, { backgroundColor: getInitialColor(idx) }]}>
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
        <View style={styles.cardBox}>
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
                    })}{' '}
                    • {c.isUnknown ? 'Unknown (Alert Sent)' : 'Known Contact'}
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  alertBanner: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  alertUnknown: {
    backgroundColor: Colors.dangerLight,
    borderColor: '#FECACA',
  },
  alertSafe: {
    backgroundColor: Colors.successLight,
    borderColor: '#BBF7D0',
  },
  alertBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  alertUnknownTitle: {
    color: Colors.dangerDark,
  },
  alertSafeTitle: {
    color: Colors.successDark,
  },
  alertBannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  alertUnknownDesc: {
    color: Colors.dangerDark,
  },
  alertSafeDesc: {
    color: Colors.successDark,
  },
  alertDismiss: {
    fontSize: 16,
    color: Colors.textMuted,
    padding: 4,
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  statusInactive: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  shieldGraphic: {
    alignItems: 'center',
    marginVertical: 14,
  },
  shieldOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldRingActive: {
    backgroundColor: Colors.primaryLight,
  },
  shieldRingInactive: {
    backgroundColor: Colors.surfaceSecondary,
  },
  dashboardLogo: {
    width: 72,
    height: 72,
  },
  shieldCircleInactive: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldEmoji: {
    fontSize: 34,
  },
  statusFooterText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  cardBox: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  simButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  simButtonUnknown: {
    backgroundColor: Colors.danger,
  },
  simButtonSafe: {
    backgroundColor: Colors.success,
  },
  simButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeCountBox: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  guardianAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guardianInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  guardianPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  verifiedTag: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    color: Colors.successDark,
    fontSize: 10,
    fontWeight: '800',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  callEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  callNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  callTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
