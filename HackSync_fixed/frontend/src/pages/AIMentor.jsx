import React, { useState, useEffect, useRef } from 'react';
import { aiApi } from '../api';

export default function AIMentor({ eventId, teamId, teamName, participantId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [contextText, setContextText] = useState('Fetching context...');
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editContextValue, setEditContextValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState('Auto-saved');

  const messagesEndRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load init data
  useEffect(() => {
    async function loadInit() {
      try {
        const data = await aiApi.mentorInit(eventId || 1, teamId || 1, participantId || 'demo');
        
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        }
        if (data.problem_description) {
          setContextText(data.problem_description);
        } else {
          setContextText("No problem description provided yet. Click 'Edit' to add one.");
        }
        if (data.session_notes) {
          setNotes(data.session_notes);
        }
      } catch (err) {
        console.error("Failed to load mentor init data", err);
      }
    }
    loadInit();
  }, [eventId, teamId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const data = await aiApi.mentorMessage({
        event_id: eventId || 1,
        team_id: teamId || 1,
        participant_id: participantId || 'demo',
        message: text
      });
      
      setIsTyping(false);
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error occurred." }]);
    }
  };

  const handleContextSave = async () => {
    setContextText(editContextValue);
    setIsEditingContext(false);
    try {
      await aiApi.mentorContext({
        event_id: eventId || 1,
        team_id: teamId || 1,
        participant_id: participantId || 'demo',
        problem_description: editContextValue
      });
    } catch (err) {
      console.error("Failed to save context", err);
    }
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    setSaveStatus('Saving...');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await aiApi.mentorContext({
          event_id: eventId || 1,
          team_id: teamId || 1,
          participant_id: participantId || 'demo',
          session_notes: val
        });
        setSaveStatus('Saved ✓');
        setTimeout(() => setSaveStatus('Auto-saved'), 2000);
      } catch (err) {
        console.error("Failed to save notes", err);
        setSaveStatus('Error saving');
      }
    }, 1000);
  };

  const [isNotesOpen, setIsNotesOpen] = useState(true);

  return (
    <div className="h-full flex flex-col font-sans bg-transparent w-full">
      {/* Top Bar / Header for AI Mentor */}
      <div className="flex justify-between items-center w-full px-6 py-4 bg-white border-b border-[#cbe8eb] shadow-sm rounded-t-xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-[#012d1d] hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Overview
          </button>
          <div className="h-6 w-px mx-2 bg-[#cbe8eb]"></div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eafdff] border border-[#cbe8eb] text-[#012d1d]">
              <span className="material-symbols-outlined text-sm">smart_toy</span>
              <span className="text-sm font-bold">AI Mentor</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#cbe8eb] text-[#414844] text-sm">
              <span className="material-symbols-outlined text-sm opacity-70">groups</span>
              {teamName || `Team ${teamId || 1}`}
            </div>
          </div>
        </div>
        <div>
          <button 
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${isNotesOpen ? 'bg-[#012d1d] text-white border-[#012d1d]' : 'bg-white text-[#012d1d] border-[#cbe8eb] hover:bg-[#eafdff]'}`}
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            {isNotesOpen ? 'Close Notes' : 'Open Notes'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex w-full relative overflow-hidden bg-white rounded-b-xl border border-t-0 border-[#cbe8eb] shadow-sm">
        
        {/* Center Chat Container */}
        <div className={`flex flex-col h-full transition-all duration-300 flex-1 ${isNotesOpen ? 'border-r border-[#cbe8eb] md:mr-[300px]' : ''}`}>
          
          {/* Context Box */}
          <div className="m-6 border-l-4 border-[#012d1d] bg-[#eafdff] p-4 rounded-r-lg shadow-sm shrink-0">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-[#012d1d]">
                <span className="material-symbols-outlined text-[16px]">dataset</span>
                Problem Description
              </h4>
              {!isEditingContext && (
                <button onClick={() => { setIsEditingContext(true); setEditContextValue(contextText); }} className="text-xs flex items-center gap-1 text-[#012d1d] font-semibold hover:opacity-70 transition-opacity">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                </button>
              )}
            </div>
            
            {!isEditingContext ? (
              <div className="text-sm text-[#031f22]">{contextText}</div>
            ) : (
              <div className="flex flex-col gap-2">
                <textarea 
                  value={editContextValue}
                  onChange={e => setEditContextValue(e.target.value)}
                  className="w-full border border-[#cbe8eb] rounded p-2 text-sm resize-y min-h-[80px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d] bg-white text-[#031f22]"
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button onClick={() => setIsEditingContext(false)} className="px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-100 transition-colors">Cancel</button>
                  <button onClick={handleContextSave} className="px-3 py-1.5 rounded text-sm font-semibold bg-[#012d1d] text-white hover:bg-[#012d1d]/90 transition-colors">Save</button>
                </div>
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-grow overflow-y-auto px-6 pb-4 flex flex-col gap-6">
            {messages.length === 0 && !isTyping ? (
              <div className="flex flex-col items-center justify-center flex-grow opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#eafdff] text-[#012d1d]">
                  <span className="material-symbols-outlined text-3xl">smart_toy</span>
                </div>
                <h3 className="text-xl font-bold text-[#012d1d] mb-2">How can I help you today?</h3>
                <p className="text-sm mb-8 text-center max-w-md text-[#414844]">I can review your architecture, discuss algorithm complexity, or help you prioritize features based on your problem context.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 mt-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'user' ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-[#012d1d] text-white flex flex-shrink-0 items-center justify-center font-bold text-sm">U</div>
                        <div className="bg-[#012d1d] text-white p-4 rounded-2xl rounded-tr-sm shadow-sm max-w-[80%]">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center border bg-[#eafdff] border-[#cbe8eb] text-[#012d1d]">
                            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                          </div>
                        </div>
                        <div className="border border-[#cbe8eb] bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-[80%]">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#031f22]">{msg.content}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center border bg-[#eafdff] border-[#cbe8eb] text-[#012d1d]">
                      <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                    </div>
                    <div className="border border-[#cbe8eb] bg-white py-3 px-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center h-[44px] text-[#012d1d]">
                      <span className="w-1.5 h-1.5 bg-current rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#cbe8eb] bg-white shrink-0 z-10">
            <div className="flex items-end gap-2 relative">
              <div className="flex-grow relative">
                <textarea 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(inputValue);
                    }
                  }}
                  placeholder="Ask your AI mentor..."
                  className="w-full border border-[#cbe8eb] bg-[#f8faf9] rounded-xl py-3 pl-4 pr-4 text-sm resize-none h-[52px] min-h-[52px] max-h-[150px] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d] text-[#031f22]"
                />
              </div>
              <button 
                disabled={!inputValue.trim()}
                onClick={() => handleSend(inputValue)}
                className="h-[52px] w-[52px] rounded-xl flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-[#012d1d] text-white hover:bg-[#012d1d]/90 transition-colors"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel (Notes) - Collapsible */}
        <div 
          className={`flex flex-col bg-[#f8faf9] h-full absolute right-0 top-0 bottom-0 transition-transform duration-300 ease-in-out border-l border-[#cbe8eb] w-[85vw] md:w-[300px] z-20 ${isNotesOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-4 border-b border-[#cbe8eb] bg-white flex justify-between items-center shrink-0">
            <div className="text-sm font-bold flex items-center gap-2 text-[#012d1d]">
              <span className="material-symbols-outlined">edit_note</span>
              Session Notes
            </div>
            <span className={`text-xs px-2 py-1 rounded font-semibold ${saveStatus === 'Saving...' ? 'text-[#012d1d]' : 'text-[#414844] bg-[#eafdff]'}`}>
              {saveStatus}
            </span>
          </div>
          <div className="flex-grow p-4 overflow-y-auto">
            <textarea 
              value={notes}
              onChange={handleNotesChange}
              placeholder="Jot down architectural decisions, algorithms, or advice here..."
              className="w-full h-full border-none bg-transparent resize-none text-sm focus:outline-none p-0 text-[#031f22] leading-relaxed"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
