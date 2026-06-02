import { requireNativeModule, EventEmitter, Subscription } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface CallStateEvent {
  state: 'ringing' | 'connected' | 'disconnected' | 'missed';
  number: string;
  duration: number;
  timestamp: number;
}

export interface IncomingCallEvent {
  number: string;
  timestamp: number;
}

export interface PermissionStatus {
  READ_PHONE_STATE: boolean;
  READ_CALL_LOG: boolean;
  RECORD_AUDIO: boolean;
}

// Get the native module (will be null on web/iOS)
const nativeModule = Platform.OS === 'android' ? requireNativeModule('ExpoCallDetector') : null;
const emitter = nativeModule ? new EventEmitter(nativeModule) : null;

export function startListening(): Promise<string> {
  if (!nativeModule) return Promise.resolve('Not available on this platform');
  return nativeModule.startListening();
}

export function stopListening(): Promise<string> {
  if (!nativeModule) return Promise.resolve('Not available on this platform');
  return nativeModule.stopListening();
}

export function hasCallScreeningRole(): Promise<boolean> {
  if (!nativeModule) return Promise.resolve(false);
  return nativeModule.hasCallScreeningRole();
}

export function requestCallScreeningRole(): Promise<boolean> {
  if (!nativeModule) return Promise.resolve(false);
  return nativeModule.requestCallScreeningRole();
}

export function checkPermissions(): Promise<PermissionStatus> {
  if (!nativeModule) return Promise.resolve({ READ_PHONE_STATE: false, READ_CALL_LOG: false, RECORD_AUDIO: false });
  return nativeModule.checkPermissions();
}

export function isEnabled(): Promise<boolean> {
  if (!nativeModule) return Promise.resolve(false);
  return nativeModule.isEnabled();
}

export function setEnabled(enabled: boolean): Promise<boolean> {
  if (!nativeModule) return Promise.resolve(false);
  return nativeModule.setEnabled(enabled);
}

export function addCallStateListener(listener: (event: CallStateEvent) => void): Subscription | null {
  if (!emitter) return null;
  return emitter.addListener('onCallStateChanged', listener);
}

export function addIncomingCallListener(listener: (event: IncomingCallEvent) => void): Subscription | null {
  if (!emitter) return null;
  return emitter.addListener('onIncomingCall', listener);
}
