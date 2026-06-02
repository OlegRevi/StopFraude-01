import { Audio } from 'expo-av';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import apiService from './api';
import notificationService from './notificationService';

// Storage keys
const RECORDINGS_KEY = 'pending_recordings';
const RECORDING_SETTINGS_KEY = 'recording_settings';

// Chunk settings
const CHUNK_DURATION_MS = 30000; // 30 seconds per chunk

export interface RecordingChunk {
  id: string;
  sessionId: string;
  chunkNumber: number;
  callerNumber: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  fileUri?: string;
  status: 'recording' | 'completed' | 'uploading' | 'analyzed' | 'failed';
  callId?: string;
  scamScore?: number;
  scamType?: string;
}

export interface RecordingSession {
  id: string;
  callerNumber: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  chunks: RecordingChunk[];
  status: 'active' | 'completed' | 'analyzing' | 'done';
  highestScamScore: number;
  alertSent: boolean;
}

export interface RecordingSettings {
  enabled: boolean;
  recordUnknownOnly: boolean;
  autoAnalyze: boolean;
  notifyOnScam: boolean;
  chunkDurationSeconds: number;
  scamThreshold: number;
}

const DEFAULT_SETTINGS: RecordingSettings = {
  enabled: true,
  recordUnknownOnly: true,
  autoAnalyze: true,
  notifyOnScam: true,
  chunkDurationSeconds: 30,
  scamThreshold: 70,
};

class ChunkedRecordingService {
  private recording: Audio.Recording | null = null;
  private currentSession: RecordingSession | null = null;
  private currentChunk: RecordingChunk | null = null;
  private isRecording: boolean = false;
  private settings: RecordingSettings = DEFAULT_SETTINGS;
  private userId: string | null = null;
  private notificationId: string | null = null;
  private chunkTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSessions: RecordingSession[] = [];
  private onScamDetected: ((score: number, type: string, chunk: number) => void) | null = null;

