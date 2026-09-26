export interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  isVerified?: boolean;
}

export interface CallLogEntry {
  id: string;
  incomingNumber: string;
  isUnknown: boolean;
  alertDispatched: boolean;
  timestamp: string;
  callerName?: string;
}

export type PlanType = 'EARLY_BIRD' | 'ANNUAL_STANDARD';

export interface UserSubscription {
  planType: PlanType;
  status: 'active' | 'trialing' | 'canceled' | 'incomplete';
  expiresAt?: string;
  stripeCustomerId?: string;
}

export interface ProtectionState {
  isActive: boolean;
  autoRejectUnknown: boolean;
  lastScreenedCall?: CallLogEntry;
}
