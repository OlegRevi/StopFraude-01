import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';
import LanguageSelector from '../../src/components/LanguageSelector';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { language } = useAppStore();
  const [showLangSelector, setShowLangSelector] = useState(false);
  const t = translations[language];

  const features = [
    { icon: 'shield-checkmark', text: t.welcome.features.detect },
    { icon: 'notifications', text: t.welcome.features.alert },
    { icon: 'time', text: t.welcome.features.protect },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Language Selector Button */}
      <TouchableOpacity 
        style={styles.langButton}
        onPress={() => setShowLangSelector(true)}
      >
        <Ionicons name="globe-outline" size={24} color="#6366f1" />
        <Text style={styles.langText}>{language.toUpperCase()}</Text>
      </TouchableOpacity>

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.iconContainer}>
          <View style={styles.shieldOuter}>
            <View style={styles.shieldInner}>
              <Ionicons name="shield-checkmark" size={64} color="#fff" />
            </View>
          </View>
        </View>
        
        <Text style={styles.title}>{t.welcome.title}</Text>
        <Text style={styles.subtitle}>{t.welcome.subtitle}</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon as any} size={24} color="#6366f1" />
            </View>
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* Get Started Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/onboarding/permissions')}
      >
        <Text style={styles.buttonText}>{t.welcome.getStarted}</Text>
        <Ionicons name="arrow-forward" size={24} color="#fff" />
      </TouchableOpacity>

      <LanguageSelector 
        visible={showLangSelector} 
        onClose={() => setShowLangSelector(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  shieldOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  features: {
    paddingVertical: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
