import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

function extractPhone(jid: string): string {
  return jid.replace(/@.*$/, '');
}

function extractText(msg: any): string | null {
  const content = msg?.message;
  if (!content) return null;
  if (content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;
  if (content.imageMessage?.caption) return content.imageMessage.caption;
  if (content.videoMessage?.caption) return content.videoMessage.caption;
  if (content.documentMessage?.caption) return content.documentMessage.caption;
  return '[media]';
}

function extractType(msg: any): string {
  const content = msg?.message;
  if (!content) return 'unknown';
  if (content.conversation || content.extendedTextMessage) return 'text';
  if (content.imageMessage) return 'image';
  if (content.videoMessage) return 'video';
  if (content.audioMessage) return 'audio';
  if (content.documentMessage) return 'document';
  if (content.locationMessage) return 'location';
  if (content.contactMessage) return 'contact';
  if (content.stickerMessage) return 'sticker';
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, session_id, data } = body;

    if (!event || !session_id || !data?.message) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    const msg = data.message;
    const remoteJid = msg.key?.remoteJid;
    if (!remoteJid) return NextResponse.json({ success: false, message: 'No remoteJid' });

    const phone = extractPhone(remoteJid);
    if (remoteJid.includes('@g.us')) {
      return NextResponse.json({ success: true, message: 'Group messages skipped' });
    }

    const direction = msg.key?.fromMe ? 'out' : 'in';
    const pushName = msg.pushName || phone;
    const text = extractText(msg) || '[message]';
    const msgType = extractType(msg);
    const messageId = msg.key?.id || randomUUID();

    const session = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM whatsapp_sessions WHERE id = $1 LIMIT 1',
      [session_id]
    );
    if (!session?.user_id) {
      return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
    }
    const userId = session.user_id;

    const existingConvo = await queryOne<{ id: string; unread_count: number }>(
      `SELECT id, unread_count FROM chat_conversations
       WHERE user_id = $1 AND session_id = $2 AND phone = $3 LIMIT 1`,
      [userId, session_id, phone]
    );

    let conversationId: string;
    if (existingConvo) {
      conversationId = existingConvo.id;
      const newUnread = direction === 'in' ? (existingConvo.unread_count || 0) + 1 : (existingConvo.unread_count || 0);
      await query(
        `UPDATE chat_conversations
         SET last_message = $1, last_message_at = NOW(), unread_count = $2
         WHERE id = $3`,
        [text, newUnread, conversationId]
      );
    } else {
      const newConvo = await queryOne<{ id: string }>(
        `INSERT INTO chat_conversations (user_id, session_id, phone, push_name, last_message, last_message_at, unread_count)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         RETURNING id`,
        [userId, session_id, phone, pushName, text, direction === 'in' ? 1 : 0]
      );
      conversationId = newConvo!.id;
    }

    await query(
      `INSERT INTO chat_messages (conversation_id, message_id, direction, text, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [conversationId, messageId, direction, text, msgType]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
