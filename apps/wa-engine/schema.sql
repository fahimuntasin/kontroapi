-- ============================================================
-- Local PostgreSQL Schema for KontroAPI WA Engine
-- Run: psql -U postgres -d kontro_wa -f this_file.sql
-- ============================================================

-- Create database and user (run as postgres superuser first):
-- CREATE DATABASE kontro_wa;
-- CREATE USER kontro_app WITH PASSWORD 'strong_password_change_this';
-- GRANT ALL ON DATABASE kontro_wa TO kontro_app;

-- ============================================================
-- MESSAGE LOGS (range-partitioned by month)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_logs (
  id             UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL,        -- FK to Supabase whatsapp_sessions.id
  user_id        UUID NOT NULL,        -- FK to Supabase profiles.id
  direction      TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  type           TEXT NOT NULL,
  to_from        TEXT,
  content        JSONB,
  status         TEXT DEFAULT 'queued'
                   CHECK (status IN ('queued','sent','delivered','read','failed')),
  wa_message_id  TEXT,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE IF NOT EXISTS message_logs_2025_01
  PARTITION OF message_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS message_logs_2025_02
  PARTITION OF message_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS message_logs_2025_03
  PARTITION OF message_logs
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS message_logs_2025_04
  PARTITION OF message_logs
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS message_logs_2025_05
  PARTITION OF message_logs
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS message_logs_2025_06
  PARTITION OF message_logs
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE INDEX IF NOT EXISTS idx_msg_session ON message_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_user    ON message_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_status  ON message_logs(status) WHERE status = 'failed';

-- ============================================================
-- SESSION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS session_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL,
  event       TEXT NOT NULL,
  detail      JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sess_log ON session_logs(session_id, created_at DESC);

-- ============================================================
-- OTP VERIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone, expires_at);

-- Auto-cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM otp_verifications WHERE expires_at < NOW() - INTERVAL '1 hour';
$$;

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  price          NUMERIC(10,2) NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'BDT',
  session_limit  INTEGER NOT NULL,
  rpm            INTEGER NOT NULL,
  daily_msg      INTEGER,
  features       JSONB,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (id, name, price, session_limit, rpm, daily_msg, features) VALUES
  ('trial',    'Trial',    0,    1,  1,   50,    '["1 session","50 messages/day","Basic support"]'::jsonb),
  ('basic',    'Basic',    699,  1,  256,  NULL,  '["1 session","Unlimited messages","Priority support"]'::jsonb),
  ('pro',      'Pro',      1499, 3,  256,  NULL,  '["3 sessions","Unlimited messages","Priority support","Webhooks"]'::jsonb),
  ('plus',     'Plus',     2999, 6,  256,  NULL,  '["6 sessions","Unlimited messages","Priority support","Webhooks","Advanced analytics"]'::jsonb),
  ('business', 'Business', 4499, 10, 256,  NULL,  '["10 sessions","Unlimited messages","Dedicated support","Webhooks","Advanced analytics","API access"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- USERS (self-hosted mode — replaces Supabase auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan            TEXT NOT NULL DEFAULT 'trial',
  session_limit   INTEGER NOT NULL DEFAULT 1,
  billing_status  TEXT NOT NULL DEFAULT 'trial' CHECK (billing_status IN ('trial', 'active', 'past_due', 'canceled', 'payment_failed')),
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP SESSIONS (self-hosted mode — replaces Supabase table)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  phone               TEXT,
  status              TEXT NOT NULL DEFAULT 'disconnected'
                        CHECK (status IN ('disconnected','connecting','qr_pending','connected','banned')),
  api_key             TEXT NOT NULL UNIQUE,                    -- SHA-256 hash
  webhook_url         TEXT,
  webhook_secret      TEXT,                                    -- AES-256-GCM encrypted
  webhook_events      JSONB DEFAULT '["message.received","message.sent","message.status","session.status"]'::jsonb,
  proxy_url           TEXT,
  account_protection  BOOLEAN NOT NULL DEFAULT TRUE,
  last_connected      TIMESTAMPTZ,
  last_qr             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_apikey ON whatsapp_sessions(api_key);

-- ============================================================
-- CHAT CONVERSATIONS & MESSAGES (self-hosted mode)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  contact_jid     TEXT NOT NULL,                               -- e.g. 8801320875770@s.whatsapp.net
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_avatar  TEXT,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_jid)
);

CREATE INDEX IF NOT EXISTS idx_conv_user ON chat_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_session ON chat_conversations(session_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  wa_message_id   TEXT,
  direction       TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  type            TEXT NOT NULL,
  text            TEXT,
  media_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'sent',
  from_jid        TEXT,
  to_jid          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv ON chat_messages(conversation_id, created_at DESC);

-- ============================================================
-- PERSONAL ACCESS TOKENS (self-hosted mode)
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,                            -- SHA-256 hash
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_user ON personal_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON personal_tokens(token);

-- ============================================================
-- SUBSCRIPTIONS (one per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE,
  plan_id             TEXT NOT NULL REFERENCES plans(id),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','canceled','expired','past_due')),
  np_invoice_id       TEXT,
  np_subscription_id  TEXT,
  np_payment_id       TEXT,
  amount              NUMERIC(10,2),
  currency            TEXT DEFAULT 'BDT',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canceled_at         TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_np_invoice ON subscriptions(np_invoice_id);

-- ============================================================
-- PENDING CHECKOUTS (NaafiPay)
-- ============================================================
CREATE TABLE IF NOT EXISTS pending_checkouts (
  id            TEXT PRIMARY KEY,                  -- NaafiPay invoice_id
  user_id       UUID NOT NULL,
  plan_id       TEXT NOT NULL REFERENCES plans(id),
  amount        NUMERIC(10,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'BDT',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','completed','failed','cancelled','expired')),
  checkout_url  TEXT,
  redirect_url  TEXT,
  webhook_url   TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_user ON pending_checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_checkouts(status) WHERE status = 'pending';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sub_touch ON subscriptions;
CREATE TRIGGER trg_sub_touch BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_pending_touch ON pending_checkouts;
CREATE TRIGGER trg_pending_touch BEFORE UPDATE ON pending_checkouts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- System settings (key-value store for setup completion, activation, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activation requests (for community license key requests)
CREATE TABLE IF NOT EXISTS activation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
