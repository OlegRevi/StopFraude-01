import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Language } from '../store/appStore';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ro', name: 'Română', flag: '🇲🇩' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ visible, onClose }) => {
  const { language, setLanguage } = useAppStore();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Language</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.option,
                language === lang.code && styles.optionSelected,
              ]}
              onPress={() => handleSelect(lang.code)}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[
                styles.optionText,
                language === lang.code && styles.optionTextSelected,
              ]}>
                {lang.name}
              </Text>
              {language === lang.code && (
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  optionSelected: {
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  flag: {
    fontSize: 28,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    color: '#374151',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#22c55e',
    fontWeight: '600',
  },
});

export default LanguageSelector;
