import React, { useState, useEffect } from 'react';

const AVATAR_OPTIONS = ['💬', '👥', '💼', '🚀', '💡', '🔥', '⚙️', '📢'];

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('💬');
  const [participants, setParticipants] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen]);

  const getAuthToken = () => {
    return localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/chat/participants', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (member) => {
    setSelectedMembers(prev => {
      const exists = prev.some(m => m.id === member.id && m.type === member.type);
      if (exists) {
        return prev.filter(m => !(m.id === member.id && m.type === member.type));
      } else {
        return [...prev, member];
      }
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group chat name.');
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: groupName.trim(),
          type: 'group',
          avatarUrl: selectedAvatar,
          memberIds: selectedMembers
        })
      });

      const data = await res.json();
      if (data.success) {
        onGroupCreated({
          id: data.roomId,
          name: groupName.trim(),
          type: 'group',
          avatar_url: selectedAvatar
        });
        onClose();
        setGroupName('');
        setSelectedMembers([]);
      } else {
        alert('Failed to create group: ' + data.error);
      }
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group chat.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '420px',
        padding: '20px',
        color: '#f8fafc',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Create New Group Chat</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
        </div>

        {/* Group Name Input */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Group Name</label>
          <input 
            type="text"
            placeholder="e.g., Morning Shift Team, IT Support..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Avatar Select */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Group Icon</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {AVATAR_OPTIONS.map(icon => (
              <button
                key={icon}
                onClick={() => setSelectedAvatar(icon)}
                style={{
                  fontSize: '1.2rem',
                  padding: '6px 10px',
                  backgroundColor: selectedAvatar === icon ? '#3b82f6' : '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Participants Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
            Select Members ({selectedMembers.length} selected)
          </label>
          <div style={{ maxHeight: '160px', overflowY: 'auto', backgroundColor: '#1e293b', borderRadius: '8px', padding: '6px' }}>
            {loading ? (
              <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>Loading members...</div>
            ) : participants.map((p) => {
              const isSelected = selectedMembers.some(m => m.id === p.id && m.type === p.type);
              return (
                <div 
                  key={`${p.type}-${p.id}`}
                  onClick={() => toggleMember(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    marginBottom: '2px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.displayRole}</div>
                  </div>
                  <span style={{ fontSize: '1rem' }}>{isSelected ? '✅' : '➕'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#334155',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={submitting || !groupName.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: groupName.trim() ? '#2563eb' : '#475569',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: groupName.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            {submitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
