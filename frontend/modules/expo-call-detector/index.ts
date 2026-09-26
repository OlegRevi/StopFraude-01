import { EventEmitter, Subscription, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface CallScreenedEvent {
  phoneNumber: string;
  isUnknown: boolean;
  contactName: string;
  timestamp: string;
}

export interface ContactCheckResult {
  isContact: boolean;
  contactName: string;
  normalizedNumber: string;
}

export interface ProtectionStatus {
  active: boolean;
}

let NativeModule: any = null;
let emitter: EventEmitter | null = null;

try {
  if (Platform.OS === 'android') {
    NativeModule = requireNativeModule('ExpoCallDetector');
    emitter = new EventEmitter(NativeModule);
  }
} catch (e) {
  console.warn('[ExpoCallDetector] Native module not linked. Running in simulated fallback mode.');
}

/**
 * Configure the native call detector with user ID and Cloud Run API endpoint
 */
export async function configureCallDetector(
  userId: string,
  backendUrl: string,
  autoReject: boolean = false
): Promise<{ success: boolean }> {
  if (NativeModule?.configure) {
    return await NativeModule.configure(userId, backendUrl, autoReject);
  }
  return { success: true };
}

/**
 * Check if a phone number exists in device contacts using native ContactsContract
 */
export async function checkContact(phoneNumber: string): Promise<ContactCheckResult> {
  if (NativeModule?.checkContact) {
    return await NativeModule.checkContact(phoneNumber);
  }
  return {
    isContact: false,
    contactName: '',
    normalizedNumber: phoneNumber,
  };
}

/**
 * Start active background protection foreground service
 */
export async function startProtection(): Promise<{ success: boolean; active: boolean }> {
  if (NativeModule?.startProtection) {
    return await NativeModule.startProtection();
  }
  return { success: true, active: true };
}

/**
 * Stop active background protection foreground service
 */
export async function stopProtection(): Promise<{ success: boolean; active: boolean }> {
  if (NativeModule?.stopProtection) {
    return await NativeModule.stopProtection();
  }
  return { success: true, active: false };
}

/**
 * Query current protection active status
 */
export async function isProtectionActive(): Promise<ProtectionStatus> {
  if (NativeModule?.isProtectionActive) {
    return await NativeModule.isProtectionActive();
  }
  return { active: true };
}

/**
 * Test Call Simulator: Simulates an incoming call to verify screening and notifications
 */
export async function simulateIncomingCall(phoneNumber: string): Promise<{
  success: boolean;
  simulatedNumber: string;
  isUnknown: boolean;
  contactName: string;
}> {
  if (NativeModule?.simulateIncomingCall) {
    return await NativeModule.simulateIncomingCall(phoneNumber);
  }
  return {
    success: true,
    simulatedNumber: phoneNumber,
    isUnknown: true,
    contactName: '',
  };
}

/**
 * Subscribe to real-time call screening events
 */
export function addCallScreenedListener(
  listener: (event: CallScreenedEvent) => void
): Subscription {
  if (emitter) {
    return emitter.addListener('onCallScreened', listener);
  }
  return {
    remove: () => {},
  } as Subscription;
}
