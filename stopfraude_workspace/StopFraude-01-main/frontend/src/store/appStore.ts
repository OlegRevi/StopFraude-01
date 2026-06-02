import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '../i18n/translations';

export type { Language };

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;  // Email for scam alert notifications
  photo_base64?: string;
}

export interface CallRecord {
  id: string;
  user_id: string;
  caller_number: string;
  timestamp: string;
  duration_seconds: number;
  recording_base64?: string;
  transcript?: string;
  scam_score?: number;
  scam_type?: string;
  detected_keywords: string[];
  explanation?: string;
  explanation_ro?: string;
  alerted: boolean;
  alert_sent_at?: string;
  user_feedback?: string;
  analyzed: boolean;
}

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  language: Language;
  emergency_contacts: EmergencyContact[];
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileDraft {
  name: string;
  phone: string;
  email?: string;
}

interface AppState {
  // User state
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Language
  language: Language;
  
  // Onboarding
  onboardingStep: number;
  selectedContacts: EmergencyContact[];
  userProfile: UserProfileDraft | null;
  
  // Calls
  calls: CallRecord[];
  
  // Actions
  setUser: (user: User | null) => void;
  setLanguage: (lang: Language) => void;
  setOnboardingStep: (step: number) => void;
  setSelectedContacts: (contacts: EmergencyContact[]) => void;
  addSelectedContact: (contact: EmergencyContact) => void;
  removeSelectedContact: (contactId: string) => void;
  setUserProfile: (profile: UserProfileDraft | null) => void;
  setCalls: (calls: CallRecord[]) => void;
  addCall: (call: CallRecord) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadPersistedState: () => Promise<void>;
  persistState: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  user: null,
  isLoading: false,
  error: null,
  language: 'en' as Language,
  onboardingStep: 0,
  selectedContacts: [],
  userProfile: null,
  calls: [],
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  
  setUser: (user) => {
    set({ user });
    get().persistState();
  },
  
  setLanguage: (language) => {
    set({ language });
    get().persistState();
  },
  
  setOnboardingStep: (onboardingStep) => {
    set({ onboardingStep });
  },
  
  setSelectedContacts: (selectedContacts) => {
    set({ selectedContacts });
  },
  
  addSelectedContact: (contact) => {
    const { selectedContacts } = get();
    if (selectedContacts.length < 5 && !selectedContacts.find(c => c.id === contact.id)) {
      set({ selectedContacts: [...selectedContacts, contact] });
    }
  },
  
  removeSelectedContact: (contactId) => {
    const { selectedContacts } = get();
    set({ selectedContacts: selectedContacts.filter(c => c.id !== contactId) });
  },
  
  setUserProfile: (userProfile) => {
    set({ userProfile });
  },
  
  setCalls: (calls) => {
    set({ calls });
  },
  
  addCall: (call) => {
    const { calls } = get();
    set({ calls: [call, ...calls] });
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  loadPersistedState: async () => {
    try {
      const storedState = await AsyncStorage.getItem('stopfrauda_state');
      if (storedState) {
        const parsed = JSON.parse(storedState);
        set({
          user: parsed.user || null,
          language: parsed.language || 'en',
        });
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  },
  
  persistState: async () => {
    try {
      const { user, language } = get();
      await AsyncStorage.setItem('stopfrauda_state', JSON.stringify({
        user,
        language,
      }));
    } catch (error) {
      console.error('Error persisting state:', error);
    }
  },
  
  reset: () => {
    set(initialState);
    AsyncStorage.removeItem('stopfrauda_state');
  },
}));
