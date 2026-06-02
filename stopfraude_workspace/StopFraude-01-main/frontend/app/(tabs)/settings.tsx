import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';
import LanguageSelector from '../../src/components/LanguageSelector';
import apiService from '../../src/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, language, setUser, reset } = useAppStore();
  const t = translations[language];
  const [showLangSelector, setShowLangSelector] = useState(false);

  const isActive = user?.is_active ?? false;

  const toggleProtection = async () => {
    if (!user?.id) return;
    try {
      const updatedUser = await apiService.updateUser(user.id, {
        is_active: !isActive,
      });
      setUser(updatedUser);
    } catch (error) {
      console.error('Error toggling protection:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Reset App',
      'Are you sure you want to reset the app? This will clear all data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            reset();
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.settings.title}</Text>
        </View>

        {/* User Info */}
        <View style={styles.userCard} testID="user-profile-card">
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color="#6366f1" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} testID="user-name">
              {user?.name || 'Protected User'}
            </Text>
            <Text style={styles.userPhone} testID="user-phone">
              {user?.phone || 'No phone'}
            </Text>
            {user?.email ? (
              <Text style={styles.userEmail} testID="user-email">{user.email}</Text>
            ) : null}
          </View>
          <View style={[
            styles.statusBadge,
            isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
          ]}>
            <Text style={[
              styles.statusBadgeText,
              isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive
            ]}>
              {isActive ? t.settings.active : t.settings.inactive}
            </Text>
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Protection</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="shield" size={22} color="#6366f1" />
            </View>
            <Text style={styles.settingLabel}>{t.settings.protection}</Text>
            <Switch
              value={isActive}
              onValueChange={toggleProtection}
              trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
              thumbColor={isActive ? '#6366f1' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => setShowLangSelector(true)}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="globe" size={22} color="#6366f1" />
            </View>
            <Text style={styles.settingLabel}>{t.settings.language}</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {language === 'en' ? 'English' : 'Română'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/onboarding/contacts')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="people" size={22} color="#6366f1" />
            </View>
            <Text style={styles.settingLabel}>{t.settings.emergencyContacts}</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {user?.emergency_contacts?.length || 0} contacts
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/recording-settings')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="mic" size={22} color="#6366f1" />
            </View>
            <Text style={styles.settingLabel}>Recording Settings</Text>
            <View style={styles.settingValue}>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle" size={22} color="#6366f1" />
            </View>
            <Text style={styles.settingLabel}>{t.settings.about}</Text>
            <Text style={styles.settingValueText}>{t.settings.version}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color="#dc2626" />
          <Text style={styles.logoutText}>Reset App</Text>
        </TouchableOpacity>
      </ScrollView>

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
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  userEmail: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeInactive: {
    backgroundColor: '#f3f4f6',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadgeTextActive: {
    color: '#166534',
  },
  statusBadgeTextInactive: {
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValueText: {
    fontSize: 15,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
});
