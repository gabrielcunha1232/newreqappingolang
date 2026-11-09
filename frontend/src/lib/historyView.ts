import type { HistoryEntry } from '../types';

export interface HistoryFilter {
  term: string;
  method: string;
  status: string;
}

export interface HistoryGroup {
  label: string;
  entries: HistoryEntry[];
}

export function statusGroup(status: number): string {
  return `${Math.floor(status / 100)}xx`;
}

export function filterHistory(entries: HistoryEntry[], { term, method, status }: HistoryFilter): HistoryEntry[] {
  const needle = term.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      (!needle || entry.url.toLowerCase().includes(needle)) &&
      (!method || entry.method.toUpperCase() === method) &&
      (!status || statusGroup(entry.status) === status)
  );
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date, now: Date): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(date) === dayKey(now)) return 'Hoje';
  if (dayKey(date) === dayKey(yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
}

export function groupHistoryByDay(entries: HistoryEntry[], now = new Date()): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>();
  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const key = dayKey(date);
    const group = groups.get(key) ?? { label: dayLabel(date, now), entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()];
}
