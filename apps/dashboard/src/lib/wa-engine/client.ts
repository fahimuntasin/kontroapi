import axios from 'axios';

export const waEngineClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export async function sendOtp(phone: string, brand: string = 'KontroAPI') {
  const res = await fetch(`/api/auth/otp-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, brand }),
  });
  return res.json();
}

export async function verifyOtp(phone: string, otp: string) {
  const res = await fetch(`/api/auth/otp-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
  return res.json();
}

// Billing API
export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  session_limit: number;
  rpm: number;
  daily_msg: number | null;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  price: number;
  session_limit: number;
  status: string;
  started_at: string;
}

export interface Usage {
  sessions: { current: number; limit: number };
  messages_today: { current: number; limit: number | null };
}

export async function getPlans() {
  const res = await waEngineClient.get('/billing/plans');
  return res.data.data as Plan[];
}

export async function getSubscription() {
  const res = await waEngineClient.get('/billing/subscription');
  return res.data.data as Subscription;
}

export async function getUsage() {
  const res = await waEngineClient.get('/billing/usage');
  return res.data.data as Usage;
}

export async function createCheckout(planId: string) {
  const res = await waEngineClient.post('/billing/checkout', { plan_id: planId });
  return res.data;
}

export async function cancelSubscription() {
  const res = await waEngineClient.post('/billing/cancel');
  return res.data;
}

// Token API
export interface Token {
  id: string;
  name: string;
  token?: string;
  last_used: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function getTokens() {
  const res = await waEngineClient.get('/tokens');
  return res.data.data as Token[];
}

export async function getToken(id: string) {
  const res = await waEngineClient.get(`/tokens/${id}`);
  return res.data.data as Token;
}

export async function createToken(name: string, expiresAt?: string) {
  const res = await waEngineClient.post('/tokens', { name, expires_at: expiresAt || '' });
  return res.data;
}

export async function deleteToken(id: string) {
  const res = await waEngineClient.delete(`/tokens?id=${id}`);
  return res.data;
}

// Message API
export interface SendMessagePayload {
  to: string;
  type?: string;
  text?: string;
  url?: string;
  caption?: string;
  session_key?: string;
}

export async function sendMessage(payload: SendMessagePayload) {
  const res = await waEngineClient.post('/messages/send', payload);
  return res.data;
}
