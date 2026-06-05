import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';
import ChatInboxClient from '@/components/chats/chat-inbox-client';

export const dynamic = 'force-dynamic';

export default async function ChatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const conversations = await query<any>(
    'SELECT * FROM chat_conversations WHERE user_id = $1 ORDER BY last_message_at DESC NULLS LAST',
    [user.id]
  );

  const sessions = await query<{ id: string; name: string; status: string }>(
    'SELECT id, name, status FROM whatsapp_sessions WHERE user_id = $1',
    [user.id]
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">$ kontro chats ls</span>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground">Chats</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">All WhatsApp conversations across your sessions.</p>
      </div>

      <ChatInboxClient
        initialConversations={conversations}
        sessions={sessions}
      />
    </div>
  );
}
