import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { EmergencyContact } from '../types';
import { saveLocalContacts, getLocalContacts } from '../services/storage';
import { Colors } from '../constants/theme';

const AVATAR_COLORS = [
  '#EC4899', // Pink
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ContactPickerScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [phonebookContacts, setPhonebookContacts] = useState<Contacts.Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
          sort: Contacts.SortTypes.FirstName,
        });

        const validContacts = data.filter(
          (c) => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name
        );
        setPhonebookContacts(validContacts);

        const saved = await getLocalContacts();
        if (saved && saved.length > 0) {
          setSelectedContacts(saved);
        }
      } else {
        // Fallback sample contacts for web / simulator
        setPhonebookContacts([
          {
            id: 'c1',
            name: 'Irina Bazic - Revulet',
            contactType: Contacts.ContactType.Person,
            phoneNumbers: [{ number: '+373 780 15011', label: 'mobile' }],
          },
          {
            id: 'c2',
            name: 'Mom (Family)',
            contactType: Contacts.ContactType.Person,
            phoneNumbers: [{ number: '060946444', label: 'mobile' }],
          },
          {
            id: 'c3',
            name: 'Dad (Family)',
            contactType: Contacts.ContactType.Person,
            phoneNumbers: [{ number: '061034633', label: 'mobile' }],
          },
          {
            id: 'c4',
            name: 'Sister Sarah',
            contactType: Contacts.ContactType.Person,
            phoneNumbers: [{ number: '+1 (555) 019-2834', label: 'mobile' }],
          },
        ]);
      }
    } catch (e: any) {
      console.warn('Error fetching contacts', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectContact = (contact: Contacts.Contact) => {
    const rawNumber = contact.phoneNumbers?.[0]?.number || '';
    const cleanNumber = rawNumber.replace(/\s+/g, '');
    const contactName = contact.name || 'Emergency Contact';
    const contactEmail = contact.emails?.[0]?.email || '';

    const isAlreadySelected = selectedContacts.some(
      (c) => c.phone === cleanNumber || c.name === contactName
    );

    if (isAlreadySelected) {
      setSelectedContacts(
        selectedContacts.filter(
          (c) => c.phone !== cleanNumber && c.name !== contactName
        )
      );
    } else {
      if (selectedContacts.length >= 5) {
        Alert.alert(
          'Maximum Guardians Reached',
          'You can designate up to 5 emergency guardians. Deselect one first to add another.'
        );
        return;
      }

      setSelectedContacts([
        ...selectedContacts,
        {
          name: contactName,
          phone: cleanNumber,
          email: contactEmail,
          isVerified: false,
        },
      ]);
    }
  };

  const handleContinue = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert(
        'Guardian Required',
        'At least one emergency guardian is mandatory to protect your phone. Please select a contact to alert if a scam is detected.'
      );
      return;
    }

    await saveLocalContacts(selectedContacts);
    router.push('/paywall');
  };

  const filteredContacts = phonebookContacts.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backCircle}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 3 OF 5</Text>
        </View>
      </View>

      {/* Title & Subtitle */}
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <Text style={styles.subtitle}>
          Who should we alert if a scam is detected?
        </Text>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search your contacts..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Only contacts already in your phone can be added
          </Text>
          <TouchableOpacity onPress={loadContacts}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Guardians Horizontal Pills (if any) */}
      {selectedContacts.length > 0 && (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedCountBadge}>
            Selected ({selectedContacts.length}/5):
          </Text>
          <FlatList
            data={selectedContacts}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.phone}
            renderItem={({ item }) => (
              <View style={styles.guardianPill}>
                <Text style={styles.guardianPillText}>{item.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedContacts(
                      selectedContacts.filter((c) => c.phone !== item.phone)
                    )
                  }
                >
                  <Text style={styles.guardianPillRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.guardianPillList}
          />
        </View>
      )}

      {/* Contact List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading contacts from phone...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id || item.name || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No contacts found</Text>
              <Text style={styles.emptySubtext}>
                Make sure contacts permission is granted in Settings.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const phone = item.phoneNumbers?.[0]?.number || '';
            const clean = phone.replace(/\s+/g, '');
            const isSelected = selectedContacts.some(
              (c) => c.phone === clean || c.name === item.name
            );
            const avatarColor = getAvatarColor(item.name || 'Contact');
            const initials = getInitials(item.name || 'Contact');

            return (
              <TouchableOpacity
                style={[styles.contactCard, isSelected && styles.contactCardSelected]}
                activeOpacity={0.7}
                onPress={() => toggleSelectContact(item)}
              >
                {/* Colored Avatar */}
                <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                {/* Name & Phone */}
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.contactPhone}>{phone}</Text>
                </View>

                {/* Circular Radio Checkbox */}
                <View
                  style={[
                    styles.radioCircle,
                    isSelected ? styles.radioSelected : styles.radioUnselected,
                  ]}
                >
                  {isSelected && <Text style={styles.radioCheck}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Bottom Sticky Action Footer */}
      <View style={styles.footerContainer}>
        {selectedContacts.length === 0 && (
          <Text style={styles.hintNotice}>
            ⚠️ At least 1 emergency guardian is mandatory
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedContacts.length === 0 && styles.continueButtonDisabled,
          ]}
          disabled={selectedContacts.length === 0}
          activeOpacity={0.85}
          onPress={handleContinue}
        >
          <Text
            style={[
              styles.continueButtonText,
              selectedContacts.length === 0 && styles.continueButtonTextDisabled,
            ]}
          >
            {selectedContacts.length > 0
              ? `Continue with ${selectedContacts.length} Guardian${selectedContacts.length > 1 ? 's' : ''}`
              : 'Select at Least 1 Guardian'}
          </Text>
          {selectedContacts.length > 0 && (
            <Text style={styles.continueButtonArrow}>→</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
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
  stepBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  clearSearch: {
    fontSize: 16,
    color: Colors.textMuted,
    paddingHorizontal: 6,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  refreshIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  selectedRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  selectedCountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  guardianPillList: {
    gap: 8,
  },
  guardianPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    marginRight: 8,
  },
  guardianPillText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  guardianPillRemove: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contactCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F7FF',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  contactPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  radioUnselected: {
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  radioSelected: {
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  radioCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  hintNotice: {
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
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
  continueButtonDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  continueButtonTextDisabled: {
    color: Colors.textMuted,
  },
  continueButtonArrow: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
  },
});
