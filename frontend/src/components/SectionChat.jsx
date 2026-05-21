import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import api from "@/lib/api";

/**
 * Per-section chat with the AI manuscript collaborator.
 * Props:
 *   manuscriptId, sectionKey, sectionLabel
 *   chat: array of { role, content, ts, applied_update }
 *   onSectionUpdated(newSectionObject): called when the AI returned an updated content payload
 */
const SectionChat = ({ manuscriptId, sectionKey, sectionLabel, chat, onSectionUpdated }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(chat || []);
  const [updatedFlash, setUpdatedFlash] = useState(false);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setHistory(chat || []);
  }, [chat]);

  useEffect(() => {
    if (open && scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [open, history, busy]);

  useEffect(() => {
    if (open && inputRef.current && !busy) {
      inputRef.current.focus();
    }
  }, [open, busy]);

  const send = async (e) => {
    e?.preventDefault?.();
    const msg = message.trim();
    if (!msg || busy) return;
    setError("");
    setBusy(true);
    // Optimistic user turn
    const nowIso = new Date().toISOString();
    const optimistic = [...history, { role: "user", content: msg, ts: nowIso }];
    setHistory(optimistic);
    setMessage("");

    try {
      const { data } = await api.post(
        `/manuscripts/${manuscriptId}/sections/${sectionKey}/chat`,
        { message: msg },
      );
      setHistory(data.section?.chat || optimistic);
      if (data.content_updated && data.section) {
        onSectionUpdated?.(data.section);
        setUpdatedFlash(true);
        setTimeout(() => setUpdatedFlash(false), 2500);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Chat failed");
      // roll back optimistic if the server rejected
      setHistory(history);
    } finally {
      setBusy(false);
    }
  };

  const turnCount = history.length;

  return (
    <div className="mt-4 border-t border-zinc-100 pt-3" data-testid={`section-chat-wrap-${sectionKey}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-[#0033A0] transition-colors"
        data-testid={`section-chat-toggle-${sectionKey}`}
      >
        <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>{open ? "Hide chat" : "Chat with AI about this section"}</span>
        {turnCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono bg-zinc-900 text-white rounded-sm">
            {Math.ceil(turnCount / 2)}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 border border-zinc-200 bg-[#fcfcfc]" data-testid={`section-chat-panel-${sectionKey}`}>
          <div className="px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5 text-[#0033A0]" />
              AI collaborator — {sectionLabel}
            </div>
            {updatedFlash && (
              <span
                className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5"
                data-testid={`section-chat-updated-flash-${sectionKey}`}
              >
                Section updated
              </span>
            )}
          </div>

          <div
            ref={scrollerRef}
            className="max-h-72 overflow-y-auto px-4 py-3 space-y-3"
            data-testid={`section-chat-history-${sectionKey}`}
          >
            {history.length === 0 ? (
              <div className="text-xs text-zinc-500 italic">
                Ask a question, request a rewrite, change tone, add citations, shorten, lengthen, focus on a specific
                aspect — the AI will reply, and apply changes when you ask for them.
              </div>
            ) : (
              history.map((turn, i) => (
                <ChatBubble key={i} turn={turn} testId={`section-chat-msg-${sectionKey}-${i}`} />
              ))
            )}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-zinc-500" data-testid={`section-chat-busy-${sectionKey}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI is thinking…</span>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 text-[11px] font-mono text-red-600 border-t border-zinc-100" data-testid={`section-chat-error-${sectionKey}`}>
              {error}
            </div>
          )}

          <form onSubmit={send} className="border-t border-zinc-200 p-3 flex items-end gap-2 bg-white">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="e.g. Shorten to 200 words and emphasize the sustainability angle."
              rows={2}
              disabled={busy}
              className="flex-1 border border-zinc-200 bg-white p-2.5 text-sm text-zinc-900 leading-snug focus:outline-none focus:border-[#0033A0] rounded-sm resize-y disabled:bg-zinc-50"
              data-testid={`section-chat-input-${sectionKey}`}
            />
            <button
              type="submit"
              disabled={busy || message.trim().length === 0}
              className="btn-brand inline-flex items-center gap-1.5 disabled:opacity-60"
              data-testid={`section-chat-send-${sectionKey}`}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            Enter to send · Shift+Enter for newline
          </div>
        </div>
      )}
    </div>
  );
};

const ChatBubble = ({ turn, testId }) => {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`} data-testid={testId}>
      <div
        className={`max-w-[88%] px-3 py-2 text-sm leading-snug border ${
          isUser
            ? "bg-[#0033A0] text-white border-[#0033A0]"
            : "bg-white text-zinc-900 border-zinc-200"
        }`}
      >
        <div className="text-[10px] font-mono uppercase tracking-widest opacity-70 mb-1 flex items-center gap-2">
          <span>{isUser ? "You" : "AI"}</span>
          {turn.applied_update && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200">
              applied update
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap break-words">{turn.content}</div>
      </div>
    </div>
  );
};

export default SectionChat;
