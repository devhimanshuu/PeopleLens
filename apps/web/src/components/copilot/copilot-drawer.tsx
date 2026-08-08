'use client';

import type { CopilotDeepLink, CopilotMessageView, CopilotResponse } from '@peoplelens/types';
import { Bot, Copy, Loader2, Send, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError } from '@/lib/api';
import {
  clearCopilotConversation,
  fetchCopilotCapabilities,
  fetchCopilotConversation,
  sendCopilotMessage,
} from '@/lib/copilot-api';
import { cn } from '@/lib/utils';
import { useCopilot } from './copilot-context';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolName?: string | null;
  provider?: string;
  model?: string;
  deepLinks?: CopilotDeepLink[];
  suggestions?: string[];
  createdAt?: string;
}

const CONVERSATION_KEY = 'peoplelens_copilot_conversation';

const DEFAULT_SUGGESTIONS = [
  'Which department has the highest observed attrition?',
  'How many employees are working overtime?',
  'Compare Engineering and Sales.',
  'Show me employees in Sales working overtime.',
];

export function CopilotDrawer() {
  const { open, setOpen, consumeQueuedQuestion } = useCopilot();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  // Capabilities + resume an existing thread from localStorage.
  useEffect(() => {
    let cancelled = false;
    fetchCopilotCapabilities()
      .then((caps) => {
        if (cancelled) return;
        setConfigured(caps.configured);
        if (!caps.configured) setSuggestions([]);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });

    const stored = window.localStorage.getItem(CONVERSATION_KEY);
    if (stored) {
      setLoadingHistory(true);
      fetchCopilotConversation(stored)
        .then((history) => {
          if (cancelled) return;
          setConversationId(stored);
          setMessages(history.map(toChatMessage));
        })
        .catch(() => window.localStorage.removeItem(CONVERSATION_KEY))
        .finally(() => {
          if (!cancelled) setLoadingHistory(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, loadingHistory]);

  // Focus the input when the drawer opens.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      const queued = consumeQueuedQuestion();
      if (queued) void send(queued);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const send = useCallback(
    async (rawQuestion?: string) => {
      const question = (rawQuestion ?? input).trim();
      if (!question || busy || sendingRef.current) return;
      sendingRef.current = true;
      setBusy(true);
      setError(null);

      const userMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      try {
        const response: CopilotResponse = await sendCopilotMessage({
          message: question,
          conversationId: conversationId ?? undefined,
        });
        setConversationId(response.conversationId);
        window.localStorage.setItem(CONVERSATION_KEY, response.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: `resp-${Date.now()}`,
            role: 'assistant',
            content: response.answer,
            toolName: response.provenance.toolUsed,
            provider: response.provenance.provider,
            model: response.provenance.model,
            deepLinks: response.deepLinks,
            suggestions: response.suggestions,
            createdAt: response.createdAt,
          },
        ]);
        setSuggestions(
          response.suggestions.length > 0 ? response.suggestions : DEFAULT_SUGGESTIONS,
        );
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'PeopleLens Copilot is temporarily unavailable.';
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        sendingRef.current = false;
        setBusy(false);
      }
    },
    [busy, conversationId, input],
  );

  const handleClear = useCallback(async () => {
    if (conversationId) {
      try {
        await clearCopilotConversation(conversationId);
      } catch {
        // Clearing is best-effort — the thread resets locally regardless.
      }
      window.localStorage.removeItem(CONVERSATION_KEY);
    }
    setConversationId(null);
    setMessages([]);
    setError(null);
    setSuggestions(configured ? DEFAULT_SUGGESTIONS : []);
  }, [conversationId, configured]);

  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard may be unavailable — copying is a convenience, not critical.
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-label="PeopleLens Copilot"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Panel */}
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col border-l border-border/60 bg-background shadow-2xl">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-sm">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">PeopleLens Copilot</p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <StatusDot configured={configured} />
                {configured === false ? 'Not configured' : 'Workforce intelligence'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={() => void handleClear()}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close copilot"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loadingHistory ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Resuming conversation…
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              configured={configured}
              suggestions={suggestions}
              onAsk={(q) => void send(q)}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={() => void copyMessage(message.content)}
                />
              ))}
              {busy ? <ThinkingBubble /> : null}
            </div>
          )}

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">Copilot unavailable</p>
                <p className="mt-0.5 text-[13px] leading-relaxed">{error}</p>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips (after the first answer) */}
        {messages.length > 0 && suggestions.length > 0 && !busy ? (
          <div className="shrink-0 space-y-1.5 border-t border-border/60 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Follow-up questions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void send(question)}
                  className="max-w-full truncate rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Input */}
        <div className="shrink-0 border-t border-border/60 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                configured === false ? 'Copilot is not configured' : 'Ask about your workforce…'
              }
              disabled={busy || configured === false || loadingHistory}
              rows={2}
              className="min-h-[44px] max-h-32 resize-none"
              aria-label="Ask the copilot a question"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void send()}
              disabled={busy || configured === false || loadingHistory || !input.trim()}
              aria-label="Send question"
              className="h-[44px] w-[44px] shrink-0 rounded-lg"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
            </Button>
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground/70">
            Answers are grounded in your current PeopleLens dataset and respect your access scope.
          </p>
        </div>
      </aside>
    </div>
  );
}

