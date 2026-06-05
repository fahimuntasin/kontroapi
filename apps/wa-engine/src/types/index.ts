import { Request } from 'express';

export interface SessionRecord {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  status: 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | 'banned';
  api_key: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  webhook_events: string[];
  proxy_url: string | null;
  account_protection: boolean;
}

export interface ProfileRecord {
  id: string;
  plan: 'trial' | 'basic' | 'pro' | 'plus' | 'business';
  session_limit: number;
  billing_status: 'active' | 'past_due' | 'canceled' | 'paused';
  phone_verified: boolean;
}

export interface AuthenticatedRequest extends Request {
  session?: SessionRecord;
  profile: ProfileRecord;
  auth_type?: 'session_key' | 'pat' | 'internal_hmac';
}

export interface QrData {
  qr: string;
  expiresAt: number;
}

export type WebhookEvent =
  | 'messages.received' | 'messages.personal' | 'messages.group'
  | 'messages.newsletter' | 'messages.upsert' | 'messages.sent'
  | 'messages.update' | 'messages.deleted' | 'messages.reaction'
  | 'messages.receipt'
  | 'qrcode.updated' | 'session.status'
  | 'contacts.upsert' | 'contacts.update'
  | 'groups.upsert' | 'groups.update' | 'groups.participants'
  | 'chats.upsert' | 'chats.update' | 'chats.delete'
  | 'calls.received' | 'polls.results';

export interface WebhookPayload {
  event: WebhookEvent;
  session_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}
