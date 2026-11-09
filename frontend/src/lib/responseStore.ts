import type { HistoryEntry, RequestRuntime, StoredResponse } from '../types';

export const MAX_STORED_RESPONSE = 128 * 1024;
export const MAX_STORED_TOTAL = 4 * 1024 * 1024;
export const MAX_HISTORY_BODY = 64 * 1024;
export const MAX_HISTORY_TOTAL = 2 * 1024 * 1024;

export function storedResponses(runtime: Record<string, RequestRuntime>, maxTotal = MAX_STORED_TOTAL): Record<string, StoredResponse> {
  const candidates = Object.entries(runtime)
    .flatMap(([id, item]) =>
      item.response && item.receivedAt && item.response.body.length <= MAX_STORED_RESPONSE
        ? [{ id, stored: { ...item.response, savedAt: item.receivedAt } as StoredResponse }]
        : []
    )
    .sort((a, b) => b.stored.savedAt.localeCompare(a.stored.savedAt));

  const result: Record<string, StoredResponse> = {};
  let total = 0;
  for (const { id, stored } of candidates) {
    if (total + stored.body.length > maxTotal) continue;
    total += stored.body.length;
    result[id] = stored;
  }
  return result;
}

export function capHistoryBodies(entries: HistoryEntry[], maxTotal = MAX_HISTORY_TOTAL): HistoryEntry[] {
  let total = 0;
  return entries.map((entry) => {
    if (entry.body === undefined) return entry;
    total += entry.body.length;
    if (total <= maxTotal) return entry;
    const { body: _body, ...rest } = entry;
    return rest;
  });
}
