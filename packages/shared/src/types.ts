export type Plan = 'trial' | 'basic' | 'pro' | 'plus' | 'business';
export type BillingStatus = 'active' | 'past_due' | 'canceled' | 'paused';
export type SessionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | 'banned';
export type MessageDirection = 'in' | 'out';
export type MessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'document'
  | 'sticker' | 'location' | 'contact' | 'poll' | 'reaction';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export type LogEvent = 'connected' | 'disconnected' | 'qr_generated' | 'banned' | 'error';
export type PresenceType = 'typing' | 'recording' | 'available';
export type GroupAction = 'promote' | 'demote';

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: Plan;
  session_limit: number;
  billing_status: BillingStatus;
  up_customer_id: string | null;
  up_subscription_id: string | null;
  up_payment_id: string | null;
  np_invoice_id: string | null;
  np_subscription_id: string | null;
  np_payment_id: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  status: SessionStatus;
  api_key: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  webhook_events: string[];
  proxy_url: string | null;
  account_protection: boolean;
  last_connected: string | null;
  last_qr: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageLogRecord {
  id: string;
  session_id: string;
  user_id: string;
  direction: MessageDirection;
  type: MessageType;
  to_from: string | null;
  content: Record<string, unknown> | null;
  status: MessageStatus;
  wa_message_id: string | null;
  error: string | null;
  created_at: string;
}

export interface SessionLogRecord {
  id: string;
  session_id: string;
  event: LogEvent;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface PersonalTokenRecord {
  id: string;
  user_id: string;
  name: string;
  token: string;
  last_used: string | null;
  expires_at: string | null;
  created_at: string;
}

export const PLAN_LIMITS: Record<Plan, { rpm: number; daily_msg: number | null }> = {
  trial: { rpm: 1, daily_msg: 50 },
  basic: { rpm: 256, daily_msg: null },
  pro: { rpm: 256, daily_msg: null },
  plus: { rpm: 256, daily_msg: null },
  business: { rpm: 256, daily_msg: null },
};

export const PLAN_SESSION_LIMITS: Record<Plan, number> = {
  trial: 1,
  basic: 1,
  pro: 3,
  plus: 6,
  business: 10,
};
