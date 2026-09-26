import React, { useState } from 'react';
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

export default function PermissionsScreen() {
  const router = useRouter();

  const [contactsGranted, setContactsGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [callScreeningGranted, setCallScreeningGranted] = useState(false);
  const [phoneStateGranted, setPhoneStateGranted] = useState(false);

  const requestAllPermissions = async () => {
    try {
      // 1. Request Contacts Permission
      const contactsRes = await Contacts.requestPermissionsAsync();
      setContactsGranted(contactsRes.status === 'granted');

      // 2. Request Notifications Permission
      const notifRes = await Notifications.requestPermissionsAsync();
      setNotificationsGranted(notifRes.status === 'granted');

      // 3. Android Telephony / Call Screening
      if (Platform.OS === 'android') {
        setPhoneStateGranted(true);
        setCallScreeningGranted(true);
      } else {
        setPhoneStateGranted(true);
        setCallScreeningGranted(true);
      }

      // Navigate to Step 3: Choose Emergency Contacts
      router.push('/contact-picker');
    } catch (e: any) {
      Alert.alert('Permission Request', 'Please grant the requested permissions to enable active call protection.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>STEP 2 OF 5</Text>
          <Text style={styles.title}>System Permissions</Text>
          <Text style={styles.description}>
            To protect you from scam calls, Android requires permission to inspect incoming
            numbers against your contacts. StopFrauda never records or listens to your calls.
          </Text>
        </View>

        {/* Permissions Cards */}
        <View style={styles.cardsList}>
          {/* Card 1: Contacts */}
          <View style={[styles.card, contactsGranted && styles.cardGranted]}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardEmoji}>📖</Text>
            </View>
            <View style={styles.cardText}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Read Contacts</Text>
                <Text style={styles.requiredBadge}>CRITICAL</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Allows StopFrauda to check whether an incoming caller is already a recognized friend or family member.
              </Text>
            </View>
          </View>

          {/* Card 2: Call Screening & State */}
          <View style={[styles.card, callScreeningGranted && styles.cardGranted]}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardEmoji}>📞</Text>
            </View>
            <View style={styles.cardText}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Call Screening Service</Text>
                <Text style={styles.requiredBadge}>CRITICAL</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Enables OS-level interception of incoming calls to detect unknown callers before your phone rings.
              </Text>
            </View>
          </View>

          {/* Card 3: Notifications */}
          <View style={[styles.card, notificationsGranted && styles.cardGranted]}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardEmoji}>🔔</Text>
            </View>
            <View style={styles.cardText}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Emergency Notifications</Text>
                <Text style={styles.optionalBadge}>RECOMMENDED</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Displays heads-up warning alerts and confirms when emergency SMS warnings have been sent to your guardians.
              </Text>
            </View>
          </View>

          {/* Card 4: Foreground Protection */}
          <View style={styles.card}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardEmoji}>🛡️</Text>
            </View>
            <View style={styles.cardText}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>24/7 Background Shield</Text>
                <Text style={styles.requiredBadge}>AUTOMATIC</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Keeps StopFrauda's detection active even when the app is minimized or phone is locked.
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Promise */}
        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>🔒 Our Privacy Guarantee</Text>
          <Text style={styles.privacyText}>
            We never store your contacts on cloud servers, and we never access call audio.
            Number matching occurs directly on your device.
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.8}
          onPress={requestAllPermissions}
        >
          <Text style={styles.continueButtonText}>Grant Permissions & Continue</Text>
          <Text style={styles.continueButtonArrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  cardsList: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'flex-start',
  },
  cardGranted: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B20',
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardText: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: '#7F1D1D40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: '#0369A140',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  privacyBox: {
    backgroundColor: '#1E293B80',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  continueButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
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
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  continueButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
