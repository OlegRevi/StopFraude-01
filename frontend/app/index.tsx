import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { isOnboardingCompleted } from '../services/storage';
import { Colors } from '../constants/theme';

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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bar with Language Selector */}
        <View style={styles.topBar}>
          <View style={styles.langPill}>
            <Text style={styles.langIcon}>🌐</Text>
            <Text style={styles.langText}>EN</Text>
          </View>
        </View>

        {/* Hero Concentric Shield Icon with Official Logo */}
        <View style={styles.heroContainer}>
          <View style={styles.outerCircle}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Main Title & Subtitle */}
        <View style={styles.headerBox}>
          <Text style={styles.appName}>StopFrauda</Text>
          <Text style={styles.mainTitle}>
            Protect Your Loved Ones From Phone Scams
          </Text>
          <Text style={styles.subtitle}>
            AI-powered protection that alerts your family when suspicious calls are detected
          </Text>
        </View>

        {/* Feature List Cards */}
        <View style={styles.featureContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.badgeEmoji}>🛡️</Text>
            </View>
            <Text style={styles.featureText}>Detect scam calls automatically</Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.badgeEmoji}>🔔</Text>
            </View>
            <Text style={styles.featureText}>Alert family members instantly</Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.badgeEmoji}>🕒</Text>
            </View>
            <Text style={styles.featureText}>24/7 protection for loved ones</Text>
          </View>
        </View>

        {/* Bottom CTA & Promotion */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/permissions')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <Text style={styles.promoText}>
            🎉 Early Bird Special: 1 Year Free Protection Included!
          </Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  langIcon: {
    fontSize: 14,
  },
  langText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  heroContainer: {
    alignItems: 'center',
    marginVertical: 18,
  },
  outerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#E0E7FF',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 35,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  featureContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeEmoji: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  footerContainer: {
    marginTop: 'auto',
  },
  primaryButton: {
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
  primaryButtonText: {
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
  promoText: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 12,
  },
});
