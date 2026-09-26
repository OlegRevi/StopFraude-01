import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';
import { Colors } from '../constants/theme';

export default function PermissionsScreen() {
  const router = useRouter();

  const [contactsGranted, setContactsGranted] = useState(false);
  const [phoneGranted, setPhoneGranted] = useState(true); // Default true for simulation/OS
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    try {
      const contactsRes = await Contacts.getPermissionsAsync();
      setContactsGranted(contactsRes.status === 'granted');

      const notifRes = await Notifications.getPermissionsAsync();
      setNotificationsGranted(notifRes.status === 'granted');
    } catch {
      // Default initial states
    }
  };

  const handleRequestContacts = async () => {
    try {
      const res = await Contacts.requestPermissionsAsync();
      setContactsGranted(res.status === 'granted');
    } catch {
      setContactsGranted(true);
    }
  };

  const handleRequestNotifications = async () => {
    try {
      const res = await Notifications.requestPermissionsAsync();
      setNotificationsGranted(res.status === 'granted');
    } catch {
      setNotificationsGranted(true);
    }
  };

  const handleContinue = async () => {
    try {
      if (!contactsGranted) {
        const res = await Contacts.requestPermissionsAsync();
        setContactsGranted(res.status === 'granted');
      }
      if (!notificationsGranted) {
        const res = await Notifications.requestPermissionsAsync();
        setNotificationsGranted(res.status === 'granted');
      }
    } catch (e) {
      console.warn('Permissions request handled:', e);
    } finally {
      // Navigate to Step 3: Choose Emergency Contacts
      router.push('/contact-picker');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header with Back Button */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backCircle}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Center Key Icon Badge */}
        <View style={styles.keyBadgeContainer}>
          <View style={styles.keyCircle}>
            <Text style={styles.keyEmoji}>🔑</Text>
          </View>
        </View>

        {/* Title & Subtitle */}
        <View style={styles.header}>
          <Text style={styles.title}>We Need Your Permission</Text>
          <Text style={styles.description}>
            To protect you from scams, we need access to:
          </Text>
        </View>

        {/* Permissions Cards List */}
        <View style={styles.cardsList}>
          {/* Card 1: Contacts */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={handleRequestContacts}
          >
            <View style={styles.cardLeftIcon}>
              <Text style={styles.cardEmoji}>👥</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Contacts</Text>
              <Text style={styles.cardSubtitle}>
                To select emergency contacts from your phone
              </Text>
            </View>
            <View style={[styles.statusBadge, contactsGranted ? styles.statusGranted : styles.statusPending]}>
              <Text style={[styles.statusCheck, contactsGranted && styles.statusCheckActive]}>✓</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Phone */}
          <View style={styles.card}>
            <View style={styles.cardLeftIcon}>
              <Text style={styles.cardEmoji}>📞</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Phone</Text>
              <Text style={styles.cardSubtitle}>
                To detect incoming calls in real-time
              </Text>
            </View>
            <View style={[styles.statusBadge, phoneGranted ? styles.statusGranted : styles.statusPending]}>
              <Text style={[styles.statusCheck, phoneGranted && styles.statusCheckActive]}>✓</Text>
            </View>
          </View>

          {/* Card 3: Notifications */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={handleRequestNotifications}
          >
            <View style={styles.cardLeftIcon}>
              <Text style={styles.cardEmoji}>🔔</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardSubtitle}>
                To alert you when an unknown call is detected
              </Text>
            </View>
            <View style={[styles.statusBadge, notificationsGranted ? styles.statusGranted : styles.statusPending]}>
              <Text style={[styles.statusCheck, notificationsGranted && styles.statusCheckActive]}>✓</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom CTA */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.85}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Text style={styles.continueButtonArrow}>→</Text>
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topNav: {
    paddingTop: 8,
    marginBottom: 8,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  keyBadgeContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  keyCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmoji: {
    fontSize: 38,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsList: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeftIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  statusGranted: {
    backgroundColor: Colors.successLight,
  },
  statusPending: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusCheck: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  statusCheckActive: {
    color: Colors.success,
  },
  footerContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  continueButton: {
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
  continueButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  continueButtonArrow: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
  },
});
