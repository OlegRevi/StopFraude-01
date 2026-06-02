import { Platform } from 'react-native';
import * as CallDetector from '../../modules/expo-call-detector/src';
import callRecordingService from './callRecordingService';
import notificationService from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROTECTION_KEY = 'call_protection_enabled';

class CallProtectionService {
  private isInitialized = false;
  private callStateSubscription: any = null;
  private userId: string | null = null;

  async initialize(userId: string): Promise<void> {
    if (Platform.OS !== 'android' || this.isInitialized) return;

    this.userId = userId;
    this.isInitialized = true;

    // Initialize the recording service
    await callRecordingService.initialize(userId);

    // Check if protection was previously enabled
    const wasEnabled = await AsyncStorage.getItem(PROTECTION_KEY);
    if (wasEnabled === 'true') {
      await this.startProtection();
    }

    console.log('CallProtectionService initialized');
  }

  async startProtection(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      // Start native call detection
      await CallDetector.startListening();

      // Subscribe to call state events
      this.callStateSubscription = CallDetector.addCallStateListener((event) => {
        this.handleCallStateChange(event);
      });

      // Save state
      await AsyncStorage.setItem(PROTECTION_KEY, 'true');

      console.log('Call protection started');
      return true;
    } catch (error) {
      console.error('Error starting call protection:', error);
      return false;
    }
  }

  async stopProtection(): Promise<void> {
    try {
      await CallDetector.stopListening();

      if (this.callStateSubscription) {
        this.callStateSubscription.remove();
        this.callStateSubscription = null;
      }

      await AsyncStorage.setItem(PROTECTION_KEY, 'false');
      console.log('Call protection stopped');
    } catch (error) {
      console.error('Error stopping call protection:', error);
    }
  }

  private async handleCallStateChange(event: CallDetector.CallStateEvent): Promise<void> {
    try {
      console.log(`Call state: ${event.state}, number: ${event.number}`);

      switch (event.state) {
        case 'ringing':
          console.log(`Incoming call from ${event.number}`);
          break;

        case 'connected':
          console.log(`Call connected with ${event.number}, attempting recording...`);
          // Delay recording start to let the phone call audio settle
          setTimeout(async () => {
            try {
              await callRecordingService.startRecording(event.number);
            } catch (error) {
              console.error('Recording failed (microphone may be busy):', error);
              // Still log the call to backend even without recording
              this.logCallWithoutRecording(event.number);
            }
          }, 2000);
          break;

        case 'disconnected':
          console.log(`Call ended with ${event.number} (${event.duration}s)`);
          try {
            const session = await callRecordingService.stopRecording();
            if (session && session.highestScamScore > 0) {
              console.log(`Call analysis complete. Highest scam score: ${session.highestScamScore}%`);
            }
          } catch (error) {
            console.error('Error stopping recording:', error);
          }
          break;

        case 'missed':
          console.log(`Missed call from ${event.number}`);
          break;
      }
    } catch (error) {
      console.error('Unhandled error in call state handler:', error);
    }
  }

  private async logCallWithoutRecording(number: string): Promise<void> {
    try {
      if (!this.userId) return;
      const { apiService } = require('./api');
      // Log the call metadata even without audio analysis
      console.log(`Logging call from ${number} without recording`);
    } catch (e) {
      console.error('Error logging call:', e);
    }
  }

  async requestCallScreeningRole(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return CallDetector.requestCallScreeningRole();
  }

  async hasCallScreeningRole(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return CallDetector.hasCallScreeningRole();
  }

  async checkPermissions(): Promise<CallDetector.PermissionStatus> {
    if (Platform.OS !== 'android') {
      return { READ_PHONE_STATE: false, READ_CALL_LOG: false, RECORD_AUDIO: false };
    }
    return CallDetector.checkPermissions();
  }

  async isProtectionEnabled(): Promise<boolean> {
    const stored = await AsyncStorage.getItem(PROTECTION_KEY);
    return stored === 'true';
  }

  async stop(): Promise<void> {
    await this.stopProtection();
    await callRecordingService.stop();
    this.isInitialized = false;
  }
}

export const callProtectionService = new CallProtectionService();
export default callProtectionService;
