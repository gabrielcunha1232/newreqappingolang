export interface DiffLine {
  kind: 'same' | 'added' | 'removed';
  text: string;
}

/** Acima disto a tabela da LCS ocuparia memória demais para rodar na interface. */
const MAX_CELLS = 4_000_000;

/**
 * Diferença linha a linha (LCS). Retorna null se os textos forem grandes demais
 * mesmo depois de descartar o início e o fim em comum.
 */
export function diffLines(before: string, after: string): DiffLine[] | null {
  const a = before.split('\n');
  const b = after.split('\n');

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const n = endA - start;
  const m = endB - start;
  if ((n + 1) * (m + 1) > MAX_CELLS) return null;

  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        a[start + i] === b[start + j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }

  const lines: DiffLine[] = a.slice(0, start).map((text) => ({ kind: 'same', text }));
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[start + i] === b[start + j]) {
      lines.push({ kind: 'same', text: a[start + i] });
      i++;
      j++;
    } else if (j < m && (i === n || table[i * width + j + 1] > table[(i + 1) * width + j])) {
      lines.push({ kind: 'added', text: b[start + j] });
      j++;
    } else {
      lines.push({ kind: 'removed', text: a[start + i] });
      i++;
    }
  }
  for (const text of a.slice(endA)) lines.push({ kind: 'same', text });
  return lines;
}
