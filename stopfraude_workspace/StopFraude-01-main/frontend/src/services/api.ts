import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { User, EmergencyContact, CallRecord } from '../store/appStore';

const getBaseUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || '';
  if (!backendUrl) {
    console.error('EXPO_PUBLIC_BACKEND_URL is not configured! API calls will fail.');
  }
  return `${backendUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Retry wrapper for transient errors (404 from proxy, timeouts, 5xx)
const retryRequest = async (fn: () => Promise<any>, retries = 2, delay = 1500): Promise<any> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.response?.status;
      const isRetryable = !status || status === 404 || status >= 500;
      if (i < retries && isRetryable) {
        console.log(`Retrying request (attempt ${i + 2}/${retries + 1}) after ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
};

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface DeviceInfo {
  device_id: string;
  fcm_token?: string;
  platform: string;
  app_version: string;
  os_version?: string;
}

export interface CheckNumberResult {
  is_known: boolean;
  contact_name?: string;
  should_record: boolean;
}

export const apiService = {
  // User APIs
  async createUser(phone: string, language: string = 'en', extras?: { name?: string; email?: string }): Promise<User> {
    return retryRequest(async () => {
      const payload: any = { phone, language };
      if (extras?.name) payload.name = extras.name;
      if (extras?.email) payload.email = extras.email;
      const response = await api.post('/users', payload);
      return response.data;
    });
  },
  
  async getUser(userId: string): Promise<User> {
    return retryRequest(async () => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    });
  },
  
  async getUserByPhone(phone: string): Promise<User> {
    return retryRequest(async () => {
      const response = await api.get(`/users/phone/${phone}`);
      return response.data;
    });
  },
  
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return retryRequest(async () => {
      const response = await api.put(`/users/${userId}`, data);
      return response.data;
    });
  },
  
  async addEmergencyContacts(userId: string, contacts: EmergencyContact[]): Promise<User> {
    return retryRequest(async () => {
      const response = await api.post(`/users/${userId}/contacts`, contacts);
      return response.data;
    });
  },
  
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return retryRequest(async () => {
      const response = await api.get(`/users/${userId}/contacts`);
      return response.data;
    });
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}`);
  },
  
  // Device Registration for Push Notifications
  async registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    await api.post(`/users/${userId}/device`, deviceInfo);
  },

  // Check if number is known contact
  async checkKnownNumber(userId: string, phoneNumber: string): Promise<CheckNumberResult> {
    const response = await api.get(`/users/${userId}/check-number/${encodeURIComponent(phoneNumber)}`);
    return response.data;
  },
  
  // Call APIs
  async createCall(data: {
    user_id: string;
    caller_number: string;
    duration_seconds: number;
    transcript?: string;
    recording_base64?: string;
  }): Promise<CallRecord> {
    const response = await api.post('/calls', data);
    return response.data;
  },
  
  async getUserCalls(userId: string, limit: number = 50): Promise<CallRecord[]> {
    const response = await api.get(`/calls/user/${userId}?limit=${limit}`);
    return response.data;
  },
  
  async getCall(callId: string): Promise<CallRecord> {
    const response = await api.get(`/calls/${callId}`);
    return response.data;
  },
  
  async updateCallFeedback(callId: string, feedback: 'scam' | 'legit' | 'unknown'): Promise<void> {
    await api.put(`/calls/${callId}/feedback?feedback=${feedback}`);
  },
  
  async analyzeCall(callId: string): Promise<CallRecord> {
    const response = await api.post(`/calls/${callId}/analyze`);
    return response.data;
  },

  // Audio Upload
  async uploadCallAudio(
    userId: string,
    callerNumber: string,
    durationSeconds: number,
    audioBase64: string
  ): Promise<{ call_id: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('caller_number', callerNumber);
    formData.append('duration_seconds', durationSeconds.toString());
    
    // Convert base64 to blob for upload
    const blob = await fetch(`data:audio/mp4;base64,${audioBase64}`).then(r => r.blob());
    formData.append('audio_file', blob, 'recording.m4a');

    const response = await api.post('/calls/upload-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Analyze audio chunk in real-time
  async analyzeAudioChunk(data: {
    user_id: string;
    caller_number: string;
    session_id: string;
    chunk_number: number;
    duration_seconds: number;
    audio_base64: string;
  }): Promise<{
    call_id: string;
    session_id: string;
    chunk_number: number;
    scam_score: number;
    scam_type: string;
    is_scam: boolean;
    explanation: string;
    transcript?: string;
  }> {
    return retryRequest(async () => {
      const response = await api.post('/analyze/chunk', data);
      return response.data;
    }, 3, 3000);
  },
  
  // Analysis APIs
  async analyzeTranscript(transcript: string, language: string = 'en') {
    const formData = new FormData();
    formData.append('transcript', transcript);
    formData.append('language', language);
    
    const response = await api.post('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Demo APIs
  async createDemoScamCall(userId: string): Promise<CallRecord> {
    return retryRequest(async () => {
      const response = await api.post(`/demo/scam-call?user_id=${userId}`);
      return response.data;
    });
  },
  
  async createDemoLegitCall(userId: string): Promise<CallRecord> {
    return retryRequest(async () => {
      const response = await api.post(`/demo/legit-call?user_id=${userId}`);
      return response.data;
    });
  },
  
  // Stats APIs
  async getUserStats(userId: string) {
    return retryRequest(async () => {
      const response = await api.get(`/stats/${userId}`);
      return response.data;
    });
  },
  
  // Alert APIs
  async sendAlert(callId: string, userId: string): Promise<void> {
    await api.post('/alerts/send', { call_id: callId, user_id: userId });
  },

  // Test push notification
  async testPushNotification(fcmToken: string): Promise<void> {
    const formData = new FormData();
    formData.append('fcm_token', fcmToken);
    formData.append('title', '🛡️ StopFrauda Test');
    formData.append('body', 'Push notifications are working!');
    
    await api.post('/alerts/test-push', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Health check
  async healthCheck(): Promise<{ status: string; version: string; services: Record<string, string> }> {
    return retryRequest(async () => {
      const response = await api.get('/health');
      return response.data;
    }, 3, 2000).catch(() => ({ status: 'error', version: 'unknown', services: {} }));
  },
};

export default apiService;
