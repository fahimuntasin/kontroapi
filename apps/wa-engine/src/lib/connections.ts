import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  type WASocket,
  type WAMessage,
  type MessageUpsertType,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { localDb } from './localDb';
import { decryptFile } from '@kontroapi/shared';
import { logger } from './logger';
import { redis } from './redis';
import { webhookQueue } from './queue';
import { config } from '../config';
import type { SessionRecord, WebhookEvent } from '../types';

const SESSIONS_DIR = process.env.BAILEYS_SESSIONS_DIR || join(process.cwd(), '.baileys-sessions');
if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });

// ============================================================
// SESSION FILE DECRYPTION (startup only)
// Decrypts .enc files to plaintext before Baileys reads them.
// Files remain plaintext during the active session — encryption
// at rest will be re-added once the pairing flow is confirmed stable.
// ============================================================
function decryptSessionFiles(sessionId: string) {
  const path = join(SESSIONS_DIR, sessionId);
  if (!existsSync(path)) return;
  const creds = path + '/creds.json.enc';
  if (existsSync(creds)) {
    try {
      writeFileSync(path + '/creds.json', decryptFile(readFileSync(creds)));
      require('fs').unlinkSync(creds);
    } catch {}
  }
  const keysDir = join(path, 'keys');
  if (existsSync(keysDir)) {
    try {
      for (const f of require('fs').readdirSync(keysDir)) {
        if (f.endsWith('.enc')) {
          writeFileSync(join(keysDir, f.replace('.enc', '')), decryptFile(readFileSync(join(keysDir, f))));
          require('fs').unlinkSync(join(keysDir, f));
        }
      }
    } catch {}
  }
}

// ============================================================
// SESSION STATE MACHINE
// Strict transitions only — no invalid state jumps
// ============================================================
type SessionState =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'banned';

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  disconnected: ['connecting'],
  connecting: ['qr_pending', 'authenticating', 'disconnected'],
  qr_pending: ['connected', 'disconnected', 'reconnecting'],
  authenticating: ['connected', 'disconnected', 'reconnecting'],
  connected: ['disconnected', 'reconnecting', 'banned'],
  reconnecting: ['connected', 'disconnected', 'banned'],
  banned: [],
};

