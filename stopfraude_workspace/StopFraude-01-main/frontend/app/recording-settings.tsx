import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import callRecordingService, { RecordingSettings } from '../src/services/callRecordingService';
import callDetectionService from '../src/services/callDetectionService';

export default function RecordingSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<RecordingSettings>({
    enabled: true,
    recordUnknownOnly: true,
    autoAnalyze: true,
    notifyOnScam: true,
    minDurationSeconds: 10,
  });
  const [isListening, setIsListening] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadSettings();
    updateStatus();
  }, []);

  const loadSettings = async () => {
    const currentSettings = callRecordingService.getSettings();
    setSettings(currentSettings);
  };

  const updateStatus = () => {
    if (Platform.OS === 'android') {
      setIsListening(callDetectionService.getCurrentState() !== 'Disconnected');
    }
    setPendingCount(callRecordingService.getPendingCount());
  };

  const handleSettingChange = async (key: keyof RecordingSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await callRecordingService.saveSettings({ [key]: value });
  };

  const handleTestRecording = async () => {
    Alert.alert(
      '🎙️ Test Recording',
      'This will start a 5-second test recording to verify microphone access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Test',
          onPress: async () => {
            try {
              const started = await callRecordingService.startRecording('TEST_NUMBER');
              if (started) {
                Alert.alert('Recording...', 'Recording for 5 seconds...');
                setTimeout(async () => {
                  const session = await callRecordingService.stopRecording();
                  if (session) {
                    Alert.alert(
                      '✅ Test Complete',
                      `Recording successful!\nDuration: ${session.duration}s\nFile saved.`
                    );
                  }
                }, 5000);
              } else {
                Alert.alert('❌ Failed', 'Could not start recording. Check microphone permissions.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to test recording.');
            }
          },
        },
      ]
    );
  };

  const handleRetryFailed = async () => {
    const retried = await callRecordingService.retryFailedRecordings();
    Alert.alert('Retry Complete', `${retried} recording(s) queued for processing.`);
    updateStatus();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, settings.enabled ? styles.statusActive : styles.statusInactive]} />
              <Text style={styles.statusLabel}>Recording</Text>
              <Text style={styles.statusValue}>{settings.enabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Ionicons name="time" size={20} color="#6366f1" />
              <Text style={styles.statusLabel}>Pending</Text>
              <Text style={styles.statusValue}>{pendingCount}</Text>
            </View>
          </View>
        </View>

        {/* Platform Notice */}
        {Platform.OS !== 'android' && (
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle" size={24} color="#f59e0b" />
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Android Only</Text>
              <Text style={styles.noticeText}>
                Automatic call recording is only available on Android with EAS Build. 
                Use the web preview for testing other features.
              </Text>
            </View>
          </View>
        )}

        {/* Recording Settings */}
        <Text style={styles.sectionTitle}>Recording Options</Text>
        
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="mic" size={22} color="#6366f1" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Enable Recording</Text>
                <Text style={styles.settingDescription}>Record calls for scam analysis</Text>
              </View>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => handleSettingChange('enabled', value)}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={settings.enabled ? '#6366f1' : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="person-remove" size={22} color="#6366f1" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Unknown Callers Only</Text>
                <Text style={styles.settingDescription}>Skip recording known contacts</Text>
              </View>
            </View>
            <Switch
              value={settings.recordUnknownOnly}
              onValueChange={(value) => handleSettingChange('recordUnknownOnly', value)}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={settings.recordUnknownOnly ? '#6366f1' : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="analytics" size={22} color="#6366f1" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto-Analyze</Text>
                <Text style={styles.settingDescription}>Analyze recordings automatically</Text>
              </View>
            </View>
            <Switch
              value={settings.autoAnalyze}
              onValueChange={(value) => handleSettingChange('autoAnalyze', value)}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={settings.autoAnalyze ? '#6366f1' : '#9ca3af'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={22} color="#6366f1" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Scam Notifications</Text>
                <Text style={styles.settingDescription}>Alert when scam is detected</Text>
              </View>
            </View>
            <Switch
              value={settings.notifyOnScam}
              onValueChange={(value) => handleSettingChange('notifyOnScam', value)}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={settings.notifyOnScam ? '#6366f1' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleTestRecording}>
            <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="mic-circle" size={24} color="#3b82f6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Test Recording</Text>
              <Text style={styles.actionDescription}>Verify microphone access</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {pendingCount > 0 && (
            <TouchableOpacity style={styles.actionButton} onPress={handleRetryFailed}>
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="refresh" size={24} color="#f59e0b" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Retry Failed Uploads</Text>
                <Text style={styles.actionDescription}>{pendingCount} pending recording(s)</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Privacy First</Text>
            <Text style={styles.infoText}>
              Recordings are only used for scam detection analysis. They are automatically deleted after processing. 
              No recordings are shared with third parties.
            </Text>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>How Call Recording Works</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepText}>When you receive a call from an unknown number, recording starts automatically</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepText}>After the call ends, the recording is transcribed and analyzed by AI</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepText}>If a scam is detected, you and your emergency contacts are alerted</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#22c55e',
  },
  statusInactive: {
    backgroundColor: '#9ca3af',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b45309',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
  actionsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#15803d',
    lineHeight: 18,
  },
  howItWorksCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
});
