export type DataRow = Record<string, string>;

export interface RunnerData {
  fileName: string;
  columns: string[];
  rows: DataRow[];
}

const DELIMITERS = [',', ';', '\t'];

function detectDelimiter(text: string): string {
  const counts = new Map(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === '\n' || char === '\r')) break;
    else if (!quoted && counts.has(char)) counts.set(char, counts.get(char)! + 1);
  }
  return DELIMITERS.reduce((best, d) => (counts.get(d)! > counts.get(best)! ? d : best), ',');
}

interface CsvRecord {
  line: number;
  cells: string[];
}

function readCsvRecords(text: string, delimiter: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let start = 1;

  const endRecord = () => {
    cells.push(cell);
    if (cells.length > 1 || cells[0].trim()) records.push({ line: start, cells });
    cells = [];
    cell = '';
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === '\n') line++;
        cell += char;
      }
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRecord();
      line++;
      start = line;
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error(`Aspas sem fechamento a partir da linha ${start}.`);
  if (cell !== '' || cells.length > 0) endRecord();
  return records;
}

function parseCsv(text: string): Omit<RunnerData, 'fileName'> {
  const [header, ...records] = readCsvRecords(text, detectDelimiter(text));
  if (!header) throw new Error('O arquivo está vazio.');

  const columns = header.cells.map((name) => name.trim());
  if (columns.some((name) => !name)) throw new Error('O cabeçalho do CSV tem uma coluna sem nome.');
  const repeated = columns.find((name, index) => columns.indexOf(name) !== index);
  if (repeated) throw new Error(`A coluna "${repeated}" aparece mais de uma vez.`);

  const rows = records.map(({ line, cells }) => {
    if (cells.length > columns.length) {
      throw new Error(`A linha ${line} tem ${cells.length} valores, mas o cabeçalho tem ${columns.length} colunas.`);
    }
    return Object.fromEntries(columns.map((name, index) => [name, cells[index] ?? '']));
  });
  return { columns, rows };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function parseJson(text: string): Omit<RunnerData, 'fileName'> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!Array.isArray(data)) throw new Error('O JSON precisa ser uma lista de objetos.');

  const columns = new Set<string>();
  const rows = data.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`O item ${index + 1} do JSON não é um objeto.`);
    }
    const entries = Object.entries(item as Record<string, unknown>);
    entries.forEach(([key]) => columns.add(key));
    return Object.fromEntries(entries.map(([key, value]) => [key, cellText(value)]));
  });
  return { columns: [...columns], rows };
}

export function parseRunnerData(content: string, fileName: string): RunnerData {
  const text = content.replace(/^﻿/, '');
  const isJson = /\.json$/i.test(fileName) || /^\s*\[/.test(text);
  const parsed = isJson ? parseJson(text) : parseCsv(text);
  if (parsed.rows.length === 0) throw new Error('O arquivo não tem linhas de dados.');
  return { fileName, ...parsed };
}
