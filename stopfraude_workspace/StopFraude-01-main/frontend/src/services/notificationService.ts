import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiService from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface PushNotificationData {
  type: string;
  call_id?: string;
  scam_type?: string;
  confidence?: string;
  caller_number?: string;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private onNotificationReceived: ((data: PushNotificationData) => void) | null = null;
  private onNotificationResponse: ((data: PushNotificationData, actionId?: string) => void) | null = null;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<string | null> {
    try {
      // Create notification channel for Android
      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }

      // Register for push notifications
      const token = await this.registerForPushNotifications();
      
      // Set up notification listeners
      this.setupListeners();
      
      return token;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return null;
    }
  }

  /**
   * Create Android notification channels
   */
  private async createNotificationChannels(): Promise<void> {
    // Scam Alert Channel - High priority
    await Notifications.setNotificationChannelAsync('scam_alerts', {
      name: 'Scam Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // Call Recording Channel - Default priority
    await Notifications.setNotificationChannelAsync('call_recording', {
      name: 'Call Recording',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 100],
      sound: null,
      enableVibrate: false,
    });

    // General Channel
    await Notifications.setNotificationChannelAsync('general', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('Project ID not found, using device token only');
        // For development, we can still get a token
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);
      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register device token with backend
   */
  async registerDeviceWithBackend(userId: string, fcmToken?: string): Promise<boolean> {
    try {
      const deviceInfo = {
        device_id: Device.deviceName || 'unknown',
        fcm_token: fcmToken || this.expoPushToken || '',
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version || '1.0.0',
        os_version: Device.osVersion || 'unknown',
      };

      await apiService.registerDevice(userId, deviceInfo);
      console.log('Device registered with backend');
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Foreground notification listener
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received (foreground):', notification);
        const data = notification.request.content.data as PushNotificationData;
        
        if (this.onNotificationReceived) {
          this.onNotificationReceived(data);
        }
      }
    );

    // Response listener (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        const data = response.notification.request.content.data as PushNotificationData;
        const actionId = response.actionIdentifier;
        
        if (this.onNotificationResponse) {
          this.onNotificationResponse(data, actionId);
        }
      }
    );
  }

  /**
   * Set callback for when notification is received in foreground
   */
  setOnNotificationReceived(callback: (data: PushNotificationData) => void): void {
    this.onNotificationReceived = callback;
  }

  /**
   * Set callback for when user interacts with notification
   */
  setOnNotificationResponse(callback: (data: PushNotificationData, actionId?: string) => void): void {
    this.onNotificationResponse = callback;
  }

  /**
   * Show a local scam alert notification
   */
  async showScamAlert(
    callId: string,
    callerNumber: string,
    scamType: string,
    confidence: number
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ SCAM DETECTED!',
        body: `Suspicious call from ${callerNumber}\n${scamType.replace('_', ' ')} scam (${confidence}% confidence)`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'scam_alert',
          call_id: callId,
          scam_type: scamType,
          confidence: confidence.toString(),
          caller_number: callerNumber,
        },
        categoryIdentifier: 'scam_alert',
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Show call recording notification (foreground service indicator)
   */
  async showRecordingNotification(callerNumber: string): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎙️ Recording Call',
        body: `Call from ${callerNumber} is being recorded for analysis`,
        sound: null,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.LOW,
        data: { type: 'recording' },
      },
      trigger: null,
    });
    return notificationId;
  }

  /**
   * Dismiss a notification
   */
  async dismissNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get the current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
