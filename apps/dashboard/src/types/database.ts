export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          plan: 'trial' | 'basic' | 'pro' | 'plus' | 'business';
          session_limit: number;
          billing_status: 'active' | 'past_due' | 'canceled' | 'paused';
          up_customer_id: string | null;
          up_subscription_id: string | null;
          up_payment_id: string | null;
          np_invoice_id?: string | null;
          np_subscription_id?: string | null;
          np_payment_id?: string | null;
          phone_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          plan?: 'trial' | 'basic' | 'pro' | 'plus' | 'business';
          session_limit?: number;
          billing_status?: 'active' | 'past_due' | 'canceled' | 'paused';
          up_customer_id?: string | null;
          up_subscription_id?: string | null;
          up_payment_id?: string | null;
          np_invoice_id?: string | null;
          np_subscription_id?: string | null;
          np_payment_id?: string | null;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          plan?: 'trial' | 'basic' | 'pro' | 'plus' | 'business';
          session_limit?: number;
          billing_status?: 'active' | 'past_due' | 'canceled' | 'paused';
          up_customer_id?: string | null;
          up_subscription_id?: string | null;
          up_payment_id?: string | null;
          np_invoice_id?: string | null;
          np_subscription_id?: string | null;
          np_payment_id?: string | null;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_sessions: {
        Row: {
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
          last_connected: string | null;
          last_qr: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          status?: 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | 'banned';
          api_key?: string;
          webhook_url?: string | null;
          webhook_secret?: string | null;
          webhook_events?: string[];
          proxy_url?: string | null;
          account_protection?: boolean;
          last_connected?: string | null;
          last_qr?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          status?: 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | 'banned';
          api_key?: string;
          webhook_url?: string | null;
          webhook_secret?: string | null;
          webhook_events?: string[];
          proxy_url?: string | null;
          account_protection?: boolean;
          last_connected?: string | null;
          last_qr?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      otp_verifications: {
        Row: {
          id: string;
          phone: string;
          token: string;
          used: boolean;
          expires_at: string;
          created_at: string;
        };
      };
      personal_tokens: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          token: string;
          last_used: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          token?: string;
          last_used?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      message_logs: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          direction: 'in' | 'out';
          type: string;
          to_from: string | null;
          content: Json | null;
          status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
          wa_message_id: string | null;
          error: string | null;
          created_at: string;
        };
      };
      session_logs: {
        Row: {
          id: string;
          session_id: string;
          event: 'connected' | 'disconnected' | 'qr_generated' | 'banned' | 'error';
          detail: Json | null;
          created_at: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      plan_session_limit: {
        Args: { p: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
};
