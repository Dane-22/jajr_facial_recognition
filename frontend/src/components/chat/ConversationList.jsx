import React, { useState } from 'react';

const ConversationList = ({ rooms, activeRoom, onSelectRoom, onOpenCreateGroup, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter(room => 
    room.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      {/* Top Header & Search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💬</span> Conversations
          </h3>
          <button 
            onClick={onOpenCreateGroup}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
          >
            <span>➕</span> New Group
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <input 
            type="text"
            placeholder="Search groups & chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '20px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748b' }}>
            🔍
          </span>
        </div>
      </div>

      {/* Rooms List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Loading conversations...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No chat rooms found.
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isActive = activeRoom?.id === room.id;
            const hasUnread = room.unread_count > 0;

            return (
              <div 
                key={room.id}
                onClick={() => onSelectRoom(room)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#1e293b' : 'transparent',
                  marginBottom: '4px',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Room Avatar */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: room.type === 'announcement' ? '#8b5cf6' : room.type === 'department' ? '#0284c7' : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  marginRight: '12px',
                  flexShrink: 0
                }}>
                  {room.avatar_url || (room.type === 'announcement' ? '📢' : '👥')}
                </div>

                {/* Room Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      fontWeight: hasUnread ? 700 : 600,
                      color: hasUnread ? '#ffffff' : '#e2e8f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {room.name}
                    </h4>
                    {room.last_message_time && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px' }}>
                        {new Date(room.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.75rem',
                      color: hasUnread ? '#38bdf8' : '#94a3b8',
                      fontWeight: hasUnread ? 600 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {room.last_message || 'No messages yet'}
                    </p>

                    {hasUnread && (
                      <span style={{
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '2px 7px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        marginLeft: '6px'
                      }}>
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
