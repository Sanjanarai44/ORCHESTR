import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Compass, Users, CalendarClock, ArrowRightCircle } from 'lucide-react';

export default function WelcomeHero({
  participant,
  notifications = [],
  onInviteResponse
}) {
  const chatRef = useRef(null);
  const textareaRef = useRef(null);

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-grow the textarea as the user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  }, [question]);

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleAsk = async (text) => {
    const userMessage = text || question;
    if (!userMessage.trim()) return;

    const updatedMessages = [
      ...messages,
      { role: 'user', content: userMessage, time: new Date() }
    ];

    setMessages(updatedMessages);
    setQuestion('');
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          participant
        })
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: data.reply, time: new Date() }
      ]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: "Something went wrong. Please try again.", time: new Date() }
      ]);
    }

    setLoading(false);
  };

  const getStageMessage = () => {
    switch (participant?.stage?.toLowerCase()) {
      case 'registered':
        return 'Welcome to the hackathon!';
      case 'team':
        return 'Form your team and get started.';
      case 'idea':
        return 'Submit your idea proposal.';
      case 'development':
        return 'Keep building!';
      case 'submission':
        return 'Submit your final project.';
      case 'completed':
        return 'Your project has been submitted successfully.';
      default:
        return 'Stay tuned for updates.';
    }
  };

  const formatSkill = (skill) => {
    if (!skill) return '';
    switch (skill.toLowerCase()) {
      case 'ml and python':
        return 'Machine Learning & Python Developer';
      case 'react and frontend':
        return 'Frontend Developer (React)';
      case 'backend and database':
        return 'Backend & Database Developer';
      default:
        return skill;
    }
  };

  const suggestions = [
    { label: 'Stage?', text: 'What stage am I in?', icon: Compass },
    { label: 'Teammates?', text: 'Who are my teammates?', icon: Users },
    { label: 'Next round?', text: 'When is the next round?', icon: CalendarClock },
    { label: 'Next step?', text: 'What should my team do next?', icon: ArrowRightCircle },
  ];

  return (
    <div className="space-y-4">

      {/* Progression Invite Card */}
      {participant?.qualified && participant?.inviteStatus === 'INVITED' && (
        <div className="bg-[#012d1d] text-white rounded-2xl p-6 flex items-center justify-between shadow-md">
          <div>
            <p className="font-bold text-lg">🎉 You've qualified for the next round!</p>
            <p className="text-sm text-[#c1ecd4] mt-1">Please confirm your participation.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onInviteResponse('CONFIRMED')}
              className="bg-white text-[#012d1d] font-semibold px-5 py-2 rounded-xl hover:bg-[#c1ecd4] transition-all"
            >
              Accept
            </button>
            <button
              onClick={() => onInviteResponse('DECLINED')}
              className="border border-white text-white px-5 py-2 rounded-xl hover:bg-white/10 transition-all"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Welcome Banner */}
        <div className="lg:col-span-2 relative overflow-hidden bg-[#1b4332] rounded-xl p-8 flex flex-col justify-center">
          {/* decorative glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#E8B64A]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10">
            <h1 className="text-5xl font-bold text-[#eafdff] leading-tight mb-3">
              Welcome back, {participant?.name || 'Participant'}!
            </h1>

            <p className="text-[#86af99]">
              <span className="text-white font-semibold">
                {formatSkill(participant?.skill)}
              </span>
              {" • "}
              {getStageMessage()}
            </p>
          </div>
        </div>

        {/* AI ASSISTANT */}
        <div className="bg-gradient-to-b from-[#eafdff] to-[#d6f3f7] rounded-2xl border border-[#bfe6d4] shadow-sm p-4 flex flex-col">

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#012d1d] to-[#1b4332] flex items-center justify-center ring-2 ring-[#E8B64A]/40 shrink-0">
              <Bot size={15} className="text-[#E8B64A]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0b2a1c] leading-tight">Event Assistant</h2>
              <p className="text-[10px] text-[#5d7d6c] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </p>
            </div>
          </div>

          {/* Suggestions */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {suggestions.map(({ label, text, icon: Icon }) => (
              <button
                key={label}
                onClick={() => handleAsk(text)}
                className="flex items-center gap-1.5 text-[11px] font-medium bg-white px-2.5 py-1.5 rounded-full border border-[#bfe6d4] text-[#1b4332] hover:border-[#E8B64A] hover:text-[#8a6312] transition-colors"
              >
                <Icon size={11} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* CHAT BOX */}
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto max-h-[200px] min-h-[140px] space-y-3 pr-1 mb-3"
          >
            {messages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-1.5 py-3">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-[#bfe6d4]">
                  <Sparkles size={15} className="text-[#E8B64A]" />
                </div>
                <p className="text-xs font-semibold text-[#0b2a1c]">Ask me anything</p>
                <p className="text-[11px] text-[#5d7d6c] max-w-[200px]">
                  Your stage, teammates, deadlines, or next steps — I've got it.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex items-end gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#012d1d] to-[#1b4332] flex items-center justify-center ring-1 ring-[#E8B64A]/40 shrink-0">
                      <Bot size={11} className="text-[#E8B64A]" />
                    </div>
                  )}

                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[78%]`}>
                    <div
                      className={`px-2.5 py-1.5 text-xs leading-snug rounded-2xl ${
                        isUser
                          ? 'bg-[#012d1d] text-white rounded-tr-sm'
                          : 'bg-white border border-[#bfe6d4] text-[#0b2a1c] rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.time && (
                      <span className="text-[9px] text-[#7c9d8c] mt-0.5 px-1">
                        {formatTime(msg.time)}
                      </span>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center shrink-0">
                      <User size={11} />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-end gap-1.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#012d1d] to-[#1b4332] flex items-center justify-center ring-1 ring-[#E8B64A]/40 shrink-0">
                  <Bot size={11} className="text-[#E8B64A]" />
                </div>
                <div className="bg-white border border-[#bfe6d4] rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-[#86af99] animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className="flex items-end gap-1.5 bg-white rounded-2xl border border-[#bfe6d4] p-1.5 focus-within:ring-2 focus-within:ring-[#E8B64A]/50 transition-shadow">
            <textarea
              ref={textareaRef}
              rows={1}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Ask something..."
              className="flex-1 resize-none outline-none text-xs bg-transparent px-2 py-1 max-h-24 text-[#0b2a1c] placeholder:text-[#94b3a3]"
            />
            <button
              onClick={() => handleAsk()}
              disabled={!question.trim() || loading}
              aria-label="Send message"
              className="w-8 h-8 rounded-full bg-[#012d1d] text-white flex items-center justify-center shrink-0 hover:bg-[#1b4332] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={13} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
