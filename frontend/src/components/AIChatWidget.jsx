import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { processAssistantQuery } from '../services/assistantEngine';
import ConversationList from './chat/ConversationList';
import GroupChatView from './chat/GroupChatView';
import CreateGroupModal from './chat/CreateGroupModal';

const AIChatWidget = ({ activeTab, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeWidgetTab, setActiveWidgetTab] = useState('group'); // 'group' or 'ai'
  
  // AI Assistant States
  const [inputQuery, setInputQuery] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [aiMessages, setAiMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! 👋 I'm JAJR Assistant for this system. Ask me about today's attendance, late logs, or dictate commands using the mic!",
      suggestedChips: ["📊 Today's Summary", "🚨 Late Arrivals", "👤 Register Face"],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Group Chat States
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const socketRef = useRef(null);
  const aiMessagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll AI messages
  useEffect(() => {
    if (activeWidgetTab === 'ai') {
      aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isThinking, activeWidgetTab]);

  const getAuthToken = () => {
    return localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
  };

  const getLoggedInUser = () => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          id: payload.id || 1,
          username: payload.username || payload.name || 'Admin',
          type: payload.type || 'admin',
          position: payload.position || 'Admin'
        };
      } catch (e) {
        console.warn('Failed to parse user token:', e);
      }
    }
    return { id: 1, username: 'Admin', type: 'admin', position: 'Superadmin' };
  };

  const [currentUser, setCurrentUser] = useState(getLoggedInUser);

  // Sync currentUser whenever widget opens
  useEffect(() => {
    setCurrentUser(getLoggedInUser());
  }, [isOpen]);

  // Initialize Socket.IO Client & Fetch Rooms
  useEffect(() => {
    const token = getAuthToken();
    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO Chat] Connected:', socket.id);
      if (token) {
        socket.emit('join-admin', { token });
      }
    });

    // Real-time message listener
    socket.on('chat:new_message', (newMessage) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      // Increment unread count if widget is minimized or viewing another room
      setRooms(prevRooms => prevRooms.map(r => {
        if (r.id === newMessage.room_id) {
          return {
            ...r,
            last_message: newMessage.content,
            last_message_time: newMessage.created_at,
            unread_count: (r.id === activeRoom?.id && isOpen) ? 0 : (r.unread_count || 0) + 1
          };
        }
        return r;
      }));

      if (!isOpen || activeRoom?.id !== newMessage.room_id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Typing status listener
    socket.on('chat:user_typing', ({ roomId, userName, isTyping }) => {
      if (activeRoom?.id === roomId) {
        setTypingUser(isTyping ? userName : null);
      }
    });

    // Reaction update listener
    socket.on('chat:reaction_updated', ({ messageId, userId, userType, emoji }) => {
      setChatMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions ? [...msg.reactions] : [];
          const existingIdx = reactions.findIndex(r => r.user_id === userId && r.user_type === userType);
          if (existingIdx >= 0) {
            reactions[existingIdx] = { user_id: userId, user_type: userType, emoji };
          } else {
            reactions.push({ user_id: userId, user_type: userType, emoji });
          }
          return { ...msg, reactions };
        }
        return msg;
      }));
    });

    fetchRooms();

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch Rooms from API
  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/chat/rooms', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms);
        const totalUnread = data.rooms.reduce((acc, r) => acc + (r.unread_count || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch (err) {
      console.error('Failed to fetch chat rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Select a Chat Room
  const handleSelectRoom = async (room) => {
    setActiveRoom(room);
    setTypingUser(null);

    // Join room channel on socket
    if (socketRef.current) {
      socketRef.current.emit('chat:join_room', { roomId: room.id });
    }

    // Mark room unread count as 0 locally
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread_count: 0 } : r));

    // Fetch message history
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch room messages:', err);
    }
  };

  // Send Message in Active Room
  const handleSendChatMessage = async ({ content, messageType, attachmentUrl, replyToId }) => {
    if (!activeRoom) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chat/rooms/${activeRoom.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          content,
          messageType: messageType || 'text',
          attachmentUrl: attachmentUrl || null,
          replyToId: replyToId || null
        })
      });

      const data = await res.json();
      if (data.success && data.message) {
        setChatMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('REST send message error:', err);
    }
  };

  // Reaction Trigger
  const handleAddReaction = (messageId, emoji) => {
    if (!activeRoom || !socketRef.current) return;
    socketRef.current.emit('chat:add_reaction', {
      messageId,
      roomId: activeRoom.id,
      userId: currentUser.id,
      userType: currentUser.type,
      emoji
    });
  };

  // Speech Recognition Setup (Web Speech API for AI Assistant)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceActive(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');

        setInputQuery(transcript);

        if (event.results[0]?.isFinal) {
          setIsVoiceActive(false);
          if (transcript.trim()) {
            handleSendAiMessage(transcript);
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('[SpeechRecognition] Error:', event.error);
        setIsVoiceActive(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
        }
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
      };

      recognitionRef.current = recognition;
    }
  }, [activeTab]);

  const speakText = (text) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\*\#\`\_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoiceInput = () => {
    setActiveWidgetTab('ai'); // Auto-switch tab to AI Assistant on voice dictation

    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech Recognition is not supported by your current browser. Please try Google Chrome or Microsoft Edge!');
        return;
      }
    }

    if (isVoiceActive) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Voice restart exception:', err);
      }
    }
  };

  const handleSendAiMessage = async (textToSend) => {
    const queryText = textToSend || inputQuery;
    if (!queryText.trim()) return;

    setActiveWidgetTab('ai'); // Ensure AI tab is open

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

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
        setAiMessages((prev) => [...prev, botMsg]);
        speakText(response.text);

        if (response.action?.type === 'SWITCH_TAB' && onNavigate) {
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
    fetchRooms();
  };

  return (
    <>
      {/* ─── Floating Trigger Button ────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleOpenWidget}
          data-testid="ai-chat-trigger"
          aria-label="Open Chat & AI Assistant"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border border-slate-700">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-base">
              💬
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold leading-tight text-white">Group Chat & AI</p>
            <p className="text-[10px] text-blue-400 font-medium">Messenger Active</p>
          </div>
          {unreadCount > 0 && (
            <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ─── Expanded Messenger Chat Window ────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] bg-slate-900/95 backdrop-blur-xl text-slate-100 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Top Header & Tab Toggle */}
          <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveWidgetTab('group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeWidgetTab === 'group' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>💬</span> Group Chat
              </button>
              <button
                onClick={() => setActiveWidgetTab('ai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeWidgetTab === 'ai' 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🤖</span> AI Assistant
              </button>
            </div>

            <div className="flex items-center gap-1">
              {activeWidgetTab === 'ai' && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title={isMuted ? 'Unmute voice output' : 'Mute voice output'}>
                  {isMuted ? '🔇' : '🔊'}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* TAB 1: GROUP CHAT & MESSENGER */}
          {activeWidgetTab === 'group' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeRoom ? (
                <GroupChatView 
                  room={activeRoom}
                  messages={chatMessages}
                  currentUser={currentUser}
                  typingUser={typingUser}
                  onSendMessage={handleSendChatMessage}
                  onAddReaction={handleAddReaction}
                  onBack={() => setActiveRoom(null)}
                  socket={socketRef.current}
                />
              ) : (
                <ConversationList 
                  rooms={rooms}
                  activeRoom={activeRoom}
                  onSelectRoom={handleSelectRoom}
                  onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                  loading={loadingRooms}
                />
              )}
            </div>
          )}

          {/* TAB 2: AI ASSISTANT */}
          {activeWidgetTab === 'ai' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {aiMessages.map((msg) => (
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
                            onClick={() => handleSendAiMessage(chip)}
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
                <div ref={aiMessagesEndRef} />
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

              {/* AI Footer Input */}
              <div className="p-3 bg-slate-800/90 border-t border-slate-700/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiMessage();
                  }}
                  className="flex items-center gap-2">
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

                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask or say a command..."
                    className="flex-1 bg-slate-900/90 text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={!inputQuery.trim()}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center">
                    ✈️
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal 
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newRoom) => {
          setRooms(prev => [newRoom, ...prev]);
          handleSelectRoom(newRoom);
        }}
      />
    </>
  );
};

export default AIChatWidget;
