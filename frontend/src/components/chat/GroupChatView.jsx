import React, { useState, useEffect, useRef } from 'react';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

const GroupChatView = ({ 
  room, 
  messages, 
  currentUser, 
  typingUser, 
  onSendMessage, 
  onAddReaction, 
  onBack, 
  socket 
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // Emit typing indicator signals
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (socket && room) {
      socket.emit('chat:typing', { roomId: room.id, userName: currentUser?.username || 'Admin' });
      
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socket.emit('chat:stop_typing', { roomId: room.id, userName: currentUser?.username || 'Admin' });
      }, 2000);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage({
      content: inputText,
      messageType: 'text',
      replyToId: replyingTo?.id || null
    });
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    if (socket && room) {
      socket.emit('chat:stop_typing', { roomId: room.id, userName: currentUser?.username || 'Admin' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle Image / File attachment upload
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds maximum limit of 5MB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
        const res = await fetch('/api/chat/attachment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            fileName: file.name,
            base64Data: reader.result
          })
        });

        const data = await res.json();
        if (data.success) {
          onSendMessage({
            content: `Sent an attachment: ${file.name}`,
            messageType: file.type.startsWith('image/') ? 'image' : 'file',
            attachmentUrl: data.attachmentUrl
          });
        } else {
          alert('Upload failed: ' + data.error);
        }
      } catch (err) {
        console.error('Attachment upload error:', err);
        alert('Failed to upload file attachment');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button 
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ⬅️
            </button>
          )}
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem'
          }}>
            {room.avatar_url || '👥'}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>{room.name}</h4>
            <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Active Room • Messenger Live
            </span>
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto', fontSize: '0.85rem' }}>
            <span>💬</span> No messages in this group yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = (msg.sender_id === currentUser?.id && msg.sender_type === currentUser?.type) ||
                         (msg.sender_name && currentUser?.username && msg.sender_name.trim().toLowerCase() === currentUser.username.trim().toLowerCase());

            return (
              <div 
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  position: 'relative'
                }}
              >
                {/* Sender Info (for other users) */}
                {!isMe && (
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '3px', marginLeft: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#38bdf8' }}>{msg.sender_name || 'Admin'}</span>
                    {msg.sender_role && <span style={{ marginLeft: '4px', opacity: 0.8 }}>({msg.sender_role})</span>}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', maxWidth: '80%' }}>
                  {!isMe && (
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {(msg.sender_name || 'A')[0].toUpperCase()}
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div style={{
                    backgroundColor: isMe ? '#2563eb' : '#1e293b',
                    color: '#ffffff',
                    padding: '10px 14px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                    position: 'relative'
                  }}>
                    {/* Quoted Reply Preview */}
                    {msg.reply_to_id && (
                      <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderLeft: '3px solid #38bdf8',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        marginBottom: '6px',
                        color: '#cbd5e1'
                      }}>
                        Replying to message #{msg.reply_to_id}
                      </div>
                    )}

                    {/* Content */}
                    <div>{msg.content}</div>

                    {/* Image Attachment */}
                    {msg.message_type === 'image' && msg.attachment_url && (
                      <img 
                        src={msg.attachment_url} 
                        alt="attachment" 
                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginTop: '8px', cursor: 'pointer' }} 
                        onClick={() => window.open(msg.attachment_url, '_blank')}
                      />
                    )}

                    {/* File Attachment */}
                    {msg.message_type === 'file' && msg.attachment_url && (
                      <a 
                        href={msg.attachment_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ color: '#38bdf8', textDecoration: 'underline', fontSize: '0.8rem', display: 'block', marginTop: '6px' }}
                      >
                        📁 Download File
                      </a>
                    )}

                    {/* Reactions Bar */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-12px',
                        right: isMe ? 'auto' : '8px',
                        left: isMe ? '8px' : 'auto',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '1px 6px',
                        fontSize: '0.7rem',
                        display: 'flex',
                        gap: '3px'
                      }}>
                        {msg.reactions.map((r, i) => (
                          <span key={i}>{r.emoji}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction Button Trigger */}
                  <button 
                    onClick={() => onAddReaction(msg.id, '👍')}
                    title="React 👍"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      opacity: 0.6,
                      padding: '2px',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                  >
                    👍
                  </button>
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px', marginLeft: isMe ? '0' : '36px' }}>
                  {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingUser && (
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✍️</span> {typingUser} is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div style={{
          backgroundColor: '#1e293b',
          padding: '6px 12px',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem'
        }}>
          <span style={{ color: '#94a3b8' }}>Replying to: <i>{replyingTo.content.substring(0, 30)}...</i></span>
          <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✖</button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div style={{
          backgroundColor: '#1e293b',
          padding: '8px',
          borderTop: '1px solid #334155',
          display: 'flex',
          gap: '8px',
          justifyContent: 'center'
        }}>
          {EMOJI_LIST.map(emoji => (
            <span 
              key={emoji} 
              onClick={() => {
                setInputText(prev => prev + emoji);
                setShowEmojiPicker(false);
              }}
              style={{ fontSize: '1.2rem', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div style={{
        padding: '10px 12px',
        backgroundColor: '#0f172a',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileSelect} 
          accept="image/*,.pdf,.doc,.docx"
        />

        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Attach Image/File"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          {isUploading ? '⏳' : '📎'}
        </button>

        <button 
          onClick={() => setShowEmojiPicker(prev => !prev)}
          title="Emoji Picker"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          😃
        </button>

        <input 
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '20px',
            color: '#f8fafc',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />

        <button 
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            backgroundColor: inputText.trim() ? '#2563eb' : '#334155',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: inputText.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            boxShadow: inputText.trim() ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none'
          }}
        >
          ✈️
        </button>
      </div>
    </div>
  );
};

export default GroupChatView;
