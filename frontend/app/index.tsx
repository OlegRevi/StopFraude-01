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
import { StopFraudaBrand } from '../components/StopFraudaBrand';
import { useLanguage } from '../context/LanguageContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { language, setLanguage, t, isRomanian } = useLanguage();

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
          <View style={styles.langSelector}>
            <TouchableOpacity
              style={[styles.langChoice, isRomanian && styles.langChoiceActive]}
              activeOpacity={0.7}
              onPress={() => setLanguage('ro')}
            >
              <Text style={[styles.langChoiceText, isRomanian && styles.langChoiceTextActive]}>
                🇷🇴 RO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChoice, !isRomanian && styles.langChoiceActive]}
              activeOpacity={0.7}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langChoiceText, !isRomanian && styles.langChoiceTextActive]}>
                🇬🇧 EN
              </Text>
            </TouchableOpacity>
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
          <StopFraudaBrand style={styles.appName} />
          <Text style={styles.mainTitle}>
            {t('welcomeTagline')}
          </Text>
          <Text style={styles.subtitle}>
            {isRomanian
              ? 'Protecție inteligentă care alertează instant familia ta când este detectat un apel suspect'
              : 'AI-powered protection that alerts your family when suspicious calls are detected'}
          </Text>
        </View>

        {/* Feature List Cards */}
        <View style={styles.featureContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.badgeEmoji}>🛡️</Text>
            </View>
            <Text style={styles.featureText}>{t('welcomeFeature1')}</Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.badgeEmoji}>🔔</Text>
            </View>
            <Text style={styles.featureText}>{t('welcomeFeature2')}</Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.badgeEmoji}>🕒</Text>
            </View>
            <Text style={styles.featureText}>{t('welcomeFeature3')}</Text>
          </View>
        </View>

        {/* Bottom CTA & Promotion */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/permissions')}
          >
            <Text style={styles.primaryButtonText}>{t('welcomeActivateBtn')}</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <Text style={styles.promoText}>
            {isRomanian
              ? '🎉 Ofertă Specială: 1 An de Protecție Gratuită Inclus!'
              : '🎉 Early Bird Special: 1 Year Free Protection Included!'}
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
  langSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  langChoice: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  langChoiceActive: {
    backgroundColor: Colors.primary,
  },
  langChoiceText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  langChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
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
