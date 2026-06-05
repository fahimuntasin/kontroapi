import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { queryOne, query } from './index';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-please-change-in-production-min-32-chars'
);

const COOKIE_NAME = 'kontroapi_token';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  plan: string;
  phone: string | null;
  session_limit: number;
  billing_status: string;
}

export interface AuthSession {
  user: SessionUser;
  token: string;
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + 'kontroapi_salt_v1').digest('hex');
}

export async function signToken(payload: { sub: string; email: string; role: string }): Promise<string> {
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    return {
      sub: payload.sub,
      email: payload.email,
      role: (payload as any).role || 'user',
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = await verifyToken(token);
  if (!decoded) return null;

  const user = await queryOne<SessionUser>(
    `SELECT id, email, full_name, role, plan, phone, session_limit, billing_status
     FROM users WHERE id = $1 LIMIT 1`,
    [decoded.sub]
  );

  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSession | null> {
  const user = await queryOne<SessionUser & { password_hash: string }>(
    `SELECT id, email, full_name, role, plan, phone, session_limit, billing_status, password_hash
     FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );

  if (!user) return null;
  if (user.password_hash !== hashPassword(password)) return null;

  const { password_hash, ...sessionUser } = user;
  const token = await signToken({ sub: sessionUser.id, email: sessionUser.email, role: sessionUser.role });
  await setSessionCookie(token);

  return { user: sessionUser, token };
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  phone?: string
): Promise<AuthSession> {
  const existing = await queryOne(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );
  if (existing) throw new Error('Email already registered');

  const hash = hashPassword(password);
  const user = await queryOne<SessionUser>(
    `INSERT INTO users (email, password_hash, full_name, phone, role)
     VALUES ($1, $2, $3, $4, 'user')
     RETURNING id, email, full_name, role, plan, phone, session_limit, billing_status`,
    [email.toLowerCase(), hash, fullName, phone ?? null]
  );

  if (!user) throw new Error('Failed to create user');

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);

  return { user, token };
}
