import { afterEach, expect, test, vi } from 'vitest';
import { getAssistantSummary, processAssistantQuery } from './assistantEngine';
afterEach(() => vi.unstubAllGlobals());

test('unavailable live data never produces fabricated attendance statistics', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  expect(await getAssistantSummary()).toBeNull();
  const answer = await processAssistantQuery("Today's summary");
  expect(answer.card).toBeUndefined();
  expect(answer.text).toContain('No attendance figures can be verified');
});

test('late-arrival questions disclose that flags are unavailable without accusing employees', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  const answer = await processAssistantQuery('who is late');
  expect(answer.text).toContain('Late-arrival flags are not enabled');
  expect(answer.card).toBeUndefined();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('verified summary metrics are passed through without replacement data', async () => {
  const data = { totalEmployees: 9, checkedIn: 2, checkedOut: 1, absent: 7, attendanceRate: 22 };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data }) })));
  const answer = await processAssistantQuery("Today's summary");
  expect(answer.card.data).toEqual(data);
});