function isValidTransition(from: SessionState, to: SessionState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================
// REDIS SESSION REGISTRY
// Maps session_id → worker_id so multiple workers don't collide
// ============================================================
const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`;
const SESSION_TTL = 60; // 60s — generous TTL to survive brief restarts

// Track all active worker PIDs for liveness checks
const ACTIVE_PIDS = new Set<number>();

async function isWorkerAlive(owner: string): Promise<boolean> {
  // Parse PID from worker-XXXXX format
  const match = owner.match(/worker-(\d+)/);
  if (!match) return false; // Unknown format, assume dead
  const pid = parseInt(match[1]!, 10);
  if (ACTIVE_PIDS.has(pid)) return true;

  try {
    // Signal 0 checks if process exists without sending a signal
    process.kill(pid, 0);
    ACTIVE_PIDS.add(pid);
    return true;
  } catch {
    // Process doesn't exist — worker is dead
    return false;
  }
}

// ============================================================
// SESSION CLAIMING (production-grade with dead-worker takeover)
// ============================================================
async function claimSession(sessionId: string): Promise<boolean> {
  const key = `session_owner:${sessionId}`;

  // Try atomic claim (fast path — no existing owner)
  const result = await redis.set(key, WORKER_ID, 'EX', SESSION_TTL, 'NX');
  if (result === 'OK') return true;

  // Another worker claims ownership — check if it's still alive
  const currentOwner = await redis.get(key);
  if (!currentOwner) {
    // Key disappeared between checks — try again
    const retry = await redis.set(key, WORKER_ID, 'EX', SESSION_TTL, 'NX');
    return retry === 'OK';
  }

  if (currentOwner === WORKER_ID) {
    // We already own it — just renew
    await redis.expire(key, SESSION_TTL);
    return true;
  }

  // Different worker owns it — check if alive
  const alive = await isWorkerAlive(currentOwner);
  if (!alive) {
    // Dead worker — steal the session
    await redis.set(key, WORKER_ID, 'EX', SESSION_TTL);
    logger.info({ sessionId, deadWorker: currentOwner }, 'Took over session from dead worker');
    return true;
  }

  // Live worker owns it — don't steal
  return false;
}

async function releaseSession(sessionId: string): Promise<void> {
  const key = `session_owner:${sessionId}`;
  const owner = await redis.get(key);
  if (owner === WORKER_ID) {
    await redis.del(key);
  }
}

async function renewSessionClaims(): Promise<void> {
  const keys = await redis.keys('session_owner:*');
  for (const key of keys) {
    const owner = await redis.get(key);
    if (owner === WORKER_ID) {
      await redis.expire(key, SESSION_TTL);
    }
  }
}

// Renew claims every 10 seconds
const claimRenewal = setInterval(renewSessionClaims, 10000);
claimRenewal.unref();

// ============================================================
// CONNECTION STATE
// ============================================================
type ConnectionInstance = {
  socket: WASocket | null;
  qr: string | null;
  qrExpiresAt: number | null;
  currentState: SessionState;
  listeners: Set<(data: string) => void>;
  isLoggingOut: boolean;
};

const connections = new Map<string, ConnectionInstance>();

export function getOrCreateSSEState(sessionId: string): ConnectionInstance {
  const existing = connections.get(sessionId);
  if (existing) return existing;
  const state: ConnectionInstance = {
    socket: null,
    qr: null,
    qrExpiresAt: null,
    currentState: 'disconnected',
    listeners: new Set<(data: string) => void>(),
    isLoggingOut: false,
  };
  connections.set(sessionId, state);
  return state;
}

// ============================================================
// ASYNC WEBHOOK DISPATCH (never blocks message pipeline)
// ============================================================
async function dispatchWebhook(
  sessionId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await webhookQueue.add('deliver', {
      session_id: sessionId,
      event,
      data,
      timestamp: new Date().toISOString(),
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false, // Keep for DLQ inspection
    });
  } catch (err) {
    logger.error({ sessionId, event, err }, 'Failed to enqueue webhook job');
  }
}

// ============================================================
// SESSION STATUS SYNC (local PostgreSQL — not Supabase)
// ============================================================
async function syncSessionStatus(
  sessionId: string,
  targetState: SessionState,
  extra?: Record<string, unknown>
): Promise<void> {
  const state = connections.get(sessionId);

  // If no in-memory state, write directly to DB (used by disconnectSession)
  if (!state) {
    const phone = (extra?.phone as string) ?? null;
    const lastQr = targetState === 'qr_pending' ? new Date() : null;

    await localDb.query(
      `INSERT INTO session_status (session_id, status, phone, last_qr, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (session_id) DO UPDATE
       SET status = $2,
           phone = COALESCE($3, session_status.phone),
           last_qr = COALESCE($4, session_status.last_qr),
           updated_at = NOW()`,
      [sessionId, targetState, phone, lastQr]
    );
    return;
  }

  // Skip if already in target state (idempotent)
  if (state.currentState === targetState) {
    // Still broadcast to SSE listeners
    void broadcastToSSE(sessionId, JSON.stringify({ type: 'status', status: targetState, ...extra }));
    return;
  }

  if (!isValidTransition(state.currentState, targetState)) {
    logger.warn(
      { sessionId, from: state.currentState, to: targetState },
      'Invalid session state transition skipped'
    );
    return;
  }

  state.currentState = targetState;

  const phone = (extra?.phone as string) ?? null;
  const lastQr = targetState === 'qr_pending' ? new Date() : null;

  await localDb.query(
    `INSERT INTO session_status (session_id, status, phone, last_qr, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (session_id) DO UPDATE
     SET status = $2,
         phone = COALESCE($3, session_status.phone),
         last_qr = COALESCE($4, session_status.last_qr),
         updated_at = NOW()`,
    [sessionId, targetState, phone, lastQr]
  );

  // Broadcast to SSE listeners
  void broadcastToSSE(sessionId, JSON.stringify({ type: 'status', status: targetState, ...extra }));

  // Log the event to local DB
  void localDb.query(
    `INSERT INTO session_logs (session_id, event, detail) VALUES ($1, $2, $3)`,
    [
      sessionId,
      targetState === 'connected' ? 'connected'
        : targetState === 'disconnected' ? 'disconnected'
        : targetState === 'qr_pending' ? 'qr_generated'
        : targetState === 'banned' ? 'banned'
        : 'error',
      JSON.stringify({ status: targetState, ...extra }),
    ]
  );

  // Dispatch session status webhook (async, non-blocking)
  void dispatchWebhook(sessionId, 'session.status', { status: targetState, ...extra });
}

async function logMessage(
  sessionId: string,
  msg: WAMessage,
  direction: 'in' | 'out',
  status: string
): Promise<void> {
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  let msgType = 'text';
  let content: any = msg.message?.conversation;
  if (!content) {
    const keys = Object.keys(msg.message ?? {});
    if (keys.length > 0) {
      msgType = keys[0] ?? 'text';
      content = (msg.message as any)?.[keys[0] as string] ?? null;
    }
  }

  // Write to local PostgreSQL — NOT Supabase
  try {
    await localDb.query(
      `INSERT INTO message_logs (session_id, user_id, direction, type, to_from, content, status, wa_message_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [sessionId, session.user_id, direction, msgType, msg.key.remoteJid ?? '', JSON.stringify(content), status, msg.key.id]
    );
  } catch (err) {
    logger.error({ sessionId, err }, 'Failed to write message log to local DB');
  }
}

async function emitMessageWebhooks(
  sessionId: string,
  msg: WAMessage,
  direction: 'in' | 'out',
  type: string
): Promise<void> {
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('webhook_url, webhook_events')
    .eq('id', sessionId)
    .single();

  if (!session?.webhook_url) return;

  const events = session.webhook_events ?? [];
  const remoteJid = msg.key.remoteJid ?? '';
  const isGroup = remoteJid.includes('@g.us');
  const isNewsletter = remoteJid.includes('@newsletter') || remoteJid.includes('broadcast');

  // messages.upsert — ALL messages (in + out)
  if (events.includes('messages.upsert')) {
    void dispatchWebhook(sessionId, 'messages.upsert', { message: msg, type, direction });
  }

  // messages.received — incoming personal messages only
  if (direction === 'in' && !isGroup && !isNewsletter && events.includes('messages.received')) {
    void dispatchWebhook(sessionId, 'messages.received', { message: msg });
  }

  // messages.personal — incoming personal chat
  if (direction === 'in' && !isGroup && !isNewsletter && events.includes('messages.personal')) {
    void dispatchWebhook(sessionId, 'messages.personal', { message: msg });
  }

  // messages.group — incoming group messages
  if (direction === 'in' && isGroup && events.includes('messages.group')) {
    void dispatchWebhook(sessionId, 'messages.group', { message: msg, groupId: remoteJid });
  }

  // messages.newsletter — incoming channel/newsletter messages
  if (direction === 'in' && isNewsletter && events.includes('messages.newsletter')) {
    void dispatchWebhook(sessionId, 'messages.newsletter', { message: msg });
  }

  // messages.sent — outgoing messages
  if (direction === 'out' && events.includes('messages.sent')) {
    void dispatchWebhook(sessionId, 'messages.sent', { message: msg });
  }

  // messages.reaction — detect reactions (protocolMessage with reaction)
  const msgType = getContentType((msg.message ?? {}) as Record<string, unknown>);
  if (msgType === 'protocolMessage' && (msg.message as any)?.protocolMessage?.type === 4) {
    // Baileys type 4 = REVOKE (message deleted)
    if (events.includes('messages.deleted')) {
      void dispatchWebhook(sessionId, 'messages.deleted', {
        message_id: msg.key.id,
        deleted_by: msg.key.fromMe ? 'sender' : 'other',
      });
    }
  }

  // Detect reactions in incoming messages
  if (direction === 'in' && msg.message?.reactionMessage) {
    if (events.includes('messages.reaction')) {
      const reaction = msg.message.reactionMessage as any;
      void dispatchWebhook(sessionId, 'messages.reaction', {
        emoji: reaction.text,
        message_id: reaction.key?.id,
        from: remoteJid,
      });
    }
  }
}

/** Extract the message type key from a Baileys message object */
function getContentType(message: Record<string, unknown>): string | null {
  const keys = Object.keys(message);
  return keys.length > 0 ? keys[0]! : null;
}

async function broadcastToSSE(sessionId: string, data: string): Promise<void> {
  const state = connections.get(sessionId);
  if (state) {
    state.listeners.forEach((fn) => fn(data));
  }
}

// ============================================================
// ADAPTIVE BAN PROTECTION
// Tracks per-recipient velocity and enforces cooldown
// ============================================================
const recipientVelocity = new Map<string, number[]>();

function checkAdaptiveThrottle(sessionId: string, recipient: string): { allowed: boolean; waitMs: number } {
  const key = `${sessionId}:${recipient}`;
  const timestamps = recipientVelocity.get(key) ?? [];
  const now = Date.now();

  // Window: last 60 seconds
  const recent = timestamps.filter((t) => now - t < 60000);
  recent.push(now);
  recipientVelocity.set(key, recent);

  const msgsPerMin = recent.length;

  // Adaptive delay based on velocity
  if (msgsPerMin > 20) return { allowed: false, waitMs: 10000 }; // >20/min → 10s cooldown
  if (msgsPerMin > 10) return { allowed: false, waitMs: 3000 };  // >10/min → 3s cooldown
  if (msgsPerMin > 5) return { allowed: false, waitMs: 1500 };   // >5/min → 1.5s cooldown

  return { allowed: true, waitMs: 0 };
}

// Cleanup old velocity data every 5 minutes
const velocityCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of recipientVelocity.entries()) {
    const recent = timestamps.filter((t) => now - t < 60000);
    if (recent.length === 0) {
      recipientVelocity.delete(key);
    } else {
      recipientVelocity.set(key, recent);
    }
  }
}, 300000);
velocityCleanup.unref();

