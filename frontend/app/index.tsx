import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { isOnboardingCompleted } from '../services/storage';

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const completed = await isOnboardingCompleted();
      if (completed) {
        router.replace('/(tabs)/dashboard');
      } else {
        setChecking(false);
      }
    }
    checkStatus();
  }, []);

  if (checking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Shield Graphic Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🛡️</Text>
          </View>
        </View>

        {/* Title & Core Value Proposition */}
        <Text style={styles.appName}>StopFrauda</Text>
        <Text style={styles.tagline}>
          Never worry about phone scams again.
        </Text>

        {/* Feature Highlights */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>⚡</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>OS-Level Call Screening</Text>
              <Text style={styles.featureDesc}>
                Intercepts unknown numbers instantly before fraud can happen.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>👨‍👩‍👧‍👦</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Family Emergency Guardians</Text>
              <Text style={styles.featureDesc}>
                Up to 5 trusted loved ones receive an immediate Twilio SMS alert.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>🔒</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>100% Private & Secure</Text>
              <Text style={styles.featureDesc}>
                Zero call audio recording or transcription. Only contact matching.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={() => router.push('/permissions')}
        >
          <Text style={styles.primaryButtonText}>Activate Scam Shield</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Early Bird Promotion: 1 Year Free for early signups!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 48,
  },
  tag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginTop: 12,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E2E8F0',
    textAlign: 'center',
    marginTop: 8,
  },
  subtext: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  featureList: {
    marginVertical: 16,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  featureBullet: {
    fontSize: 24,
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  featureDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  footnote: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 10,
  },
});
