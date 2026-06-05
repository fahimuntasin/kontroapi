'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft, Search, Loader2, User, RefreshCw } from 'lucide-react';

interface Conversation {
  id: string;
  phone: string;
  push_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  session_id: string;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: 'in' | 'out';
  text: string;
  type: string;
  created_at: string;
}

interface Session {
  id: string;
  name: string;
  status: string;
}

export default function ChatInboxClient({
  initialConversations,
  sessions,
}: {
  initialConversations: Conversation[];
  sessions: Session[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = conversations.filter(
    (c) =>
      c.push_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    await fetch(`/api/chats/${conversationId}/read`, { method: 'POST' });

    const res = await fetch(`/api/chats/${conversationId}/messages`);
    const data = await res.json();
    setMessages(data.success ? data.data : []);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const selectConvo = async (convo: Conversation) => {
    setSelectedConvo(convo);
    await fetchMessages(convo.id);
  };

  const syncContacts = async () => {
    if (!sessions.length) {
      setSyncMsg('No active sessions');
      setTimeout(() => setSyncMsg(''), 3000);
      return;
    }
    setSyncing(true);
    setSyncMsg('');
    const connected = sessions.find((s) => s.status === 'connected') || sessions[0]!;
    try {
      const res = await fetch('/api/chats/sync-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: connected.id }),
      });
      const data = await res.json();
      setSyncMsg(data.success ? `Synced ${data.synced} contacts` : 'Sync failed');
      if (data.success) {
        const freshRes = await fetch('/api/chats');
        const freshData = await freshRes.json();
        if (freshData.success && freshData.data) setConversations(freshData.data);
      }
    } catch {
      setSyncMsg('Sync failed');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedConvo) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        conversation_id: selectedConvo.id,
        direction: 'out',
        text,
        type: 'text',
        created_at: new Date().toISOString(),
      },
    ]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    await fetch('/api/chats/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: selectedConvo.session_id,
        phone: selectedConvo.phone,
        text,
        conversation_id: selectedConvo.id,
      }),
    });

    setSending(false);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConvo.id
          ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
          : c
      )
    );
  };

  // Real-time polling (3s) — replace with SSE/WebSocket in future
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch('/api/chats');
        const data = await res.json();
        if (cancelled || !data.success) return;
        setConversations((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data.data)) return prev;
          return data.data;
        });

        if (selectedConvo) {
          const msgRes = await fetch(`/api/chats/${selectedConvo.id}/messages?since=${encodeURIComponent(selectedConvo.last_message_at || '')}`);
          const msgData = await msgRes.json();
          if (!cancelled && msgData.success && msgData.data?.length) {
            setMessages((prev) => {
              const ids = new Set(prev.map((m) => m.id));
              const fresh = msgData.data.filter((m: Message) => !ids.has(m.id));
              return [...prev, ...fresh];
            });
          }
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedConvo]);

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-0 overflow-hidden rounded-xl border border-border bg-card">
      {/* Sidebar - Conversations */}
      <div
        className={`flex h-full flex-col border-r border-border ${
          selectedConvo ? 'hidden md:flex md:w-[340px]' : 'flex w-full md:w-[340px]'
        }`}
      >
        <div className="border-b border-border p-3">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-full"
              onClick={syncContacts}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Sync Contacts
            </Button>
          </div>
          {syncMsg && <p className="text-[11px] text-[#5c5ff5] mt-1.5 text-center">{syncMsg}</p>}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <User className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs mt-1">Messages will appear here when contacts send you messages</p>
            </div>
          ) : (
            filtered.map((convo) => {
              const session = sessions.find((s) => s.id === convo.session_id);
              return (
                <button
                  key={convo.id}
                  onClick={() => selectConvo(convo)}
                  className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                    selectedConvo?.id === convo.id
                      ? 'bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10 border-l-2 border-[#5c5ff5]'
                      : ''
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3a3fd4]/80 to-[#5c5ff5]/80 text-white text-xs font-semibold">
                    {(convo.push_name || convo.phone).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {convo.push_name || convo.phone}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate pr-1">
                        {convo.last_message || '[media]'}
                      </span>
                      {convo.unread_count > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5c5ff5] text-[10px] font-semibold text-white px-1.5">
                          {convo.unread_count > 99 ? '99+' : convo.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat View */}
      {selectedConvo ? (
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border p-3">
            <button
              className="md:hidden p-1 rounded-lg hover:bg-muted"
              onClick={() => setSelectedConvo(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3a3fd4]/80 to-[#5c5ff5]/80 text-white text-xs font-semibold">
              {(selectedConvo.push_name || selectedConvo.phone).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium">{selectedConvo.push_name || selectedConvo.phone}</div>
              <div className="text-[11px] text-muted-foreground">{selectedConvo.phone}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      msg.direction === 'out'
                        ? 'bg-[#5c5ff5] text-white rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.direction === 'out' ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="flex-1 h-10 bg-muted/50"
              />
              <Button
                size="icon"
                className="h-10 w-10 bg-[#5c5ff5] hover:bg-[#5c5ff5]/90"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <User className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a chat to view messages</p>
          </div>
        </div>
      )}
    </div>
  );
}