// ============================================================
// SESSION LIFECYCLE
// ============================================================
const RECONNECT_COOLDOWN_MS = 5000; // Minimum 5s between reconnects

export async function startSession(session: SessionRecord): Promise<{ success: boolean; message: string }> {
  const existing = connections.get(session.id);

  // If already actively connected, don't restart
  if (existing?.socket && existing.currentState === 'connected') {
    return { success: false, message: 'Session already running on this worker' };
  }

  // Gracefully close existing socket if present
  if (existing?.socket) {
    existing.socket.end(undefined);
    existing.socket = null;
    // Don't delete the state — preserve QR and listeners across reconnects
  }

  // Force-take ownership (dead worker takeover handles conflicts)
  const claimed = await claimSession(session.id);
  if (!claimed) {
    return { success: false, message: 'Session owned by another active worker' };
  }

  const state = getOrCreateSSEState(session.id);
  state.currentState = 'connecting';

  const authDir = join(SESSIONS_DIR, session.id);
  if (!existsSync(authDir)) mkdirSync(authDir, { recursive: true });

  // Decrypt any encrypted Baileys session files before loading
  decryptSessionFiles(session.id);

  const { state: authState, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  state.currentState = 'connecting';
  await syncSessionStatus(session.id, 'connecting');

  const sock = makeWASocket({
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(authState.keys, logger as any),
    },
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    version,
    logger: logger as any,
    markOnlineOnConnect: true,
    getMessage: async (key) => {
      const { data } = await supabase
        .from('message_logs')
        .select('content')
        .eq('session_id', session.id)
        .eq('wa_message_id', key.id)
        .single();
      return data?.content as any;
    },
  });

  state.socket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      state.qr = qr;
      state.qrExpiresAt = Date.now() + 60000;
      state.currentState = 'qr_pending';
      await syncSessionStatus(session.id, 'qr_pending');
      void dispatchWebhook(session.id, 'qrcode.updated', { expires_at: new Date(state.qrExpiresAt).toISOString() });
    }

    if (connection === 'open') {
      const phone = sock.user?.id?.split(':')[0] ?? null;
      state.currentState = 'connected';
      await syncSessionStatus(session.id, 'connected', { phone });
      // Also update the phone in whatsapp_sessions table so the dashboard sees it
      if (phone) {
        await supabase
          .from('whatsapp_sessions')
          .update({ phone, last_connected: new Date().toISOString() })
          .eq('id', session.id);
      }
      state.qr = null;
      recipientVelocity.clear();
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode as number;
      const reason = (DisconnectReason as Record<number, string>)[statusCode] ?? 'unknown';

      // If we're logging out, skip all reconnect logic
      if (state.isLoggingOut) {
        state.socket = null;
        state.currentState = 'disconnected';
        connections.delete(session.id);
        return;
      }

      if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.forbidden) {
        state.currentState = 'banned';
        await syncSessionStatus(session.id, 'banned', { reason });
        state.socket = null;
        connections.delete(session.id);
        await releaseSession(session.id);
        return;
      }

      state.currentState = 'reconnecting';
      await syncSessionStatus(session.id, 'reconnecting', { reason, statusCode });

      // Release old Redis lock before reconnecting (we'll reclaim on reconnect)
      await releaseSession(session.id);

      // Clear the socket reference but KEEP the in-memory state (preserves QR + SSE listeners)
      state.socket = null;

      // Enforce minimum cooldown between reconnects to prevent rapid loops
      const now = Date.now();
      const lastReconnect = (state as any).lastReconnectAt ?? 0;
      const timeSinceLastReconnect = now - lastReconnect;
      if (timeSinceLastReconnect < RECONNECT_COOLDOWN_MS) {
        const waitMs = RECONNECT_COOLDOWN_MS - timeSinceLastReconnect;
        logger.info({ sessionId: session.id, reason, cooldownMs: waitMs }, 'Reconnect cooldown');
        (state as any).reconnectAttempts = ((state as any).reconnectAttempts ?? 0) + 1;
        setTimeout(() => {
          void startSession(session);
        }, waitMs);
      } else {
        // Adaptive reconnect backoff: 5s, 10s, 20s, max 60s
        const backoffMs = Math.min(5000 * Math.pow(2, (state as any).reconnectAttempts ?? 0), 60000);
        (state as any).reconnectAttempts = ((state as any).reconnectAttempts ?? 0) + 1;
        (state as any).lastReconnectAt = now;
        logger.info({ sessionId: session.id, reason, backoffMs }, 'Scheduling reconnect');
        setTimeout(() => {
          void startSession(session);
        }, backoffMs);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[]; type: MessageUpsertType }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      const isFromMe = msg.key.fromMe;
      const direction: 'in' | 'out' = isFromMe ? 'out' : 'in';

      await logMessage(session.id, msg, direction, type === 'notify' ? 'delivered' : 'sent');

      // Emit webhooks asynchronously — never blocks the pipeline
      void emitMessageWebhooks(session.id, msg, direction, type);
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const msgStatus = (update as any).status as string | undefined;
      if (update.key?.id && msgStatus) {
        await supabase
          .from('message_logs')
          .update({ status: msgStatus })
          .eq('session_id', session.id)
          .eq('wa_message_id', update.key.id);
      }

      void dispatchWebhook(session.id, 'messages.update', {
        message_id: update.key?.id,
        status: msgStatus,
      });
    }
  });

  sock.ev.on('contacts.upsert', async (contacts) => {
    void dispatchWebhook(session.id, 'contacts.upsert', { count: contacts.length });
  });

  sock.ev.on('contacts.update', async (contacts) => {
    void dispatchWebhook(session.id, 'contacts.update', { count: contacts.length });
  });

  sock.ev.on('groups.upsert', async (groups) => {
    void dispatchWebhook(session.id, 'groups.upsert', { count: groups.length });
  });

  sock.ev.on('group-participants.update', async (update) => {
    void dispatchWebhook(session.id, 'groups.participants', update);
  });

  sock.ev.on('chats.upsert', async (chats) => {
    void dispatchWebhook(session.id, 'chats.upsert', { count: chats.length });
  });

  sock.ev.on('chats.update', async (chats) => {
    void dispatchWebhook(session.id, 'chats.update', { count: chats.length });
  });

  sock.ev.on('chats.delete', async (ids) => {
    void dispatchWebhook(session.id, 'chats.delete', { ids });
  });

  sock.ev.on('call', async (calls) => {
    void dispatchWebhook(session.id, 'calls.received', { count: calls.length });
  });

  sock.ev.on('message-receipt.update', async (receipts) => {
    void dispatchWebhook(session.id, 'messages.receipt', { receipts });
  });

  // Baileys: messages.delete fires when a message is deleted (revoke)
  sock.ev.on('messages.delete', async (deletions) => {
    const keys = Array.isArray(deletions) ? deletions : (deletions as any).keys ?? [];
    void dispatchWebhook(session.id, 'messages.deleted', {
      count: keys.length,
      keys: keys.map((k: any) => ({ id: k?.id, remoteJid: k?.remoteJid })),
    });
  });

  // Poll votes come through messages.upsert as pollUpdateMessage, handled in messages.received event.

  return { success: true, message: 'Session starting' };
}