function StatusDot({ configured }: { configured: boolean | null }) {
  return (
    <span
      className={cn(
        'size-1.5 rounded-full',
        configured === null
          ? 'bg-muted-foreground/40'
          : configured
            ? 'bg-emerald-500'
            : 'bg-amber-500',
      )}
      aria-hidden
    />
  );
}

function EmptyState({
  configured,
  suggestions,
  onAsk,
}: {
  configured: boolean | null;
  suggestions: string[];
  onAsk: (question: string) => void;
}) {
  if (configured === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Bot className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground">Copilot is not configured</p>
        <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          An AI provider key (AI_API_KEY) is required to enable the Workforce Copilot. The rest of
          PeopleLens keeps working normally.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-sm">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <h2 className="mt-3 text-sm font-semibold text-foreground">Ask about your workforce</h2>
        <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          Ask about headcount, attrition, engagement, departments or employees — answers are
          computed from your live PeopleLens data.
        </p>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onAsk(question)}
            className="block w-full rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            “{question}”
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border/60 bg-muted/40 px-3 py-2.5">
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
        <span className="text-[13px] text-muted-foreground">Analyzing workforce data…</span>
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-sm">
      <Sparkles className="size-3.5" aria-hidden />
    </span>
  );
}

function MessageBubble({ message, onCopy }: { message: ChatMessage; onCopy: () => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <BotAvatar />
      <div className="min-w-0 max-w-[88%] flex-1">
        <div className="rounded-2xl rounded-bl-sm border border-border/60 bg-muted/40 px-3.5 py-3">
          <div className="copilot-markdown text-sm leading-relaxed text-foreground">
            <Markdown text={message.content} />
          </div>

          {message.deepLinks && message.deepLinks.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
              {message.deepLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-2 px-1">
          {message.toolName || message.provider ? (
            <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Source: {message.toolName ?? 'Copilot'}
              {message.provider ? ` · via ${message.provider}` : ''}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy answer"
            title="Copy answer"
            className="rounded p-1 text-muted-foreground/50 opacity-100 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Copy className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function toChatMessage(view: CopilotMessageView): ChatMessage {
  return {
    id: view.id,
    role: view.role,
    content: view.content,
    toolName: view.toolName,
    createdAt: view.createdAt,
  };
}

/**
 * Tiny markdown renderer — headings, bullets, numbered lists, bold, inline
 * code and internal links. No dangerouslySetInnerHTML, no new dependency.
 */
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listKind: 'bullet' | 'number' | null = null;

  const flushList = () => {
    if (listBuffer.length === 0 || listKind === null) return;
    blocks.push(
      listKind === 'bullet' ? (
        <ul key={`ul-${blocks.length}`} className="my-1.5 list-disc space-y-1 pl-5">
          {listBuffer.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      ) : (
        <ol key={`ol-${blocks.length}`} className="my-1.5 list-decimal space-y-1 pl-5">
          {listBuffer.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ol>
      ),
    );
    listBuffer = [];
    listKind = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      flushList();
      listKind = 'bullet';
      listBuffer.push(bullet[1]!);
      continue;
    }
    if (numbered) {
      flushList();
      listKind = 'number';
      listBuffer.push(numbered[1]!);
      continue;
    }
    flushList();
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h4 key={blocks.length} className="mt-3 mb-1 text-[13px] font-semibold">
          {inline(trimmed.slice(4))}
        </h4>,
      );
    } else if (trimmed.startsWith('## ')) {
      blocks.push(
        <h3 key={blocks.length} className="mt-3 mb-1 text-sm font-semibold">
          {inline(trimmed.slice(3))}
        </h3>,
      );
    } else if (trimmed.startsWith('# ')) {
      blocks.push(
        <h2 key={blocks.length} className="mt-3 mb-1 text-base font-semibold">
          {inline(trimmed.slice(2))}
        </h2>,
      );
    } else {
      blocks.push(
        <p key={blocks.length} className="my-1.5">
          {inline(trimmed)}
        </p>,
      );
    }
  }
  flushList();

  return <>{blocks}</>;
}

/** Inline styles: **bold**, `code`, [label](href) → Link (internal only). */
function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch && linkMatch[2]!.startsWith('/')) {
        parts.push(
          <Link
            key={key++}
            href={linkMatch[2]!}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {linkMatch[1]}
          </Link>,
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
