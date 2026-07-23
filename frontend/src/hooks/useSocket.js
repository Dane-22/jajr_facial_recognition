import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

/**
 * useSocket — connects to the Socket.IO server and joins the admin room.
 *
 * @param {string} event   - The event name to listen for (e.g. 'attendance:new')
 * @param {function} onEvent - Callback invoked with the event payload
 * @param {boolean} enabled  - Set to false to skip connecting (e.g. when not logged in)
 */
const useSocket = (event, onEvent, enabled = true) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('admin_token');

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket.id);
      socket.emit('join-admin', { token });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });

    if (event && onEvent) {
      socket.on(event, onEvent);
    }

    return () => {
      socket.disconnect();
      console.log('[Socket.IO] Disconnected');
    };
  }, [event, enabled]); // onEvent intentionally omitted — callers should useCallback

  return socketRef;
};

export default useSocket;
