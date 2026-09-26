import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyContact, CallLogEntry, UserSubscription } from '../types';

const STORAGE_KEYS = {
  USER_ID: '@stopfrauda_user_id',
  CONTACTS: '@stopfrauda_emergency_contacts',
  CALL_LOGS: '@stopfrauda_call_logs',
  SUBSCRIPTION: '@stopfrauda_subscription',
  PROTECTION_ACTIVE: '@stopfrauda_protection_active',
  AUTO_REJECT: '@stopfrauda_auto_reject',
  ONBOARDING_DONE: '@stopfrauda_onboarding_done',
  BACKEND_URL: '@stopfrauda_backend_url',
};

// Generate persistent unique user ID
export async function getOrCreateUserId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    if (existing) return existing;

    const newId = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newId);
    return newId;
  } catch {
    return 'usr_default_local';
  }
}

export async function saveLocalContacts(contacts: EmergencyContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    console.error('Failed to save local contacts', e);
  }
}

export async function getLocalContacts(): Promise<EmergencyContact[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function appendCallLog(entry: CallLogEntry): Promise<CallLogEntry[]> {
  try {
    const current = await getLocalCallLogs();
    const updated = [entry, ...current.filter((c) => c.id !== entry.id)].slice(0, 100);
    await AsyncStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(updated));
    return updated;
  } catch {
    return [entry];
  }
}

export async function getLocalCallLogs(): Promise<CallLogEntry[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CALL_LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveLocalSubscription(sub: UserSubscription): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
  } catch (e) {
    console.error('Failed to save local subscription', e);
  }
}

export async function getLocalSubscription(): Promise<UserSubscription | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setProtectionActive(active: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PROTECTION_ACTIVE, active ? 'true' : 'false');
}

export async function getProtectionActive(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.PROTECTION_ACTIVE);
  return val !== 'false'; // Default active
}

export async function setAutoReject(reject: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.AUTO_REJECT, reject ? 'true' : 'false');
}

export async function getAutoReject(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_REJECT);
  return val === 'true';
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, completed ? 'true' : 'false');
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
  return val === 'true';
}

export async function getStoredBackendUrl(): Promise<string> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
  return val || 'http://10.0.2.2:8080';
}

export async function setStoredBackendUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, url);
}
