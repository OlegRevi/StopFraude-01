import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import apiService from './api';
import notificationService from './notificationService';

// Conditional import for background fetch (not available on web)
let BackgroundFetch: any = null;
if (Platform.OS !== 'web') {
  BackgroundFetch = require('expo-background-fetch');
}

// Background task names
export const CALL_SYNC_TASK = 'CALL_SYNC_TASK';
export const CALL_MONITOR_TASK = 'CALL_MONITOR_TASK';

// Storage keys
const PENDING_CALLS_KEY = 'pending_calls';
const LAST_SYNC_KEY = 'last_sync_timestamp';

export interface PendingCall {
  id: string;
  callerNumber: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  audioPath?: string;
  status: 'recording' | 'pending' | 'uploading' | 'completed' | 'failed';
}

class CallMonitorService {
  private isMonitoring: boolean = false;
  private appStateSubscription: any = null;
  private currentUserId: string | null = null;
  private pendingCalls: PendingCall[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the call monitor service
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    // Load pending calls from storage
    await this.loadPendingCalls();
    
    // Set up app state listener for foreground/background transitions
    this.setupAppStateListener();
    
    // Register background tasks
    await this.registerBackgroundTasks();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    console.log('Call monitor service initialized');
  }

  /**
   * Register background tasks for call syncing
   */
  private async registerBackgroundTasks(): Promise<void> {
    try {
      // Define the sync task
      TaskManager.defineTask(CALL_SYNC_TASK, async () => {
        try {
          console.log('Background sync task running');
          await this.syncPendingCalls();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('Background sync error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background fetch
      await BackgroundFetch.registerTaskAsync(CALL_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background tasks registered');
    } catch (error) {
      console.error('Error registering background tasks:', error);
    }
  }

  /**
   * Set up app state listener
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Handle app state changes
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (nextAppState === 'active') {
      console.log('App became active, syncing calls...');
      await this.syncPendingCalls();
    } else if (nextAppState === 'background') {
      console.log('App went to background');
      await this.savePendingCalls();
    }
  }

  /**
   * Start periodic sync in foreground
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds when app is active
    this.syncInterval = setInterval(async () => {
      if (AppState.currentState === 'active') {
        await this.syncPendingCalls();
      }
    }, 30000);
  }

  /**
   * Load pending calls from storage
   */
  private async loadPendingCalls(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_CALLS_KEY);
      if (stored) {
        this.pendingCalls = JSON.parse(stored);
        console.log(`Loaded ${this.pendingCalls.length} pending calls`);
      }
    } catch (error) {
      console.error('Error loading pending calls:', error);
    }
  }

  /**
   * Save pending calls to storage
   */
  private async savePendingCalls(): Promise<void> {
    try {
      await AsyncStorage.setItem(PENDING_CALLS_KEY, JSON.stringify(this.pendingCalls));
    } catch (error) {
      console.error('Error saving pending calls:', error);
    }
  }

  /**
   * Add a new call to pending queue
   */
  async addPendingCall(call: PendingCall): Promise<void> {
    this.pendingCalls.push(call);
    await this.savePendingCalls();
    console.log('Added pending call:', call.callerNumber);
  }

  /**
   * Update a pending call
   */
  async updatePendingCall(callId: string, updates: Partial<PendingCall>): Promise<void> {
    const index = this.pendingCalls.findIndex(c => c.id === callId);
    if (index !== -1) {
      this.pendingCalls[index] = { ...this.pendingCalls[index], ...updates };
      await this.savePendingCalls();
    }
  }

  /**
   * Remove a call from pending queue
   */
  async removePendingCall(callId: string): Promise<void> {
    this.pendingCalls = this.pendingCalls.filter(c => c.id !== callId);
    await this.savePendingCalls();
  }

  /**
   * Sync pending calls with backend
   */
  async syncPendingCalls(): Promise<number> {
    if (!this.currentUserId) {
      console.log('No user ID, skipping sync');
      return 0;
    }

    const pendingToSync = this.pendingCalls.filter(
      c => c.status === 'pending' || c.status === 'failed'
    );

    if (pendingToSync.length === 0) {
      return 0;
    }

    console.log(`Syncing ${pendingToSync.length} pending calls`);
    let syncedCount = 0;

    for (const call of pendingToSync) {
      try {
        await this.updatePendingCall(call.id, { status: 'uploading' });

        // Create call record in backend
        const createdCall = await apiService.createCall({
          user_id: this.currentUserId,
          caller_number: call.callerNumber,
          duration_seconds: call.duration || 0,
        });

        // If we have audio, we'd upload it here
        // For now, trigger analysis if there's a transcript
        if (createdCall.transcript) {
          await apiService.analyzeCall(createdCall.id);
        }

        await this.removePendingCall(call.id);
        syncedCount++;

        console.log(`Synced call: ${call.callerNumber}`);
      } catch (error) {
        console.error(`Error syncing call ${call.id}:`, error);
        await this.updatePendingCall(call.id, { status: 'failed' });
      }
    }

    // Update last sync timestamp
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    return syncedCount;
  }

  /**
   * Fetch and check for new analyzed calls
   */
  async checkForNewAlerts(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const calls = await apiService.getUserCalls(this.currentUserId, 10);
      
      // Check for newly analyzed scam calls that haven't been notified
      for (const call of calls) {
        if (call.analyzed && (call.scam_score || 0) > 70 && !call.alerted) {
          // Show local notification
          await notificationService.showScamAlert(
            call.id,
            call.caller_number,
            call.scam_type || 'unknown',
            call.scam_score || 0
          );
        }
      }
    } catch (error) {
      console.error('Error checking for alerts:', error);
    }
  }

  /**
   * Simulate a call for testing (demo mode)
   */
  async simulateIncomingCall(
    callerNumber: string,
    durationSeconds: number,
    isScam: boolean
  ): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No user ID set');
    }

    // Create demo call via API
    const call = isScam
      ? await apiService.createDemoScamCall(this.currentUserId)
      : await apiService.createDemoLegitCall(this.currentUserId);

    // Show notification if scam
    if (isScam && call.scam_score && call.scam_score > 70) {
      await notificationService.showScamAlert(
        call.id,
        call.caller_number,
        call.scam_type || 'unknown',
        call.scam_score
      );
    }
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Get pending calls count
   */
  getPendingCallsCount(): number {
    return this.pendingCalls.filter(c => c.status === 'pending').length;
  }

  /**
   * Check if a phone number is a known contact
   */
  async isKnownContact(phoneNumber: string): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      const result = await apiService.checkKnownNumber(this.currentUserId, phoneNumber);
      return result.is_known;
    } catch (error) {
      console.error('Error checking known contact:', error);
      return false;
    }
  }

  /**
   * Stop monitoring and clean up
   */
  async stop(): Promise<void> {
    this.isMonitoring = false;
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    await this.savePendingCalls();
    
    // Unregister background task
    try {
      await BackgroundFetch.unregisterTaskAsync(CALL_SYNC_TASK);
    } catch (error) {
      console.log('Error unregistering task:', error);
    }

    console.log('Call monitor service stopped');
  }
}

export const callMonitorService = new CallMonitorService();
export default callMonitorService;
