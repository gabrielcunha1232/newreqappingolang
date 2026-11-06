const SENSITIVE_HEADER = /auth|token|secret|password|cookie|api[-_]?key|session/i;
const VISIBLE_CHARS = 4;

/** Nome de cabeçalho/parâmetro que costuma carregar credencial (token, senha, chave...). */
export function isSensitiveName(name: string): boolean {
  return SENSITIVE_HEADER.test(name);
}

function maskValue(value: string): string {
  if (value.length <= VISIBLE_CHARS) return '••••';
  return `${value.slice(0, VISIBLE_CHARS)}…`;
}

/**
 * Esconde valores de cabeçalhos sensíveis para exibição (console/logs).
 * Mantém o esquema de autorização visível: "Bearer abc123xyz" → "Bearer abc1…".
 */
export function maskHeaderValue(name: string, value: string, alwaysMask = false): string {
  if (!alwaysMask && !SENSITIVE_HEADER.test(name)) return value;
  const scheme = value.match(/^(Bearer|Basic|Digest|Token)\s+(.*)$/i);
  return scheme ? `${scheme[1]} ${maskValue(scheme[2])}` : maskValue(value);
}