  /**
   * Initialize the recording service
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadSettings();
    await this.loadPendingSessions();
    await this.requestPermissions();
    
    // Configure audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    console.log('Chunked recording service initialized');
  }

  /**
   * Request necessary permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      return allGranted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(RECORDING_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings(settings: Partial<RecordingSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings };
      await AsyncStorage.setItem(RECORDING_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): RecordingSettings {
    return { ...this.settings };
  }

  /**
   * Load pending sessions from storage
   */
  async loadPendingSessions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(RECORDINGS_KEY);
      if (stored) {
        this.pendingSessions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading pending sessions:', error);
    }
  }

  /**
   * Save pending sessions to storage
   */
  async savePendingSessions(): Promise<void> {
    try {
      await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(this.pendingSessions));
    } catch (error) {
      console.error('Error saving pending sessions:', error);
    }
  }

  /**
   * Set callback for when scam is detected during call
   */
  setOnScamDetected(callback: (score: number, type: string, chunkNumber: number) => void): void {
    this.onScamDetected = callback;
  }

  /**
   * Start recording a call with chunking
   */
  async startRecording(callerNumber: string): Promise<boolean> {
    if (!this.settings.enabled) {
      console.log('Recording disabled in settings');
      return false;
    }

    if (this.isRecording) {
      console.log('Already recording');
      return false;
    }

    try {
      // Check permission
      const { granted } = await Audio.getPermissionsAsync();
      if (!granted) {
        const { granted: newGranted } = await Audio.requestPermissionsAsync();
        if (!newGranted) {
          console.log('Audio permission not granted');
          return false;
        }
      }

      // Create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentSession = {
        id: sessionId,
        callerNumber,
        startTime: Date.now(),
        chunks: [],
        status: 'active',
        highestScamScore: 0,
        alertSent: false,
      };

      this.isRecording = true;

      // Show notification
      this.notificationId = await notificationService.showRecordingNotification(callerNumber);

      // Start first chunk
      await this.startNewChunk();

      console.log(`Started chunked recording for ${callerNumber}`);
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.currentSession = null;
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Start a new recording chunk
   */
  private async startNewChunk(): Promise<void> {
    if (!this.currentSession) return;

    try {
      const chunkNumber = this.currentSession.chunks.length + 1;
      
      // Create chunk metadata
      this.currentChunk = {
        id: `chunk_${Date.now()}_${chunkNumber}`,
        sessionId: this.currentSession.id,
        chunkNumber,
        callerNumber: this.currentSession.callerNumber,
        startTime: Date.now(),
        status: 'recording',
      };

      // Set audio mode for recording during calls
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (audioModeError) {
        console.warn('Could not set audio mode:', audioModeError);
      }

      // Start recording - this may fail if microphone is busy during a phone call
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;

      console.log(`Started chunk ${chunkNumber}`);

      // Set timer to stop this chunk and start next one
      this.chunkTimer = setTimeout(() => {
        this.finishCurrentChunk();
      }, this.settings.chunkDurationSeconds * 1000);

    } catch (error) {
      console.error('Error starting chunk (microphone may be busy):', error);
      // Don't crash — mark the chunk as failed and continue
      if (this.currentChunk) {
        this.currentChunk.status = 'failed';
      }
    }
  }

  /**
   * Finish current chunk and start a new one
   */
  private async finishCurrentChunk(): Promise<void> {
    if (!this.recording || !this.currentChunk || !this.currentSession) return;

    try {
      // Clear timer
      if (this.chunkTimer) {
        clearTimeout(this.chunkTimer);
        this.chunkTimer = null;
      }

      // Stop current recording
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      // Update chunk metadata
      this.currentChunk.endTime = Date.now();
      this.currentChunk.duration = Math.round(
        (this.currentChunk.endTime - this.currentChunk.startTime) / 1000
      );
      this.currentChunk.fileUri = uri || undefined;
      this.currentChunk.status = 'completed';

      // Add chunk to session
      this.currentSession.chunks.push({ ...this.currentChunk });

      console.log(`Finished chunk ${this.currentChunk.chunkNumber}, duration: ${this.currentChunk.duration}s`);

      // Process chunk in background (upload & analyze)
      if (this.settings.autoAnalyze) {
        this.processChunk(this.currentChunk);
      }

      // If still recording (call not ended), start next chunk
      if (this.isRecording && this.currentSession.status === 'active') {
        await this.startNewChunk();
      }

    } catch (error) {
      console.error('Error finishing chunk:', error);
    }
  }

  /**
   * Process a chunk (upload and analyze)
   */
  private async processChunk(chunk: RecordingChunk): Promise<void> {
    if (!this.userId || !chunk.fileUri) {
      console.log('Cannot process chunk: missing userId or fileUri');
      return;
    }

    try {
      console.log(`Processing chunk ${chunk.chunkNumber}...`);

      // Update status
      const chunkIndex = this.currentSession?.chunks.findIndex(c => c.id === chunk.id);
      if (chunkIndex !== undefined && chunkIndex !== -1 && this.currentSession) {
        this.currentSession.chunks[chunkIndex].status = 'uploading';
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(chunk.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload chunk to backend for analysis
      const result = await apiService.analyzeAudioChunk({
        user_id: this.userId,
        caller_number: chunk.callerNumber,
        session_id: chunk.sessionId,
        chunk_number: chunk.chunkNumber,
        duration_seconds: chunk.duration || 0,
        audio_base64: base64,
      });

      // Update chunk with results
      if (chunkIndex !== undefined && chunkIndex !== -1 && this.currentSession) {
        this.currentSession.chunks[chunkIndex].status = 'analyzed';
        this.currentSession.chunks[chunkIndex].callId = result.call_id;
        this.currentSession.chunks[chunkIndex].scamScore = result.scam_score;
        this.currentSession.chunks[chunkIndex].scamType = result.scam_type;

        // Update highest scam score
        if (result.scam_score > this.currentSession.highestScamScore) {
          this.currentSession.highestScamScore = result.scam_score;
        }

        // Check if scam threshold exceeded
        if (result.scam_score >= this.settings.scamThreshold && !this.currentSession.alertSent) {
          this.currentSession.alertSent = true;
          
          console.log(`🚨 SCAM DETECTED in chunk ${chunk.chunkNumber}! Score: ${result.scam_score}%`);

          // Show immediate notification
          if (this.settings.notifyOnScam) {
            await notificationService.showScamAlert(
              result.call_id || chunk.id,
              chunk.callerNumber,
              result.scam_type || 'suspicious',
              result.scam_score
            );
          }

          // Trigger callback for real-time UI update
          if (this.onScamDetected) {
            this.onScamDetected(result.scam_score, result.scam_type || 'unknown', chunk.chunkNumber);
          }

          // Send alert to emergency contacts
          if (this.userId && result.call_id) {
            try {
              await apiService.sendAlert(result.call_id, this.userId);
            } catch (alertError) {
              console.error('Error sending alert:', alertError);
            }
          }
        }
      }

      // Delete local chunk file after successful upload
      await FileSystem.deleteAsync(chunk.fileUri, { idempotent: true });

      console.log(`Chunk ${chunk.chunkNumber} processed. Scam score: ${result.scam_score}%`);

    } catch (error) {
      console.error(`Error processing chunk ${chunk.chunkNumber}:`, error);
      
      // Mark as failed
      const chunkIndex = this.currentSession?.chunks.findIndex(c => c.id === chunk.id);
      if (chunkIndex !== undefined && chunkIndex !== -1 && this.currentSession) {
        this.currentSession.chunks[chunkIndex].status = 'failed';
      }
    }
  }

  /**
   * Stop recording (call ended)
   */
  async stopRecording(): Promise<RecordingSession | null> {
    if (!this.isRecording || !this.currentSession) {
      console.log('No active recording to stop');
      return null;
    }

    try {
      // Clear chunk timer
      if (this.chunkTimer) {
        clearTimeout(this.chunkTimer);
        this.chunkTimer = null;
      }

      // Finish last chunk if recording
      if (this.recording && this.currentChunk) {
        await this.finishCurrentChunk();
      }

      // Update session
      this.currentSession.endTime = Date.now();
      this.currentSession.totalDuration = Math.round(
        (this.currentSession.endTime - this.currentSession.startTime) / 1000
      );
      this.currentSession.status = 'completed';

      // Dismiss notification
      if (this.notificationId) {
        await notificationService.dismissNotification(this.notificationId);
        this.notificationId = null;
      }

      console.log(`Recording stopped. Total duration: ${this.currentSession.totalDuration}s, Chunks: ${this.currentSession.chunks.length}`);

      // Save session if there are pending chunks
      const pendingChunks = this.currentSession.chunks.filter(
        c => c.status === 'completed' || c.status === 'failed'
      );
      if (pendingChunks.length > 0) {
        this.pendingSessions.push(this.currentSession);
        await this.savePendingSessions();
      }

      const session = this.currentSession;
      this.cleanup();
      return session;

    } catch (error) {
      console.error('Error stopping recording:', error);
      this.cleanup();
      return null;
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  /**
   * Get recording status
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current chunk number
   */
  getCurrentChunkNumber(): number {
    return this.currentChunk?.chunkNumber || 0;
  }

  /**
   * Get highest scam score detected so far
   */
  getHighestScamScore(): number {
    return this.currentSession?.highestScamScore || 0;
  }

  /**
   * Check if alert has been sent
   */
  hasAlertBeenSent(): boolean {
    return this.currentSession?.alertSent || false;
  }

  /**
   * Get pending sessions count
   */
  getPendingCount(): number {
    return this.pendingSessions.length;
  }

  /**
   * Retry failed chunks
   */
  async retryFailedChunks(): Promise<number> {
    let retried = 0;

    for (const session of this.pendingSessions) {
      const failedChunks = session.chunks.filter(c => c.status === 'failed' && c.fileUri);
      
      for (const chunk of failedChunks) {
        try {
          // Check if file still exists
          const fileInfo = await FileSystem.getInfoAsync(chunk.fileUri!);
          if (fileInfo.exists) {
            await this.processChunk(chunk);
            retried++;
          }
        } catch (error) {
          console.error('Error retrying chunk:', error);
        }
      }
    }

    // Clean up completed sessions
    this.pendingSessions = this.pendingSessions.filter(session => {
      const hasFailedChunks = session.chunks.some(c => c.status === 'failed');
      return hasFailedChunks;
    });
    await this.savePendingSessions();

    return retried;
  }

  /**
   * Clean up after recording
   */
  private cleanup(): void {
    this.recording = null;
    this.currentSession = null;
    this.currentChunk = null;
    this.isRecording = false;
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  /**
   * Cancel current recording without saving
   */
  async cancelRecording(): Promise<void> {
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
    }

    // Delete all chunk files from current session
    if (this.currentSession) {
      for (const chunk of this.currentSession.chunks) {
        if (chunk.fileUri) {
          try {
            await FileSystem.deleteAsync(chunk.fileUri, { idempotent: true });
          } catch (e) {}
        }
      }
    }

    if (this.notificationId) {
      await notificationService.dismissNotification(this.notificationId);
      this.notificationId = null;
    }

    this.cleanup();
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
    }
    await this.savePendingSessions();
  }
}

export const callRecordingService = new ChunkedRecordingService();
export default callRecordingService;
