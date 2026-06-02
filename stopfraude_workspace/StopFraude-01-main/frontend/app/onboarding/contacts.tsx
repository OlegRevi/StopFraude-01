import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useAppStore, EmergencyContact } from '../../src/store/appStore';
import { translations } from '../../src/i18n/translations';

interface PhoneContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  initials: string;
  color: string;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

const getRandomColor = (name: string) => {
  const index = name.charCodeAt(0) % COLORS.length;
  return COLORS[index];
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function ContactsScreen() {
  const router = useRouter();
  const { language, selectedContacts, setSelectedContacts, addSelectedContact, removeSelectedContact } = useAppStore();
  const t = translations[language];

  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<PhoneContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query)
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      
      // First check current permission status
      let { status } = await Contacts.getPermissionsAsync();
      
      // If not granted, request permission
      if (status !== 'granted') {
        console.log('Contacts permission not granted, requesting...');
        const permissionResponse = await Contacts.requestPermissionsAsync();
        status = permissionResponse.status;
        console.log('Permission response:', status);
      }
      
      // If still not granted after request, show alert and use demo
      if (status !== 'granted') {
        console.log('Contacts permission denied');
        Alert.alert(
          'Contacts Permission Required',
          'To select your real contacts as emergency contacts, please grant contacts permission in your device settings.',
          [
            { text: 'Use Demo Contacts', onPress: () => setDemoContacts() },
            { text: 'Open Settings', onPress: () => {
              // On Android, this will prompt to open settings
              Contacts.requestPermissionsAsync();
            }}
          ]
        );
        setDemoContacts();
        return;
      }

      console.log('Contacts permission granted, loading contacts...');
      
      // Fetch contacts with email field as well
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers, 
          Contacts.Fields.Name,
          Contacts.Fields.Emails
        ],
      });

      console.log(`Found ${data.length} contacts`);

      if (data.length > 0) {
        const phoneContacts: PhoneContact[] = data
          .filter(contact => contact.name && contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .map(contact => ({
            id: contact.id || Math.random().toString(),
            name: contact.name || 'Unknown',
            phone: contact.phoneNumbers?.[0]?.number || '',
            email: contact.emails?.[0]?.email || undefined,
            initials: getInitials(contact.name || 'UN'),
            color: getRandomColor(contact.name || 'U'),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Processed ${phoneContacts.length} contacts with phone numbers`);
        setContacts(phoneContacts);
        setFilteredContacts(phoneContacts);
      } else {
        console.log('No contacts found, using demo contacts');
        setDemoContacts();
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Using demo contacts instead.');
      setDemoContacts();
    } finally {
      setLoading(false);
    }
  };

  const setDemoContacts = () => {
    const demoContacts: PhoneContact[] = [
      { id: '1', name: 'Oleg Petrov', phone: '+373 69 123 456', initials: 'OP', color: COLORS[0] },
      { id: '2', name: 'Maria Ionescu', phone: '+373 60 234 567', initials: 'MI', color: COLORS[1] },
      { id: '3', name: 'Ion Rusu', phone: '+373 68 345 678', initials: 'IR', color: COLORS[2] },
      { id: '4', name: 'Ana Popescu', phone: '+373 79 456 789', initials: 'AP', color: COLORS[3] },
      { id: '5', name: 'Vasile Munteanu', phone: '+373 78 567 890', initials: 'VM', color: COLORS[4] },
      { id: '6', name: 'Elena Codreanu', phone: '+373 69 678 901', initials: 'EC', color: COLORS[5] },
      { id: '7', name: 'Andrei Ciobanu', phone: '+373 60 789 012', initials: 'AC', color: COLORS[6] },
      { id: '8', name: 'Natalia Grosu', phone: '+373 68 890 123', initials: 'NG', color: COLORS[7] },
    ];
    setContacts(demoContacts);
    setFilteredContacts(demoContacts);
  };

  const isSelected = (contactId: string) => {
    return selectedContacts.some(c => c.id === contactId);
  };

  // Email modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<PhoneContact | null>(null);
  const [contactEmail, setContactEmail] = useState('');

  const toggleContact = (contact: PhoneContact) => {
    if (isSelected(contact.id)) {
      removeSelectedContact(contact.id);
    } else if (selectedContacts.length < 5) {
      // Show email modal when selecting a contact
      setEditingContact(contact);
      setContactEmail(contact.email || '');
      setEmailModalVisible(true);
    }
  };

  const handleSaveContactWithEmail = () => {
    if (!editingContact) return;
    
    // Validate email if provided
    if (contactEmail && !contactEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address or leave it empty.');
      return;
    }
    
    addSelectedContact({
      id: editingContact.id,
      name: editingContact.name,
      phone: editingContact.phone,
      email: contactEmail || undefined,
    });
    
    setEmailModalVisible(false);
    setEditingContact(null);
    setContactEmail('');
  };

  const handleSkipEmail = () => {
    if (!editingContact) return;
    
    addSelectedContact({
      id: editingContact.id,
      name: editingContact.name,
      phone: editingContact.phone,
    });
    
    setEmailModalVisible(false);
    setEditingContact(null);
    setContactEmail('');
  };

  const handleCancelEmail = () => {
    setEmailModalVisible(false);
    setEditingContact(null);
    setContactEmail('');
  };

  const renderContact = useCallback(({ item }: { item: PhoneContact }) => {
    const selected = isSelected(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.contactCard, selected && styles.contactCardSelected]}
        onPress={() => toggleContact(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: item.color }]}>
          <Text style={styles.initials}>{item.initials}</Text>
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phone}</Text>
        </View>
        
        <View style={[
          styles.checkbox,
          selected && styles.checkboxSelected
        ]}>
          {selected && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  }, [selectedContacts]);

  const canContinue = selectedContacts.length >= 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t.contacts.title}</Text>
          <Text style={styles.subtitle}>{t.contacts.subtitle}</Text>
        </View>
      </View>

      {/* Selected Contacts */}
      {selectedContacts.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedCount}>
            {selectedContacts.length} {t.contacts.selected}
          </Text>
          <View style={styles.selectedList}>
            {selectedContacts.map(contact => (
              <View key={contact.id} style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{contact.name}</Text>
                <TouchableOpacity onPress={() => removeSelectedContact(contact.id)}>
                  <Ionicons name="close-circle" size={20} color="#6366f1" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder={t.contacts.searchPlaceholder}
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color="#6366f1" />
        <Text style={styles.infoText}>
          {selectedContacts.length >= 5 ? t.contacts.max : t.contacts.note}
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadContacts}
        >
          <Ionicons name="refresh" size={18} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Continue Button */}
      <View style={styles.footer}>
        {!canContinue && (
          <Text style={styles.minWarning}>{t.contacts.min}</Text>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled
          ]}
          onPress={() => router.push('/onboarding/complete')}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>{t.contacts.continue}</Text>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Email Modal */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEmail}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Email (Optional)</Text>
              <TouchableOpacity onPress={handleCancelEmail}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {editingContact && (
              <View style={styles.modalContact}>
                <View style={[styles.modalAvatar, { backgroundColor: editingContact.color }]}>
                  <Text style={styles.modalInitials}>{editingContact.initials}</Text>
                </View>
                <View>
                  <Text style={styles.modalContactName}>{editingContact.name}</Text>
                  <Text style={styles.modalContactPhone}>{editingContact.phone}</Text>
                </View>
              </View>
            )}

            <Text style={styles.modalDescription}>
              📧 Adding an email allows us to send detailed scam reports including call transcript and analysis to this contact when a scam is detected.
            </Text>

            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.emailInputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.emailInput}
                placeholder="example@email.com"
                placeholderTextColor="#9ca3af"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={handleSkipEmail}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveContactWithEmail}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  selectedSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 10,
  },
  selectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 20,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 14,
    color: '#4338ca',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4338ca',
  },
  refreshButton: {
    padding: 6,
  },
  listContent: {
    padding: 24,
    paddingBottom: 140,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contactCardSelected: {
    backgroundColor: '#f0f0ff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  initials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  minWarning: {
    textAlign: 'center',
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 12,
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
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalContact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalContactPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  emailInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
