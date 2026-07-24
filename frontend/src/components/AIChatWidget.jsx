import React, { useState, useEffect, useRef } from 'react';
import { processAssistantQuery } from '../services/assistantEngine';

const AIChatWidget = ({ activeTab, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! 👋 I'm your local AI Assistant. Ask me about today's attendance, late logs, or dictate commands using the mic!",
      suggestedChips: ["📊 Today's Summary", "🚨 Late Arrivals", "👤 Register Face"],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Speech Recognition Setup (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceActive(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        handleSendMessage(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('[SpeechRecognition] Error:', event.error);
        setIsVoiceActive(false);
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text-to-Speech Output Function
  const speakText = (text) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop ongoing speech
    const cleanText = text.replace(/[\*\#\`\_]/g, ''); // Strip markdown syntax
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Handle Voice Dictation Toggle
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your current browser. Please try Chrome or Edge!');
      return;
    }

    if (isVoiceActive) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Voice restart exception:', err);
      }
    }
  };

  // Handle Query Submission
  const handleSendMessage = async (textToSend) => {
    const queryText = textToSend || inputQuery;
    if (!queryText.trim()) return;

    // 1. Add User Message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    // 2. Process query via local assistantEngine
    try {
      const response = await processAssistantQuery(queryText, activeTab);

      setTimeout(() => {
        setIsThinking(false);

        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.text,
          card: response.card,
          suggestedChips: response.suggestedChips,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botMsg]);

        // Speak answer if unmuted
        speakText(response.text);

        // Execute tab switch action if requested
        if (response.action && response.action.type === 'SWITCH_TAB' && onNavigate) {
          onNavigate(response.action.payload);
        }
      }, 300);
    } catch (err) {
      console.error('[AIChatWidget] Processing error:', err);
      setIsThinking(false);
    }
  };

  const handleOpenWidget = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      {/* ─── Floating Trigger Button (Minimized State) ─────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleOpenWidget}
          data-testid="ai-chat-trigger"
          aria-label="Open AI Assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border border-slate-700">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-base">
              🤖
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold leading-tight text-white">AI Assistant</p>
            <p className="text-[10px] text-emerald-400 font-medium">100% Free • Local</p>
          </div>
          {unreadCount > 0 && (
            <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ─── Expanded Chat Widget Modal ────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[520px] bg-slate-900/95 backdrop-blur-xl text-slate-100 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Attendance Assistant
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-slate-400">Zero-API Engine • Voice Enabled</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Mute/Unmute Voice Toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title={isMuted ? 'Unmute voice output' : 'Mute voice output'}>
                {isMuted ? '🔇' : '🔊'}
              </button>
              {/* Minimize/Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm'
                  }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Render Stat Card if provided */}
                  {msg.card?.type === 'STAT_SUMMARY' && (
                    <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs space-y-2">
                      <div className="flex justify-between items-center text-slate-300 font-medium">
                        <span>Attendance Rate</span>
                        <span className="text-emerald-400 font-bold">{msg.card.data.attendanceRate}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${msg.card.data.attendanceRate}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-center pt-1">
                        <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                          <p className="text-slate-400">Present</p>
                          <p className="font-bold text-emerald-400 text-xs">{msg.card.data.checkedIn}</p>
                        </div>
                        <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                          <p className="text-slate-400">Late</p>
                          <p className="font-bold text-amber-400 text-xs">{msg.card.data.lateCount}</p>
                        </div>
                        <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                          <p className="text-slate-400">Absent</p>
                          <p className="font-bold text-rose-400 text-xs">{msg.card.data.absent}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Employee List Card if provided */}
                  {msg.card?.type === 'EMPLOYEE_LIST' && (
                    <div className="mt-2.5 p-2.5 bg-slate-900/80 rounded-xl border border-slate-700 space-y-1.5">
                      <p className="text-[11px] font-semibold text-amber-400 mb-1">{msg.card.title}</p>
                      {msg.card.employees.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 rounded-lg text-[10px]">
                          <span className="font-medium text-slate-200">{emp.name}</span>
                          <span className="text-slate-400">{emp.subtext}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>

                {/* Suggested Action Chips */}
                {msg.suggestedChips && msg.suggestedChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.suggestedChips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(chip)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-full text-[10px] font-medium transition-colors">
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Thinking / Processing Indicator */}
            {isThinking && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px]">Assistant is processing locally...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Listening Banner */}
          {isVoiceActive && (
            <div className="px-3 py-1.5 bg-rose-500/20 border-y border-rose-500/30 text-rose-300 text-[11px] flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                🎙️ Listening to voice input... Speak now!
              </span>
              <button
                onClick={toggleVoiceInput}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-200">
                Cancel
              </button>
            </div>
          )}

          {/* Input & Voice Controls Footer */}
          <div className="p-3 bg-slate-800/90 border-t border-slate-700/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2">
              {/* Microphone Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl border transition-all ${
                  isVoiceActive
                    ? 'bg-rose-500 text-white border-rose-400 animate-bounce'
                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-emerald-400 border-slate-600'
                }`}
                title="Dictate query with microphone">
                🎙️
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask or say a command..."
                className="flex-1 bg-slate-900/90 text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
