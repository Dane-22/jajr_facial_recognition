import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom';
import GroupChatView from './GroupChatView';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('failed message submission preserves the draft so it can be retried', async () => {
  Element.prototype.scrollIntoView = vi.fn();
  const send = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<GroupChatView room={{ id: 1, name: 'Fixture room' }} messages={[]} onSendMessage={send} />);
  const input = screen.getByPlaceholderText('Type a message...');
  fireEvent.change(input, { target: { value: 'Draft to retry' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled());
  expect(input).toHaveValue('Draft to retry');
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(input).toHaveValue(''));
  expect(send).toHaveBeenCalledTimes(2);
});
