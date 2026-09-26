import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { saveUserProfile, getUserProfile } from '../services/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, isRomanian } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadExisting() {
      const profile = await getUserProfile();
      if (profile) {
        if (profile.name) setName(profile.name);
        if (profile.phone) setPhone(profile.phone);
      }
    }
    loadExisting();
  }, []);

  const handleContinue = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert(
        isRomanian ? 'Nume Necesar' : 'Name Required',
        t('profileValidationName')
      );
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 5) {
      Alert.alert(
        isRomanian ? 'Telefon Necesar' : 'Phone Required',
        t('profileValidationPhone')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await saveUserProfile({
        name: trimmedName,
        phone: trimmedPhone,
      });
      router.push('/permissions');
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim().length >= 2 && phone.trim().length >= 5;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Row: Back Button & Step Badge */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{t('profileStepBadge')}</Text>
            </View>
          </View>

          {/* Hero Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>👤</Text>
            </View>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.headerBox}>
            <Text style={styles.title}>{t('profileTitle')}</Text>
            <Text style={styles.subtitle}>{t('profileSubtitle')}</Text>
          </View>

          {/* Input Cards */}
          <View style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profileNameLabel')}</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✍️</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('profileNamePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.hint}>{t('profileNameHint')}</Text>
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profilePhoneLabel')}</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('profilePhonePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.hint}>{t('profilePhoneHint')}</Text>
            </View>

            {/* Dynamic SMS Preview Card */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>
                  {isRomanian ? '💬 Previzualizare SMS Gardieni' : '💬 Guardian SMS Preview'}
                </Text>
              </View>
              <Text style={styles.previewBody}>
                {isRomanian
                  ? `🛡️ Notificare StopFrauda: Bună [Gardian], ${name.trim() || 'Elena Popescu'} te-a desemnat Gardian de Urgență...`
                  : `🛡️ StopFrauda Notice: Hello [Guardian], ${name.trim() || 'Elena Popescu'} has designated you as an Emergency Guardian...`}
              </Text>
            </View>
          </View>

          {/* Bottom CTA */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !isFormValid && styles.primaryButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleContinue}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {t('profileContinueBtn')}
              </Text>
              <Text style={styles.arrowIcon}>→</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E6F9F5',
    borderWidth: 1,
    borderColor: '#B3EFE3',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0BBF98',
    letterSpacing: 0.5,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E6F9F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B3EFE3',
  },
  iconEmoji: {
    fontSize: 32,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },
  previewCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  footerContainer: {
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0BBF98',
    borderRadius: 18,
    height: 54,
    shadowColor: '#0BBF98',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0.05,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 8,
  },
  arrowIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
