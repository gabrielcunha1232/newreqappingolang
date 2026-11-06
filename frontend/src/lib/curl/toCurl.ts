/** Requisição já montada para envio (variáveis resolvidas, URL completa). */
export interface CurlSource {
  method: string;
  url: string;
  /** Mesmo formato do Request do Go (valores podem vir ausentes). */
  headers: Record<string, string | undefined>;
  body: string;
}

/** Aspas simples de shell POSIX: "it's" → 'it'\''s'. */
function quote(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

/**
 * Comando curl para bash/zsh/Git Bash/WSL, uma opção por linha.
 * GET é o padrão do curl e HEAD usa --head (com -X HEAD o curl espera um corpo).
 */
export function toCurl({ method, url, headers, body }: CurlSource): string {
  const upper = method.toUpperCase();
  const lines = [`curl ${quote(url)}`];

  if (upper === 'HEAD') lines.push('--head');
  else if (upper !== 'GET' || body) lines.push(`--request ${upper}`);

  for (const [name, value] of Object.entries(headers)) lines.push(`--header ${quote(`${name}: ${value ?? ''}`)}`);
  if (body) lines.push(`--data-raw ${quote(body)}`);

  return lines.join(' \\\n  ');
}
