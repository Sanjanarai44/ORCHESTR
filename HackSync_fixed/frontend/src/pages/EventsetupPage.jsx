import React, { useState, useRef, useEffect } from "react";
import { aiApi } from "../api";
 
// ── Typing animation for assistant messages ─────────────────────────────────
function TypingMessage({ text, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        setDone(true);
        onDone?.();
      }
    }, 12);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{displayed}{!done && <span className="inline-block w-0.5 h-3.5 bg-[#012d1d] ml-0.5 animate-pulse" />}</span>;
}
 
// ── Config preview pill ──────────────────────────────────────────────────────
function ConfigPill({ label, value, color = "bg-[#e8f5ef] text-[#012d1d] border-[#a5d0b9]" }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f0f0f0] last:border-0">
      <span className="text-xs text-[#6b7280] font-medium">{label}</span>
      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${color}`}>{value}</span>
    </div>
  );
}
 
const SUGGESTIONS = [
  "A 48-hour hackathon with teams of 3, 5 judges, scored on innovation, technical execution and presentation. Top 5 teams advance to finals.",
  "A 2-day case competition with teams of 4, judged on business impact and feasibility. Single elimination bracket.",
  "A coding contest with solo participants, 3 rounds of progressive difficulty, top 10 advance.",
];
 
export default function EventSetupPage({ onComplete }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome! I'm your Event Setup Assistant. Tell me about your event and I'll configure the entire platform for you — team sizes, stages, scoring criteria, communication flows, everything.\n\nFor example: \"A 48-hour hackathon with teams of 3, 5 judges, scored on innovation and execution, top 5 teams advance to finals.\"",
      typed: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState(null);
  const [typingDone, setTypingDone] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
 
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
 
  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading || !typingDone) return;
    setInput("");
 
    const newHistory = [...history, { role: "user", content: userText }];
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setHistory(newHistory);
    setLoading(true);
    setTypingDone(false);
 
    try {
      const res = await aiApi.configureEvent({ description: userText, history });
      const parsed = res.config;
 
      if (res.status === "needs_clarification") {
        const reply = parsed.clarification_needed;
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
      } else if (res.status === "complete") {
        setConfig(parsed);
        const reply = `Perfect! I've configured your **${parsed.event_name || "event"}** (${parsed.event_type}). Review the details on the right and click **Launch Event** when ready.`;
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Couldn't reach the AI. Check your connection and try again." }]);
      setTypingDone(true);
    }
    setLoading(false);
  };
 
  const reset = () => {
    setMessages([{
      role: "assistant",
      text: "Welcome! I'm your Event Setup Assistant. Tell me about your event and I'll configure the entire platform for you.",
      typed: true,
    }]);
    setHistory([]);
    setConfig(null);
    setInput("");
    setTypingDone(true);
  };
 
  const handleConfirm = () => {
    if (!config) return;
    setConfirming(true);
    setTimeout(() => onComplete(config));
  };
 
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ backgroundColor: "#F5F3F0" }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(#012d1d 1px, transparent 1px), linear-gradient(90deg, #012d1d 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Ambient blurs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#a5d0b9]/15 rounded-full blur-3xl -z-0" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#012d1d]/8 rounded-full blur-3xl -z-0" />
 
      {confirming && (
        <div className="fixed inset-0 z-50 bg-[#012d1d] flex flex-col items-center justify-center gap-6 transition-all">
          <div className="w-16 h-16 rounded-full border-4 border-[#a5d0b9] border-t-transparent animate-spin" />
          <p className="text-[#a5d0b9] text-lg font-semibold tracking-wide">Configuring your event platform…</p>
        </div>
      )}
 
      <div className="relative z-10 w-full max-w-6xl">
 
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#012d1d] text-[#a5d0b9] text-xs font-bold tracking-widest uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a5d0b9] animate-pulse" />
            AI Event Configuration
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#012d1d] tracking-tight mb-2">
            Describe Your Event
          </h1>
          <p className="text-[#5a6672] text-sm md:text-base max-w-lg mx-auto">
            Tell me what you're running and I'll configure the entire platform — stages, scoring, teams, communications, everything.
          </p>
        </div>
 
        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-[#E2DDD8] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]">
 
            {/* ── LEFT: Chat panel ── */}
            <div className="flex flex-col border-r border-[#F0EDE9]">
 
              {/* Chat header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE9]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#012d1d] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#a5d0b9] text-[18px]">auto_awesome</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#012d1d]">Event Setup Assistant</p>
                    <p className="text-[10px] text-[#9aa5ae]">Powered by GPT-4o mini</p>
                  </div>
                </div>
                <button onClick={reset} className="text-xs text-[#9aa5ae] hover:text-[#012d1d] border border-[#E2DDD8] rounded-lg px-3 py-1.5 transition-colors">
                  Reset
                </button>
              </div>
 
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-[380px] max-h-[480px]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-[#012d1d] flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                        <span className="material-symbols-outlined text-[#a5d0b9] text-[13px]">smart_toy</span>
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-[#012d1d] text-white rounded-br-sm"
                        : "bg-[#F5F3F0] text-[#1a2e22] rounded-bl-sm border border-[#E8E4DF]"
                    }`}>
                      {msg.role === "assistant" && !msg.typed ? (
                        <TypingMessage text={msg.text} onDone={() => setTypingDone(true)} />
                      ) : (
                        msg.text.replace(/\*\*(.*?)\*\*/g, "$1")
                      )}
                    </div>
                  </div>
                ))}
 
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-[#012d1d] flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="material-symbols-outlined text-[#a5d0b9] text-[13px]">smart_toy</span>
                    </div>
                    <div className="bg-[#F5F3F0] border border-[#E8E4DF] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                      {[0, 1, 2].map((j) => (
                        <span key={j} className="w-1.5 h-1.5 rounded-full bg-[#012d1d]/40"
                          style={{ animation: `bounce 1s ease-in-out ${j * 0.18}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
 
              {/* Suggestions */}
              {messages.length <= 1 && (
                <div className="px-6 pb-3">
                  <p className="text-[10px] font-bold text-[#9aa5ae] uppercase tracking-widest mb-2">Quick start templates</p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => send(s)}
                        className="text-left text-xs text-[#3d5a47] bg-[#F0EDE9] hover:bg-[#e8f5ef] rounded-xl px-4 py-2.5 border border-[#E2DDD8] hover:border-[#a5d0b9] transition-all leading-relaxed">
                        "{s}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
 
              {/* Input */}
              <div className="px-6 py-4 border-t border-[#F0EDE9] flex gap-3 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Describe your event… (Enter to send)"
                  rows={2}
                  className="flex-1 resize-none border border-[#E2DDD8] rounded-xl px-4 py-3 text-sm text-[#012d1d] bg-[#FAFAF9] focus:outline-none focus:border-[#012d1d] placeholder-[#b0bec5] transition-colors"
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim() || !typingDone}
                  className="bg-[#012d1d] text-white rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40 hover:bg-[#023d29] transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
 
            {/* ── RIGHT: Config preview ── */}
            <div className="flex flex-col bg-[#FAFAF9]">
              <div className="px-6 py-4 border-b border-[#F0EDE9] flex items-center justify-between">
                <p className="text-sm font-bold text-[#012d1d]">Event Configuration</p>
                {config && (
                  <span className="text-[10px] bg-[#e8f5ef] text-[#012d1d] border border-[#a5d0b9] rounded-full px-2.5 py-0.5 font-bold uppercase">Ready</span>
                )}
              </div>
 
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {!config ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
                    <div className="w-16 h-16 rounded-2xl bg-[#F0EDE9] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#012d1d]/30 text-3xl">settings_suggest</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#012d1d]/50 mb-1">Awaiting your description</p>
                      <p className="text-xs text-[#9aa5ae] max-w-[220px] leading-relaxed">Your extracted event configuration will appear here once the AI processes your input.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <ConfigPill label="Event Name" value={config.event_name} />
                    <ConfigPill label="Event Type" value={config.event_type} />
                    <ConfigPill label="Team Size" value={config.team_size ? `${config.team_size} members` : null} />
                    <ConfigPill label="Judges" value={config.num_judges} />
                    <ConfigPill label="Advancement" value={config.advancement_rule} />
 
                    {config.stages?.length > 0 && (
                      <div className="py-3 border-b border-[#f0f0f0]">
                        <p className="text-xs text-[#6b7280] font-medium mb-2">Stages</p>
                        <div className="flex flex-col gap-1.5">
                          {config.stages.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-[#012d1d] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                              <span className="text-xs text-[#012d1d] font-medium">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {config.scoring_criteria?.length > 0 && (
                      <div className="py-3 border-b border-[#f0f0f0]">
                        <p className="text-xs text-[#6b7280] font-medium mb-2">Scoring Criteria</p>
                        <div className="flex flex-wrap gap-1.5">
                          {config.scoring_criteria.map((s, i) => (
                            <span key={i} className="text-[11px] bg-[#e8f5ef] border border-[#a5d0b9] text-[#012d1d] rounded-full px-2.5 py-0.5 font-medium">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {config.communication_touchpoints?.length > 0 && (
                      <div className="py-3">
                        <p className="text-xs text-[#6b7280] font-medium mb-2">Communication Touchpoints</p>
                        <div className="flex flex-col gap-1.5">
                          {config.communication_touchpoints.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#012d1d]/40 text-[14px]">email</span>
                              <span className="text-xs text-[#3d5a47]">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
 
              {/* Launch button */}
              <div className="px-6 py-5 border-t border-[#F0EDE9]">
                {config ? (
                  <button
                    onClick={handleConfirm}
                    className="w-full py-4 bg-[#012d1d] text-white font-bold rounded-2xl text-sm hover:bg-[#023d29] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    Launch Event Platform
                  </button>
                ) : (
                  <div className="w-full py-4 bg-[#F0EDE9] text-[#9aa5ae] font-bold rounded-2xl text-sm flex items-center justify-center gap-2 cursor-not-allowed select-none">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    Awaiting Configuration
                  </div>
                )}
                <p className="text-[10px] text-[#9aa5ae] text-center mt-3">
                  You can edit configuration after launch from the dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
