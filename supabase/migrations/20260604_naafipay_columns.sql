-- ============================================================
-- NaafiPay migration — add np_* columns to profiles
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS np_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS np_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS np_payment_id TEXT;

COMMENT ON COLUMN public.profiles.np_invoice_id IS 'NaafiPay invoice_id from checkout';
COMMENT ON COLUMN public.profiles.np_subscription_id IS 'NaafiPay subscription_id (recurring)';
COMMENT ON COLUMN public.profiles.np_payment_id IS 'NaafiPay transaction_id from verify-payment';
