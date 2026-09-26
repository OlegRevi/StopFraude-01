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

        // Filter contacts that actually have a phone number
        const validContacts = data.filter(
          (c) => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name
        );
        setPhonebookContacts(validContacts);

        // Pre-fill previously saved contacts if any
        const saved = await getLocalContacts();
        if (saved && saved.length > 0) {
          setSelectedContacts(saved);
        }
      } else {
        // Fallback sample contacts for simulator/mock
        setPhonebookContacts([
          {
            id: 'c1',
            name: 'Mom (Family)',
            contactType: Contacts.ContactType.Person,
            phoneNumbers: [{ number: '+1 555-0199', label: 'mobile' }],
          },
          {
            id: 'c2',
            name: 'Dad (Family)',
            contactType: Contacts.ContactType.Person,
            phoneNumbers: [{ number: '+1 555-0188', label: 'mobile' }],
          },
          {
            id: 'c3',
            name: 'Sister Sarah',
            contactType: Contacts.ContactType.Person,
            phoneNumbers: [{ number: '+1 555-0177', label: 'mobile' }],
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

  const updateContactEmail = (phone: string, email: string) => {
    setSelectedContacts(
      selectedContacts.map((c) => (c.phone === phone ? { ...c, email } : c))
    );
  };

  const handleSkip = async () => {
    await saveLocalContacts([]);
    router.push('/paywall');
  };

  const handleContinue = async () => {
    if (selectedContacts.length === 0) {
      await handleSkip();
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
      {/* Step Header */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Text style={styles.stepBadge}>STEP 3 OF 5</Text>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipHeaderText}>Skip for now →</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Emergency Guardians</Text>
        <Text style={styles.subtitle}>
          Select up to 5 trusted contacts from your device address book. Manual entry is
          disabled to ensure genuine contacts.
        </Text>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search address book..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Selected Guardians Pills */}
      {selectedContacts.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedSectionTitle}>Designated Guardians:</Text>
          <FlatList
            data={selectedContacts}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.phone}
            renderItem={({ item }) => (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{item.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedContacts(
                      selectedContacts.filter((c) => c.phone !== item.phone)
                    )
                  }
                >
                  <Text style={styles.pillRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.pillList}
          />
        </View>
      )}

      {/* Contact List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Reading address book...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id || item.name}
          renderItem={({ item }) => {
            const rawPhone = item.phoneNumbers?.[0]?.number || '';
            const cleanPhone = rawPhone.replace(/\s+/g, '');
            const isSelected = selectedContacts.some(
              (c) => c.phone === cleanPhone || c.name === item.name
            );

            return (
              <TouchableOpacity
                style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                activeOpacity={0.7}
                onPress={() => toggleSelectContact(item)}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>

                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{rawPhone}</Text>
                </View>

                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matching contacts found.</Text>
            </View>
          }
        />
      )}

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedContacts.length === 0 && styles.skipFooterButton,
          ]}
          activeOpacity={0.8}
          onPress={selectedContacts.length > 0 ? handleContinue : handleSkip}
        >
          <Text style={styles.continueButtonText}>
            {selectedContacts.length > 0
              ? `Continue with ${selectedContacts.length} Guardian(s)`
              : 'Skip & Continue without Guardians'}
          </Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countBadge: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#064E3B40',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
  },
  selectedContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1E293B40',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  selectedSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 6,
  },
  pillList: {
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  pillRemove: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactRowSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F2847',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  contactPhone: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  checkmark: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
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
  continueButtonDisabled: {
    backgroundColor: '#334155',
  },
  skipFooterButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    shadowOpacity: 0.1,
  },
  skipHeaderText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
