import { downloadMediaMessage, downloadContentFromMessage } from '@whiskeysockets/baileys';
import type { WAMessage, proto } from '@whiskeysockets/baileys';

export async function decryptMediaMessage(msg: WAMessage): Promise<Buffer | null> {
  try {
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger: console as any, reuploadRequest: () => Promise.resolve(null) as any }
    );
    return buffer as Buffer;
  } catch {
    return null;
  }
}

export function buildMediaPayload(
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker',
  url?: string,
  base64?: string
): { url?: string; base64?: Buffer } | null {
  if (base64) {
    return { base64: Buffer.from(base64, 'base64') };
  }
  if (url) {
    return { url };
  }
  return null;
}
