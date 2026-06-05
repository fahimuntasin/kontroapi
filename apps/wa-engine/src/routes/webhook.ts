import { Router, type Request, type Response } from 'express';
import { deliverWebhook } from '../lib/webhook';
import { supabase } from '../lib/supabase';

const router = Router();

// POST /api/v1/webhook/test — test webhook delivery (public for testing)
router.post('/test', async (req: Request, res: Response) => {
  const { session_id, url, secret } = req.body as {
    session_id?: string;
    url?: string;
    secret?: string;
  };

  if (!session_id && !url) {
    return res.status(400).json({ success: false, message: 'session_id or url required' });
  }

  let webhookUrl = url;
  let webhookSecret = secret || 'test_secret';

  if (!webhookUrl && session_id) {
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('webhook_url, webhook_secret_enc')
      .eq('id', session_id)
      .single();

    if (!session?.webhook_url) {
      return res.status(400).json({ success: false, message: 'No webhook configured for session' });
    }

    webhookUrl = session.webhook_url;
  }

  const testPayload = {
    event: 'test.webhook',
    session_id: session_id || 'test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from KontroAPI',
      session_id: session_id || 'test',
    },
  };

  try {
    await deliverWebhook(webhookUrl!, webhookSecret, 'test.webhook' as any, session_id || 'test', testPayload.data);
    res.json({ success: true, message: 'Test webhook sent successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;