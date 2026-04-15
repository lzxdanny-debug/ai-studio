'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send, Bot, User, ChevronDown, Sparkles, Loader2, Plus,
  MessageSquare, Trash2, Pencil, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DocLink } from '@/components/ui/doc-link';
import { getDocUrl } from '@/lib/doc-urls';
import { ApiKeySelector } from '@/components/ui/api-key-selector';
import { ChatModel } from '@ai-platform/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CHAT_MODELS = [
  { value: ChatModel.GPT51, label: 'GPT-5.1', tag: 'OpenAI', badge: 'NEW' },
  { value: ChatModel.GPT52, label: 'GPT-5.2', tag: 'OpenAI', badge: 'NEW' },
  { value: ChatModel.CLAUDE_SONNET_46, label: 'Claude Sonnet 4.6', tag: 'Anthropic' },
  { value: ChatModel.CLAUDE_OPUS_46, label: 'Claude Opus 4.6', tag: 'Anthropic' },
  { value: ChatModel.CLAUDE_HAIKU_45, label: 'Claude Haiku 4.5', tag: 'Anthropic' },
  { value: ChatModel.GEMINI_3_PRO, label: 'Gemini 3 Pro', tag: 'Google', badge: 'NEW' },
  { value: ChatModel.GEMINI_3_FLASH, label: 'Gemini 3 Flash', tag: 'Google' },
  { value: ChatModel.GEMINI_25_PRO, label: 'Gemini 2.5 Pro', tag: 'Google' },
  { value: ChatModel.GEMINI_25_FLASH, label: 'Gemini 2.5 Flash', tag: 'Google' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface Session {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
}

function groupSessionsByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Session[]> = { 今天: [], 昨天: [], 最近7天: [], 更早: [] };

  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    d.setHours(0, 0, 0, 0);
    if (d >= today) groups['今天'].push(s);
    else if (d >= yesterday) groups['昨天'].push(s);
    else if (d >= weekAgo) groups['最近7天'].push(s);
    else groups['更早'].push(s);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(ChatModel.GPT51);
  const [selectedApiKey, setSelectedApiKey] = useState<string | undefined>(undefined);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chat-sessions`, { headers: getAuthHeader() });
      const json = await res.json();
      const list = json?.data ?? json;
      if (Array.isArray(list)) setSessions(list);
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // URL 带 sessionId 时，会话列表加载完后自动打开对应会话
  useEffect(() => {
    if (initialSessionId && !sessionsLoading && !activeSessionId) {
      loadSession(initialSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId, sessionsLoading]);

  const loadSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([]);
    try {
      const res = await fetch(`${API_BASE}/chat-sessions/${sessionId}`, { headers: getAuthHeader() });
      const json = await res.json();
      const payload = json?.data ?? json;
      if (payload.session) {
        setSelectedModel(payload.session.model || ChatModel.GPT51);
      }
      if (Array.isArray(payload.messages)) {
        setMessages(payload.messages.map((m: any) => ({ role: m.role, content: m.content })));
      }
    } catch {
      // ignore
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ model: selectedModel }),
      });
      const json = await res.json();
      const session: Session = json?.data ?? json;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch {
      alert('创建会话失败，请重试');
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确认删除该会话？')) return;
    await fetch(`${API_BASE}/chat-sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const startRename = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveRename = async (sessionId: string) => {
    if (!editingTitle.trim()) return;
    await fetch(`${API_BASE}/chat-sessions/${sessionId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ title: editingTitle.trim() }),
    }).catch(() => {});
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: editingTitle.trim() } : s)),
    );
    setEditingSessionId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!selectedApiKey) {
      alert('请先选择 API Key。前往 shanhaiapi.com/zh/console/keys/ 创建后刷新页面即可使用。');
      return;
    }

    let sessionId = activeSessionId;

    // 如果没有活跃会话，自动创建一个
    if (!sessionId) {
      try {
        const res = await fetch(`${API_BASE}/chat-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ model: selectedModel }),
        });
        const json = await res.json();
        const session: Session = json?.data ?? json;
        sessionId = session.id;
        setActiveSessionId(sessionId);
        setSessions((prev) => [session, ...prev]);
      } catch {
        alert('创建会话失败，请重试');
        return;
      }
    }

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages: Message[] = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const assistantMessage: Message = { role: 'assistant', content: '', isStreaming: true };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const response = await fetch(`${API_BASE}/chat-sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          apiKey: selectedApiKey,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  content += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content, isStreaming: true };
                    return updated;
                  });
                } else if (parsed.error) {
                  content = `⚠️ 错误：${parsed.error}`;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content, isStreaming: false };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content, isStreaming: false };
        return updated;
      });

      // 更新会话列表中的 updatedAt 和 title（乐观更新）
      setSessionsLoading(false);
      fetchSessions();
    } catch (error: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `错误：${error?.message || '请求失败'}`,
          isStreaming: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedModelData = CHAT_MODELS.find((m) => m.value === selectedModel);
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ──────────────── 左侧会话列表 ──────────────── */}
      <aside className="w-60 flex-shrink-0 border-r border-border flex flex-col bg-[#0f0f0f]">
        <div className="p-3 border-b border-border">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm"
            onClick={createNewSession}
          >
            <Plus className="h-4 w-4" />
            新建对话
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sessionsLoading ? (
            <div className="flex justify-center mt-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground mt-8 px-4">
              暂无对话记录<br />点击「新建对话」开始
            </p>
          ) : (
            groupedSessions.map(({ label, items }) => (
              <div key={label}>
                <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                  {label}
                </p>
                {items.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      'group relative flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer text-sm transition-colors',
                      activeSessionId === session.id
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    {editingSessionId === session.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent border-b border-primary outline-none text-sm min-w-0"
                      />
                    ) : (
                      <span className="flex-1 truncate text-xs leading-5">{session.title}</span>
                    )}

                    {editingSessionId === session.id ? (
                      <span className="flex gap-1 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); saveRename(session.id); }} className="text-green-400 hover:text-green-300">
                          <Check className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }} className="text-red-400 hover:text-red-300">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : (
                      <span className="hidden group-hover:flex gap-1 flex-shrink-0">
                        <button onClick={(e) => startRename(session, e)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => deleteSession(session.id, e)} className="text-muted-foreground hover:text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ──────────────── 右侧对话区域 ──────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="relative flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          {/* 模型选择 */}
          <button
            onClick={() => setIsModelOpen(!isModelOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{selectedModelData?.label}</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {selectedModelData?.tag}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', isModelOpen && 'rotate-180')} />
          </button>

          <DocLink href={getDocUrl(selectedModel)} label="API 文档" />

          <div className="ml-auto">
            <ApiKeySelector value={selectedApiKey} onChange={setSelectedApiKey} dropDirection="down" />
          </div>

          {isModelOpen && (
            <div className="absolute top-full left-4 mt-1 z-10 rounded-xl border border-border bg-card shadow-xl overflow-hidden min-w-64">
              {CHAT_MODELS.map((model) => (
                <button
                  key={model.value}
                  onClick={() => {
                    setSelectedModel(model.value);
                    setIsModelOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors',
                    selectedModel === model.value && 'bg-primary/10',
                  )}
                >
                  <span className="text-sm font-medium">{model.label}</span>
                  <span className="text-xs text-muted-foreground">{model.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Bot className="h-16 w-16 text-primary/30" />
              <h2 className="text-xl font-semibold">AI 对话助手</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                {activeSessionId
                  ? '发送消息开始对话'
                  : '点击「新建对话」或直接输入消息，将自动创建新会话'}
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn('flex gap-3 max-w-3xl mx-auto w-full', msg.role === 'user' && 'flex-row-reverse')}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border rounded-tl-sm',
                )}
              >
                <p className="whitespace-pre-wrap">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2 items-end border border-border rounded-2xl bg-[#1a1a1a] p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none px-2 py-1 max-h-40 text-foreground placeholder:text-muted-foreground/50"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <Button
              size="icon"
              variant="gradient"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
