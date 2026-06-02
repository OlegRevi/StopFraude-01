import { Platform, NativeModules, NativeEventEmitter, AppState, AppStateStatus } from 'react-native';
import callRecordingService from './callRecordingService';
import apiService from './api';

// Call states
export enum CallState {
  Disconnected = 'Disconnected',
  Incoming = 'Incoming',
  Dialing = 'Dialing',
  Offhook = 'Offhook',
  Connected = 'Connected',
  Missed = 'Missed',
}

export interface CallEvent {
  state: CallState;
  number?: string;
  timestamp: number;
}

type CallStateListener = (event: CallEvent) => void;

class CallDetectionService {
  private isListening: boolean = false;
  private listeners: CallStateListener[] = [];
  private currentCallNumber: string | null = null;
  private currentCallState: CallState = CallState.Disconnected;
  private callStartTime: number | null = null;
  private userId: string | null = null;
  private knownContacts: Set<string> = new Set();
  private callDetection: any = null;
  private appStateSubscription: any = null;

  /**
   * Initialize the call detection service
   */
  async initialize(userId: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('Call detection only works on Android');
      return false;
    }

    this.userId = userId;

    // Load known contacts
    await this.loadKnownContacts();

    // Set up app state listener
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    console.log('Call detection service initialized');
    return true;
  }

  /**
   * Start listening for call state changes
   */
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('Already listening for calls');
      return true;
    }

    if (Platform.OS !== 'android') {
      console.log('Call detection only supported on Android');
      return false;
    }

    try {
      // Try to use react-native-call-detection
      const CallDetectionManager = require('react-native-call-detection').default;
      
      this.callDetection = new CallDetectionManager(
        (event: string, number?: string) => {
          this.handleCallStateChange(event, number);
        },
        true, // Read phone number
        () => {
          console.log('Call detection permission denied');
        },
        {
          title: 'Phone State Permission',
          message: 'StopFrauda needs access to detect incoming calls for scam protection.',
        }
      );

      this.isListening = true;
      console.log('Started listening for calls');
      return true;
    } catch (error) {
      console.error('Error starting call detection:', error);
      console.log('Call detection requires native build (EAS Build)');
      return false;
    }
  }

  /**
   * Stop listening for call state changes
   */
  stopListening(): void {
    if (this.callDetection) {
      try {
        this.callDetection.dispose();
      } catch (error) {
        console.error('Error disposing call detection:', error);
      }
      this.callDetection = null;
    }

    this.isListening = false;
    console.log('Stopped listening for calls');
  }

  /**
   * Handle call state change from native module
   */
  private async handleCallStateChange(event: string, number?: string): Promise<void> {
    console.log(`Call state changed: ${event}, number: ${number || 'unknown'}`);

    const callEvent: CallEvent = {
      state: this.mapEventToState(event),
      number: number,
      timestamp: Date.now(),
    };

    // Update internal state
    this.currentCallState = callEvent.state;
    
    if (number) {
      this.currentCallNumber = number;
    }

    // Notify listeners
    this.notifyListeners(callEvent);

    // Handle recording based on state
    await this.handleRecordingForState(callEvent);
  }

  /**
   * Map native event string to CallState enum
   */
  private mapEventToState(event: string): CallState {
    switch (event.toLowerCase()) {
      case 'disconnected':
        return CallState.Disconnected;
      case 'incoming':
        return CallState.Incoming;
      case 'dialing':
        return CallState.Dialing;
      case 'offhook':
      case 'connected':
        return CallState.Offhook;
      case 'missed':
        return CallState.Missed;
      default:
        return CallState.Disconnected;
    }
  }

  /**
   * Handle recording based on call state
   */
  private async handleRecordingForState(event: CallEvent): Promise<void> {
    const settings = callRecordingService.getSettings();

    switch (event.state) {
      case CallState.Incoming:
        // Store the incoming number
        if (event.number) {
          this.currentCallNumber = event.number;
        }
        break;

      case CallState.Offhook:
        // Call answered - start recording if enabled
        if (settings.enabled && this.currentCallNumber) {
          // Check if we should record this number
          const shouldRecord = await this.shouldRecordNumber(this.currentCallNumber);
          
          if (shouldRecord) {
            this.callStartTime = Date.now();
            await callRecordingService.startRecording(this.currentCallNumber);
          }
        }
        break;

      case CallState.Disconnected:
        // Call ended - stop recording
        if (callRecordingService.getIsRecording()) {
          await callRecordingService.stopRecording();
        }
        this.currentCallNumber = null;
        this.callStartTime = null;
        break;

      case CallState.Missed:
        // Missed call - log it
        if (this.currentCallNumber && this.userId) {
          console.log(`Missed call from ${this.currentCallNumber}`);
        }
        this.currentCallNumber = null;
        break;
    }
  }

  /**
   * Check if we should record calls from this number
   */
  private async shouldRecordNumber(number: string): Promise<boolean> {
    const settings = callRecordingService.getSettings();

    if (!settings.enabled) {
      return false;
    }

    // If recordUnknownOnly is enabled, check if number is known
    if (settings.recordUnknownOnly) {
      const isKnown = await this.isKnownNumber(number);
      return !isKnown;
    }

    return true;
  }

  /**
   * Check if a number is in known contacts
   */
  private async isKnownNumber(number: string): Promise<boolean> {
    // First check local cache
    const normalizedNumber = this.normalizeNumber(number);
    if (this.knownContacts.has(normalizedNumber)) {
      return true;
    }

    // Check with backend
    if (this.userId) {
      try {
        const result = await apiService.checkKnownNumber(this.userId, number);
        if (result.is_known) {
          this.knownContacts.add(normalizedNumber);
        }
        return result.is_known;
      } catch (error) {
        console.error('Error checking known number:', error);
      }
    }

    return false;
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizeNumber(number: string): string {
    return number.replace(/[^0-9+]/g, '');
  }

  /**
   * Load known contacts from backend
   */
  private async loadKnownContacts(): Promise<void> {
    if (!this.userId) return;

    try {
      const contacts = await apiService.getEmergencyContacts(this.userId);
      this.knownContacts.clear();
      contacts.forEach(contact => {
        this.knownContacts.add(this.normalizeNumber(contact.phone));
      });
      console.log(`Loaded ${this.knownContacts.size} known contacts`);
    } catch (error) {
      console.error('Error loading known contacts:', error);
    }
  }

  /**
   * Add known contact
   */
  addKnownContact(phoneNumber: string): void {
    this.knownContacts.add(this.normalizeNumber(phoneNumber));
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active' && !this.isListening) {
      // App came to foreground, restart listening if needed
      this.startListening();
    }
  }

  /**
   * Add a listener for call state changes
   */
  addListener(listener: CallStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of a call event
   */
  private notifyListeners(event: CallEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in call listener:', error);
      }
    });
  }

  /**
   * Get current call state
   */
  getCurrentState(): CallState {
    return this.currentCallState;
  }

  /**
   * Get current call number
   */
  getCurrentNumber(): string | null {
    return this.currentCallNumber;
  }

  /**
   * Check if currently in a call
   */
  isInCall(): boolean {
    return this.currentCallState === CallState.Offhook || 
           this.currentCallState === CallState.Incoming;
  }

  /**
   * Stop the service
   */
  stop(): void {
    this.stopListening();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.listeners = [];
    console.log('Call detection service stopped');
  }
}

export const callDetectionService = new CallDetectionService();
export default callDetectionService;
