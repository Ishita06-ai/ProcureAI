'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, Loader2, Plus, Trash2, MessageSquare, ArrowDown, BarChart3, ShoppingCart, Boxes, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { toast } from 'sonner';
import { fmtRelative, initials } from '@/lib/procurement-utils';

const SUGGESTIONS = [
  { icon: AlertTriangle, text: 'Which products are at risk of stockout this month?',          color: 'text-amber-500' },
  { icon: BarChart3,    text: 'Give me a procurement health snapshot.',                       color: 'text-violet-500' },
  { icon: ShoppingCart, text: 'What pending approvals should I prioritize?',                  color: 'text-sky-500' },
  { icon: Users,        text: 'Which vendors are highest risk and why?',                      color: 'text-rose-500' },
  { icon: Boxes,        text: 'How is my inventory distributed across warehouses?',           color: 'text-emerald-500' },
  { icon: Sparkles,     text: 'Recommend 3 actions to save spend this quarter.',              color: 'text-fuchsia-500' },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 0.15, 0.3].map((d, i) => (
        <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: d }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg, userName }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="h-7 w-7 shrink-0">
        {isUser ? (
          <AvatarFallback className="text-[10px] bg-muted">{initials(userName || 'You')}</AvatarFallback>
        ) : (
          <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </AvatarFallback>
        )}
      </Avatar>
      <div className={cn('max-w-[78%]', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser ? 'bg-primary text-primary-foreground rounded-tr-md' : 'bg-muted/60 border border-border/60 rounded-tl-md'
        )}>
          {msg.content}
        </div>
        {!isUser && msg.citations?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.citations.map((c, i) => (
              <Badge key={i} variant="outline" className="h-5 text-[10px] bg-card border-border/70 text-muted-foreground gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary" /> {c.label}
              </Badge>
            ))}
          </div>
        )}
        {msg.fallback && (
          <div className="mt-1 text-[10px] text-amber-500">Data-grounded fallback (model offline)</div>
        )}
      </div>
    </div>
  );
}

export function AiAssistantPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef(null);

  const refreshConvos = useCallback(async () => {
    try {
      const r = await api.listAiConversations();
      setConversations(r.data || []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { refreshConvos(); }, [refreshConvos]);

  const openConvo = async (id) => {
    if (id === activeId) return;
    setActiveId(id);
    setLoadingHistory(true);
    try {
      const r = await api.getAiConversation(id);
      setMessages(r.data.messages || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingHistory(false); }
  };

  const newConvo = () => { setActiveId(null); setMessages([]); setInput(''); };

  const removeConvo = async (id, e) => {
    e.stopPropagation();
    try {
      await api.deleteAiConversation(id);
      if (activeId === id) newConvo();
      await refreshConvos();
    } catch (e) { toast.error(e.message); }
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');
    setMessages(m => [...m, { role: 'user', content, at: new Date() }]);
    try {
      const r = await api.aiChat({ conversationId: activeId, message: content });
      setActiveId(r.data.conversationId);
      setMessages(m => [...m, { ...r.data.assistant, at: new Date() }]);
      await refreshConvos();
    } catch (e) {
      toast.error(e.message);
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}`, at: new Date() }]);
    } finally { setSending(false); }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] border-r border-border/60 bg-muted/20">
        <div className="p-3 border-b border-border/60">
          <Button size="sm" className="w-full h-9 gap-1.5" onClick={newConvo}>
            <Plus className="h-4 w-4" /> New conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 && (
              <div className="text-center py-8 text-[11px] text-muted-foreground">No conversations yet.</div>
            )}
            {conversations.map(c => (
              <button
                key={c._id}
                onClick={() => openConvo(c._id)}
                className={cn(
                  'group w-full text-left flex items-start gap-2 rounded-lg p-2.5 transition-colors',
                  activeId === c._id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtRelative(c.updatedAt)}</div>
                </div>
                <button onClick={(e) => removeConvo(c._id, e)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" aria-label="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6">
            {messages.length === 0 && !loadingHistory && (
              <div className="text-center py-10">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
                  <Sparkles className="h-7 w-7 text-white" />
                </motion.div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">Procurio AI</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Ask anything about your procurement and inventory. I read your live MongoDB data and ground every answer.
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto text-left">
                  {SUGGESTIONS.map((s, i) => {
                    const Ic = s.icon;
                    return (
                      <button key={i} onClick={() => send(s.text)}
                        className="group rounded-xl border border-border/60 bg-card p-3 hover:border-border hover:bg-accent/40 transition-colors text-left">
                        <Ic className={cn('h-3.5 w-3.5', s.color)} />
                        <p className="text-xs text-foreground/90 mt-2 leading-relaxed">{s.text}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {loadingHistory && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            )}
            {!loadingHistory && messages.length > 0 && (
              <div className="space-y-5">
                {messages.map((m, i) => <MessageBubble key={i} msg={m} userName={user?.name} />)}
                {sending && (
                  <div className="flex gap-3">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"><Sparkles className="h-3.5 w-3.5" /></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/60 border border-border/60 rounded-2xl rounded-tl-md px-4 py-3"><TypingDots /></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t border-border/60 bg-card/40 backdrop-blur px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="Ask anything about procurement, vendors, inventory…  (Enter to send, Shift+Enter for newline)"
                className="resize-none pr-12 min-h-[48px] max-h-[160px]"
              />
              <Button
                size="icon"
                disabled={sending || !input.trim()}
                onClick={() => send()}
                className="absolute right-2 bottom-2 h-8 w-8"
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground text-center">
              Grounded on live MongoDB data · Procurio AI may surface PR/PO numbers, vendors, SKUs and amounts directly from your workspace.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
