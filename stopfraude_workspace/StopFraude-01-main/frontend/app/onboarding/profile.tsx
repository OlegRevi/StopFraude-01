import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';

export default function ProfileScreen() {
  const router = useRouter();
  const { language, userProfile, setUserProfile } = useAppStore();
  const t = translations[language];

  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '+373');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const cleanEmail = email.trim();

    if (!cleanName) newErrors.name = t.profile.errors.nameRequired;
    else if (cleanName.length < 2) newErrors.name = t.profile.errors.nameTooShort;

    if (!cleanPhone || cleanPhone === '+' || cleanPhone === '+373') {
      newErrors.phone = t.profile.errors.phoneRequired;
    } else if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
      newErrors.phone = t.profile.errors.phoneInvalid;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = t.profile.errors.emailInvalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) {
      Alert.alert(t.profile.errors.title, t.profile.errors.fixFields);
      return;
    }
    setUserProfile({
      name: name.trim(),
      phone: phone.replace(/[\s\-()]/g, ''),
      email: email.trim() || undefined,
    });
    router.push('/onboarding/contacts');
  };

  return (
    <SafeAreaView style={styles.container} testID="profile-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            testID="profile-back-button"
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-circle" size={48} color="#6366f1" />
            </View>
            <Text style={styles.title}>{t.profile.title}</Text>
            <Text style={styles.subtitle}>{t.profile.subtitle}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {t.profile.nameLabel} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  placeholder={t.profile.namePlaceholder}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  returnKeyType="next"
                  testID="profile-name-input"
                />
              </View>
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {t.profile.phoneLabel} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    if (errors.phone) setErrors({ ...errors, phone: undefined });
                  }}
                  placeholder="+373XXXXXXXX"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  testID="profile-phone-input"
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              <Text style={styles.helperText}>{t.profile.phoneHelper}</Text>
            </View>

            {/* Email (optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {t.profile.emailLabel} <Text style={styles.optional}>({t.profile.optional})</Text>
              </Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  testID="profile-email-input"
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Info card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#6366f1" />
              <Text style={styles.infoText}>{t.profile.info}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            testID="profile-continue-button"
          >
            <Text style={styles.continueButtonText}>{t.profile.continue}</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  required: {
    color: '#dc2626',
  },
  optional: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
