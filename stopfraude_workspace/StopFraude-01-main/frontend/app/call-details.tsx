import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, CallRecord } from '../src/store/appStore';
import { translations } from '../src/i18n/translations';
import apiService from '../src/services/api';
import ScamScoreBadge from '../src/components/ScamScoreBadge';

export default function CallDetailsScreen() {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const router = useRouter();
  const { language } = useAppStore();
  const t = translations[language];
  
  const [call, setCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (callId) {
      loadCall();
    }
  }, [callId]);

  const loadCall = async () => {
    try {
      const callData = await apiService.getCall(callId!);
      setCall(callData);
    } catch (error) {
      console.error('Error loading call:', error);
      Alert.alert('Error', 'Failed to load call details');
    } finally {
      setLoading(false);
    }
  };

  const markAsFeedback = async (feedback: 'scam' | 'legit') => {
    if (!call) return;
    setUpdating(true);
    try {
      await apiService.updateCallFeedback(call.id, feedback);
      setCall({ ...call, user_feedback: feedback });
      Alert.alert(
        'Thank you!',
        feedback === 'scam' 
          ? 'Marked as real scam. This helps improve our detection.'
          : 'Marked as false alarm. Sorry for the inconvenience!'
      );
    } catch (error) {
      console.error('Error updating feedback:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScamTypeLabel = (scamType: string) => {
    const key = scamType as keyof typeof t.scamTypes;
    return t.scamTypes[key] || scamType.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Call Details' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  if (!call) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Call Details' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#dc2626" />
          <Text style={styles.errorText}>Call not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isScam = (call.scam_score || 0) > 70;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Call Details',
          headerShown: true,
          headerStyle: { backgroundColor: '#f8fafc' },
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Alert Banner */}
        {isScam && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={24} color="#dc2626" />
            <Text style={styles.alertText}>
              Suspicious call detected! Review the details below.
            </Text>
          </View>
        )}

        {/* Scam Score */}
        <View style={styles.scoreCard}>
          <ScamScoreBadge score={call.scam_score || 0} size="large" />
          {call.scam_type && (
            <View style={styles.scamTypeChip}>
              <Text style={styles.scamTypeText}>
                {getScamTypeLabel(call.scam_type)}
              </Text>
            </View>
          )}
        </View>

        {/* Call Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Call Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Caller Number</Text>
            <Text style={styles.infoValue}>{call.caller_number}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date & Time</Text>
            <Text style={styles.infoValue}>{formatDate(call.timestamp)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{formatDuration(call.duration_seconds)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Alert Sent</Text>
            <Text style={styles.infoValue}>
              {call.alerted ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>

        {/* Transcript */}
        {call.transcript && (
          <View style={styles.transcriptCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={22} color="#6366f1" />
              <Text style={styles.cardTitle}>Transcript</Text>
            </View>
            <Text style={styles.transcript}>{call.transcript}</Text>
          </View>
        )}

        {/* Detected Keywords */}
        {call.detected_keywords && call.detected_keywords.length > 0 && (
          <View style={styles.keywordsCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="flag" size={22} color="#dc2626" />
              <Text style={styles.cardTitle}>Detected Red Flags</Text>
            </View>
            <View style={styles.keywordsList}>
              {call.detected_keywords.map((keyword, index) => (
                <View key={index} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Analysis Explanation */}
        {call.explanation && (
          <View style={styles.explanationCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="bulb" size={22} color="#f59e0b" />
              <Text style={styles.cardTitle}>AI Analysis</Text>
            </View>
            <Text style={styles.explanation}>
              {language === 'ro' && call.explanation_ro ? call.explanation_ro : call.explanation}
            </Text>
          </View>
        )}

        {/* Feedback Section */}
        {!call.user_feedback && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Is this a real scam?</Text>
            <Text style={styles.feedbackSubtitle}>
              Your feedback helps improve our detection
            </Text>
            
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.feedbackButtonScam]}
                onPress={() => markAsFeedback('scam')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.feedbackButtonText}>Yes, Real Scam</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.feedbackButton, styles.feedbackButtonLegit]}
                onPress={() => markAsFeedback('legit')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.feedbackButtonText}>No, False Alarm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Feedback Given */}
        {call.user_feedback && (
          <View style={styles.feedbackGiven}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={call.user_feedback === 'scam' ? '#dc2626' : '#22c55e'} 
            />
            <Text style={styles.feedbackGivenText}>
              You marked this as: {call.user_feedback === 'scam' ? 'Real Scam' : 'False Alarm'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    marginTop: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  alertText: {
    flex: 1,
    fontSize: 15,
    color: '#dc2626',
    fontWeight: '500',
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  scamTypeChip: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  scamTypeText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  transcriptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transcript: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  keywordsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  explanationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  explanation: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  feedbackSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  feedbackButtonScam: {
    backgroundColor: '#dc2626',
  },
  feedbackButtonLegit: {
    backgroundColor: '#22c55e',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackGiven: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  feedbackGivenText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
});
