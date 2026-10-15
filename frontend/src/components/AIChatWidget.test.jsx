import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom';
import AIChatWidget from './AIChatWidget';
import io from 'socket.io-client';
vi.mock('socket.io-client', () => ({ default: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn() })) }));
vi.mock('./chat/ConversationList', () => ({ default: ({ rooms, onSelectRoom }) => <div>{rooms.map(room => <button key={room.id} onClick={() => onSelectRoom(room)}>{room.name}</button>)}</div> }));
vi.mock('./chat/GroupChatView', () => ({ default: ({ room, messages, onBack }) => <div><h3>{room.name}</h3><button onClick={onBack}>Back</button>{messages.map(message => <p key={message.id}>{message.content}</p>)}</div> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); localStorage.clear(); });

test('room history and live messages stay in the selected conversation', async () => {
  const history = {};
  const rooms = [{ id: 1, name: 'Room One', unread_count: 0 }, { id: 2, name: 'Room Two', unread_count: 0 }];
  localStorage.setItem('admin_token', `header.${btoa(JSON.stringify({ id: 7, type: 'admin' }))}.signature`);
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', vi.fn(url => url.endsWith('/rooms')
    ? Promise.resolve({ ok: true, json: async () => ({ success: true, rooms }) })
    : new Promise(resolve => { history[url] = resolve; })));
  render(<AIChatWidget />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Chat & AI Assistant' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Room One' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  fireEvent.click(screen.getByRole('button', { name: 'Room Two' }));
  const socket = io.mock.results[0].value;
  const onMessage = socket.on.mock.calls.find(([name]) => name === 'chat:new_message')[1];
  act(() => onMessage({ id: 22, room_id: 2, content: 'Live Room Two', created_at: '2026-10-15T01:00:00Z' }));
  expect(screen.getByText('Live Room Two')).toBeInTheDocument();
  act(() => onMessage({ id: 11, room_id: 1, content: 'Wrong live Room One' }));
  expect(screen.queryByText('Wrong live Room One')).toBeNull();
  await act(async () => { history['/api/chat/rooms/1/messages']({ ok: true, json: async () => ({ success: true, messages: [{ id: 1, room_id: 1, content: 'Stale Room One' }] }) }); });
  expect(screen.queryByText('Stale Room One')).toBeNull();
  await act(async () => { history['/api/chat/rooms/2/messages']({ ok: true, json: async () => ({ success: true, messages: [] }) }); });
  expect(screen.getByText('Live Room Two')).toBeInTheDocument();
  await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('chat:join_room', { roomId: 2 }));
});
