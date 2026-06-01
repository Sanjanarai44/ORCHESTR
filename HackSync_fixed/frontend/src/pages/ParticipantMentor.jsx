import React, { useCallback, useEffect, useRef, useState } from 'react';
import ChatBubble from '../components/mentor/ChatBubble';
import TypingIndicator from '../components/mentor/TypingIndicator';
import StarterPrompts from '../components/mentor/StarterPrompts';
import SessionNotes from '../components/mentor/SessionNotes';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * ParticipantMentor Page — /participant/mentor
 *
 * Socratic AI mentor for teams during the hacking phase.
 * - Locked when not in hacking phase
 * - Starter prompt chips when no conversation yet
 * - Right panel: collapsible session notes
 * - Countdown timer to end of hacking phase
 */
export default function ParticipantMentor({ teamId = null, teamName = 'Your Team' }) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'active' | 'locked'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [problemStatement, setProblemStatement] = useState('');
  const [editingContext, setEditingContext] = useState(false);
  const [contextDraft, setContextDraft] = useState('');
  const [contextSaved, setContextSaved] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(false);
  const [currentStage, setCurrentStage] = useState('Hacking Phase');
  const [countdown, setCountdown] = useState({ h: 4, m: 0, s: 0 });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) {
      setPhase('locked');
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API}/api/mentor/session?teamId=${teamId}`);
        if (res.status === 403) {
          setPhase('locked');
          return;
        }
        if (!res.ok) throw new Error('Failed to load session');
        const data = await res.json();
        setMessages(data.messages || []);
        setProblemStatement(data.problemStatement || '');
        setPhase('active');
      } catch {
        setPhase('active'); // Graceful degradation for demo
      }
    };
    load();
  }, [teamId]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 0, m: 0, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Show typing indicator for at least 1.5s
    const minDelay = new Promise((r) => setTimeout(r, 1500));

    try {
      const [res] = await Promise.all([
        fetch(`${API}/api/mentor/message?teamId=${teamId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        }),
        minDelay,
      ]);

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply, timestamp: data.timestamp },
        ]);
      } else {
        // Fallback
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'What aspect of your problem feels most unclear right now?',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      await minDelay;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'What aspect of your problem feels most unclear right now?',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [input, isTyping, teamId]);

  // ── Save context ──────────────────────────────────────────────────────────
  const saveContext = async () => {
    try {
      await fetch(`${API}/api/mentor/context?teamId=${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemStatement: contextDraft }),
      });
      setProblemStatement(contextDraft);
      setContextSaved(true);
      setTimeout(() => setContextSaved(false), 2000);
    } catch { /* non-critical */ }
    setEditingContext(false);
  };

  // ── Locked state ──────────────────────────────────────────────────────────
  if (phase === 'locked') {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-stone-400 text-4xl">lock</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">AI Mentor — not available yet</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
              The mentor opens when the hacking phase begins. Check back then.
            </p>
          </div>
          <div className="bg-stone-100 dark:bg-stone-800 rounded-xl px-4 py-2.5 inline-block">
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Current stage: <strong className="text-stone-900 dark:text-white">{currentStage}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    );
  }

  const pad = (n) => String(n).padStart(2, '0');
  const countdownStr = `${pad(countdown.h)}h ${pad(countdown.m)}m ${pad(countdown.s)}s`;

  return (
    <div className="h-screen flex flex-col bg-stone-50 dark:bg-stone-950">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-base font-bold text-stone-900 dark:text-white">AI Mentor</h1>
        <div className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-3 py-1 rounded-full text-xs font-bold">
          {teamName}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <span className="material-symbols-outlined text-[16px]">timer</span>
          Hacking Phase — ends in {countdownStr}
        </div>
      </div>

      {/* ── Context box ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 px-6 py-3 flex-shrink-0">
        {editingContext ? (
          <div className="flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-500 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <textarea
                autoFocus
                value={contextDraft}
                onChange={(e) => setContextDraft(e.target.value)}
                rows={2}
                className="w-full text-sm text-stone-700 dark:text-stone-300 bg-transparent border-none focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveContext}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingContext(false)}
                  className="text-xs text-stone-400 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-1 self-stretch bg-blue-500 rounded-full flex-shrink-0 min-h-[20px]" />
            <p className="text-xs text-stone-600 dark:text-stone-400 flex-1 leading-relaxed">
              <strong className="text-stone-700 dark:text-stone-300">{teamName}</strong>
              {problemStatement ? ` · ${problemStatement}` : ' · No problem statement set yet'}
            </p>
            {contextSaved && (
              <span className="text-[10px] text-emerald-500 font-semibold">Saved ✓</span>
            )}
            <button
              onClick={() => { setContextDraft(problemStatement); setEditingContext(true); }}
              className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* ── Main chat area + session notes ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-stone-900 dark:bg-stone-700 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
                    AI
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    I'll only ask questions — not give direct answers.
                  </p>
                </div>
                <StarterPrompts onSelect={(prompt) => sendMessage(prompt)} />
              </div>
            )}

            {messages.map((msg, idx) => (
              <ChatBubble
                key={idx}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                onFeedback={
                  msg.role === 'assistant'
                    ? () => {
                        setFeedbackToast(true);
                        setTimeout(() => setFeedbackToast(false), 2500);
                      }
                    : null
                }
              />
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 px-4 py-3 space-y-2 flex-shrink-0">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                id="mentor-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask the mentor…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
                style={{ maxHeight: '120px' }}
              />
              <button
                id="send-mentor-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center flex-shrink-0 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center">
              The AI mentor only asks questions — it will never write code or give direct answers.
            </p>
          </div>
        </div>

        {/* Session notes panel */}
        <SessionNotes teamId={teamId || 'demo'} />
      </div>

      {/* Feedback toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg z-50 animate-[slideUp_0.2s_ease-out]">
          Feedback noted
        </div>
      )}
    </div>
  );
}
