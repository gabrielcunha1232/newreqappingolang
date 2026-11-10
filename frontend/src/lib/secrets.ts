const SENSITIVE_HEADER = /auth|token|secret|password|cookie|api[-_]?key|session/i;
const VISIBLE_CHARS = 4;
const MIN_HIDDEN_LENGTH = 4;

export interface SecretEntry {
  name: string;
  value: string;
}

interface SecretRow {
  key: string;
  value: string;
  secret?: boolean;
}

export function secretEntries(rows: SecretRow[]): SecretEntry[] {
  return rows
    .filter((row) => row.secret && row.key.trim() && row.value.length >= MIN_HIDDEN_LENGTH && !row.value.includes('{{'))
    .map((row) => ({ name: row.key.trim(), value: row.value }));
}

export function hideSecrets(text: string, secrets: SecretEntry[]): string {
  const ordered = [...secrets].sort((a, b) => b.value.length - a.value.length);
  let result = text;
  for (const { name, value } of ordered) {
    const encoded = encodeURIComponent(value);
    for (const form of new Set([value, encoded, encoded.replace(/%20/g, '+')])) {
      result = result.split(form).join(`{{${name}}}`);
    }
  }
  return result;
}

export function shareableVariables(variables: Record<string, string>, rows: SecretRow[]): Record<string, string> {
  const hidden = rows.filter((row) => row.secret && row.key.trim()).map((row) => row.key.trim());
  return { ...variables, ...Object.fromEntries(hidden.filter((name) => name in variables).map((name) => [name, `{{${name}}}`])) };
}

export function isSensitiveName(name: string): boolean {
  return SENSITIVE_HEADER.test(name);
}

function maskValue(value: string): string {
  if (value.length <= VISIBLE_CHARS) return '••••';
  return `${value.slice(0, VISIBLE_CHARS)}…`;
}

export function maskHeaderValue(name: string, value: string, alwaysMask = false): string {
  if (!alwaysMask && !SENSITIVE_HEADER.test(name)) return value;
  const scheme = value.match(/^(Bearer|Basic|Digest|Token)\s+(.*)$/i);
  return scheme ? `${scheme[1]} ${maskValue(scheme[2])}` : maskValue(value);
}