export async function disconnectSession(sessionId: string): Promise<void> {
  const state = connections.get(sessionId);

  if (state?.socket) {
    state.isLoggingOut = true;
    const sock = state.socket as any;

    // Immediately set & broadcast disconnected status for real-time SSE
    state.currentState = 'disconnected';
    await syncSessionStatus(sessionId, 'disconnected');

    // Manually send the proper logout IQ that Baileys uses internally.
    // This matches the exact format from baileys/lib/Socket/socket.js:logout().
    // We send it explicitly and wait, so the server has time to process it
    // before we close the socket.
    const jid = sock.authState?.creds?.me?.id;
    if (jid) {
      try {
        await sock.sendNode({
          tag: 'iq',
          attrs: {
            to: '@s.whatsapp.net',
            type: 'set',
            id: sock.generateMessageTag?.() ?? `${Date.now()}.0`,
            xmlns: 'md',
          },
          content: [
            {
              tag: 'remove-companion-device',
              attrs: { jid, reason: 'user_initiated' },
            },
          ],
        });
        // Give WhatsApp servers time to process the logout signal
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        logger.warn({ sessionId, err }, 'Logout IQ failed');
      }
    }

    // Close the socket
    try {
      sock.end(new Error('Intentional Logout'));
    } catch {
      // ignore
    }

    // Wait for socket to fully close
    await new Promise<void>((resolve) => {
      if (!sock.ws?.socket?.readyState || sock.ws.socket.readyState === 3) {
        resolve();
        return;
      }
      const timeout = setTimeout(() => resolve(), 5000);
      sock.ev.once('connection.update', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    state.socket = null;
  } else {
    // Socket not in memory — create temp connection for logout
    const authDir = join(SESSIONS_DIR, sessionId);
    if (existsSync(authDir)) {
      decryptSessionFiles(sessionId);

      try {
        const { state: authState, saveCreds } = await useMultiFileAuthState(authDir);

        if (authState.creds.me) {
          const { version } = await fetchLatestBaileysVersion();
          const tempSock = makeWASocket({
            auth: {
              creds: authState.creds,
              keys: makeCacheableSignalKeyStore(authState.keys, logger as any),
            },
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            version,
            logger: logger as any,
            markOnlineOnConnect: false,
          });

          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => { tempSock.end(undefined); resolve(); }, 15000);
            tempSock.ev.on('connection.update', async (update) => {
              if (update.connection === 'open') {
                try {
                  const jid = (tempSock as any).authState?.creds?.me?.id;
                  if (jid) {
                    await (tempSock as any).sendNode({
                      tag: 'iq',
                      attrs: {
                        to: '@s.whatsapp.net',
                        type: 'set',
                        id: (tempSock as any).generateMessageTag?.() ?? `${Date.now()}.0`,
                        xmlns: 'md',
                      },
                      content: [
                        { tag: 'remove-companion-device', attrs: { jid, reason: 'user_initiated' } },
                      ],
                    });
                    await new Promise((r) => setTimeout(r, 2000));
                  }
                } catch { /* ignore */ }
                tempSock.end(undefined);
                clearTimeout(timeout);
                resolve();
              } else if (update.connection === 'close') {
                tempSock.end(undefined);
                clearTimeout(timeout);
                resolve();
              }
            });
          });
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (err) {
        logger.warn({ sessionId, err }, 'Failed to create temp connection for logout');
      }
    }
  }

  // Delete Baileys session files so creds can't be reused
  const authDir = join(SESSIONS_DIR, sessionId);
  if (existsSync(authDir)) {
    require('fs').rmSync(authDir, { recursive: true, force: true });
  }

  // Clean up in-memory state
  connections.delete(sessionId);
  await releaseSession(sessionId);
}

export async function unbanSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  // Delete Baileys session files so stale creds are gone
  const authDir = join(SESSIONS_DIR, sessionId);
  if (existsSync(authDir)) {
    require('fs').rmSync(authDir, { recursive: true, force: true });
  }

  // Reset status to disconnected
  await syncSessionStatus(sessionId, 'disconnected');

  // Clean up in-memory state if present
  connections.delete(sessionId);
  await releaseSession(sessionId);

  // Log the unban
  void localDb.query(
    `INSERT INTO session_logs (session_id, event, detail) VALUES ($1, $2, $3)`,
    [sessionId, 'session_unbanned', JSON.stringify({ action: 'manual_unban' })]
  );

  return { success: true, message: 'Session unbanned — click Start to reconnect' };
}

export function getSessionSocket(sessionId: string): WASocket | null {
  return connections.get(sessionId)?.socket ?? null;
}

export function getQrCode(sessionId: string): { qr: string | null; expiresAt: number | null } {
  const state = connections.get(sessionId);
  if (!state) return { qr: null, expiresAt: null };
  return { qr: state.qr, expiresAt: state.qrExpiresAt };
}

export async function restartSession(session: SessionRecord): Promise<{ success: boolean; message: string }> {
  await disconnectSession(session.id);
  return startSession(session);
}

export function getWorkerId(): string {
  return WORKER_ID;
}

export function checkAdaptiveThrottleForSession(sessionId: string, recipient: string): { allowed: boolean; waitMs: number } {
  return checkAdaptiveThrottle(sessionId, recipient);
}
