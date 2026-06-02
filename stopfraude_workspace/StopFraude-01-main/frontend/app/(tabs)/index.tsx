import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';
import apiService from '../../src/services/api';
import notificationService from '../../src/services/notificationService';
import callMonitorService from '../../src/services/callMonitorService';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, language, setUser, setCalls } = useAppStore();
  const t = translations[language];
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total_calls: 0, scam_calls: 0, alerts_sent: 0, legitimate_calls: 0 });
  const [testingScam, setTestingScam] = useState(false);
  const [testingLegit, setTestingLegit] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>('checking');
  const [pendingCalls, setPendingCalls] = useState(0);

  const isActive = user?.is_active ?? false;
  const primaryContact = user?.emergency_contacts?.[0];

  useEffect(() => {
    if (user?.id) {
      loadStats();
      checkBackendHealth();
      updatePendingCount();
    }
    // Re-check health every 30 seconds
    const healthInterval = setInterval(() => {
      if (user?.id) checkBackendHealth();
    }, 30000);
    return () => clearInterval(healthInterval);
  }, [user?.id]);

  const loadStats = async () => {
    if (!user?.id) return;
    try {
      const statsData = await apiService.getUserStats(user.id);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const checkBackendHealth = async () => {
    try {
      const health = await apiService.healthCheck();
      setHealthStatus(health.status === 'running' ? 'connected' : 'error');
    } catch (error) {
      setHealthStatus('offline');
    }
  };

  const updatePendingCount = () => {
    setPendingCalls(callMonitorService.getPendingCallsCount());
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadStats(),
      checkBackendHealth(),
      callMonitorService.syncPendingCalls(),
    ]);
    updatePendingCount();
    setRefreshing(false);
  }, [user?.id]);

  const toggleProtection = async () => {
    if (!user?.id) return;
    try {
      const updatedUser = await apiService.updateUser(user.id, {
        is_active: !isActive,
      });
      setUser(updatedUser);
      
      // Show feedback
      Alert.alert(
        updatedUser.is_active ? '🛡️ Protection Enabled' : '⚠️ Protection Disabled',
        updatedUser.is_active 
          ? 'You are now protected from scam calls.' 
          : 'Protection is now disabled. Enable it to stay safe.'
      );
    } catch (error) {
      console.error('Error toggling protection:', error);
      Alert.alert('Error', 'Failed to update protection status.');
    }
  };

  const callEmergencyContact = () => {
    if (primaryContact?.phone) {
      Linking.openURL(`tel:${primaryContact.phone}`);
    }
  };

  const testScamDetection = async () => {
    if (!user?.id || testingScam) return;
    setTestingScam(true);
    try {
      const call = await apiService.createDemoScamCall(user.id);
      await loadStats();
      
      // Show local notification
      if (call.scam_score && call.scam_score > 70) {
        await notificationService.showScamAlert(
          call.id,
          call.caller_number,
          call.scam_type || 'unknown',
          call.scam_score
        );
      }
      
      Alert.alert(
        '⚠️ Scam Detected!',
        `AI detected a scam call with ${call.scam_score}% confidence.\n\nType: ${call.scam_type?.replace('_', ' ')}\n\nCheck the History tab to see the full analysis.`,
        [
          { text: 'Dismiss', style: 'cancel' },
          { 
            text: 'View Details', 
            onPress: () => router.push({ pathname: '/call-details', params: { callId: call.id } })
          },
        ]
      );
    } catch (error) {
      console.error('Error testing scam detection:', error);
      Alert.alert('Error', 'Failed to test scam detection. Please try again.');
    } finally {
      setTestingScam(false);
    }
  };

  const testLegitCall = async () => {
    if (!user?.id || testingLegit) return;
    setTestingLegit(true);
    try {
      const call = await apiService.createDemoLegitCall(user.id);
      await loadStats();
      
      Alert.alert(
        '✅ Safe Call',
        `AI analyzed the call and found it legitimate (${call.scam_score}% scam likelihood).\n\nType: ${call.scam_type?.replace('_', ' ')}`,
        [
          { text: 'OK' },
          { 
            text: 'View Details', 
            onPress: () => router.push({ pathname: '/call-details', params: { callId: call.id } })
          },
        ]
      );
    } catch (error) {
      console.error('Error testing legit call:', error);
      Alert.alert('Error', 'Failed to test. Please try again.');
    } finally {
      setTestingLegit(false);
    }
  };

  const getStatusColor = () => {
    switch (healthStatus) {
      case 'connected': return '#22c55e';
      case 'error': return '#f59e0b';
      default: return '#dc2626';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t.dashboard.title}</Text>
            <View style={styles.connectionStatus}>
              <View style={[styles.connectionDot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.connectionText}>
                {healthStatus === 'connected' ? 'Server Connected' : healthStatus === 'checking' ? 'Connecting...' : 'Offline'}
              </Text>
            </View>
          </View>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, isActive ? styles.statusActive : styles.statusInactive]} />
            <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
              {isActive ? t.dashboard.protected : t.dashboard.notActive}
            </Text>
          </View>
        </View>

        {/* Main Shield */}
        <View style={styles.shieldContainer}>
          <TouchableOpacity
            style={[
              styles.shieldOuter,
              isActive ? styles.shieldActive : styles.shieldInactive
            ]}
            onPress={toggleProtection}
            activeOpacity={0.8}
          >
            <View style={[
              styles.shieldInner,
              isActive ? styles.shieldInnerActive : styles.shieldInnerInactive
            ]}>
              <Ionicons 
                name={isActive ? 'shield-checkmark' : 'shield-outline'} 
                size={80} 
                color="#fff" 
              />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.shieldLabel}>
            {isActive ? t.dashboard.protected : t.dashboard.notActive}
          </Text>
          <Text style={styles.shieldSubtext}>
            {isActive ? t.dashboard.watchingCalls : t.dashboard.protectionOff}
          </Text>
          <Text style={styles.tapHint}>Tap to {isActive ? 'disable' : 'enable'}</Text>
        </View>

        {/* Pending Calls Banner */}
        {pendingCalls > 0 && (
          <View style={styles.pendingBanner}>
            <Ionicons name="cloud-upload" size={20} color="#3b82f6" />
            <Text style={styles.pendingText}>
              {pendingCalls} call{pendingCalls > 1 ? 's' : ''} pending upload
            </Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.syncText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="call" size={24} color="#6366f1" style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.total_calls}</Text>
            <Text style={styles.statLabel}>Calls Analyzed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="warning" size={24} color="#dc2626" style={styles.statIcon} />
            <Text style={[styles.statNumber, styles.statDanger]}>{stats.scam_calls}</Text>
            <Text style={styles.statLabel}>Scams Detected</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="notifications" size={24} color="#22c55e" style={styles.statIcon} />
            <Text style={[styles.statNumber, styles.statSuccess]}>{stats.alerts_sent}</Text>
            <Text style={styles.statLabel}>Alerts Sent</Text>
          </View>
        </View>

        {/* Emergency Contact Button */}
        {primaryContact && (
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={callEmergencyContact}
            activeOpacity={0.7}
          >
            <View style={styles.emergencyIcon}>
              <Ionicons name="call" size={28} color="#fff" />
            </View>
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyLabel}>{t.dashboard.callContact}</Text>
              <Text style={styles.emergencyName}>{primaryContact.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/history')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="time" size={24} color="#6366f1" />
            </View>
            <Text style={styles.actionText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="people" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>Contacts</Text>
          </TouchableOpacity>
        </View>

        {/* Test Section */}
        <Text style={styles.sectionTitle}>Test Detection</Text>
        <View style={styles.testContainer}>
          <TouchableOpacity
            style={[styles.testButton, styles.testButtonScam]}
            onPress={testScamDetection}
            disabled={testingScam || testingLegit}
          >
            {testingScam ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="warning" size={22} color="#fff" />
                <Text style={styles.testButtonTextLight}>Test Scam Call</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.testButtonLegit]}
            onPress={testLegitCall}
            disabled={testingScam || testingLegit}
          >
            {testingLegit ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.testButtonTextLight}>Test Safe Call</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#6366f1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              StopFrauda monitors incoming calls from unknown numbers. When a suspicious call is detected, AI analyzes the conversation and alerts your emergency contacts.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#22c55e',
  },
  statusInactive: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#22c55e',
  },
  statusTextInactive: {
    color: '#9ca3af',
  },
  shieldContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldActive: {
    backgroundColor: '#dcfce7',
  },
  shieldInactive: {
    backgroundColor: '#f3f4f6',
  },
  shieldInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInnerActive: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  shieldInnerInactive: {
    backgroundColor: '#9ca3af',
  },
  shieldLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  shieldSubtext: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  pendingText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
  },
  syncText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 2,
  },
  statDanger: {
    color: '#dc2626',
  },
  statSuccess: {
    color: '#22c55e',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  emergencyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyLabel: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 2,
  },
  emergencyName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e40af',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  testContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testButtonScam: {
    backgroundColor: '#dc2626',
  },
  testButtonLegit: {
    backgroundColor: '#22c55e',
  },
  testButtonTextLight: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f0ff',
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
});
