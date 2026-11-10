export interface CurlSource {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  body: string;
}

function quote(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

export function toCurl({ method, url, headers, body }: CurlSource): string {
  const upper = method.toUpperCase();
  const lines = [`curl ${quote(url)}`];

  if (upper === 'HEAD') lines.push('--head');
  else if (upper !== 'GET' || body) lines.push(`--request ${upper}`);

  for (const [name, value] of Object.entries(headers)) lines.push(`--header ${quote(`${name}: ${value ?? ''}`)}`);
  if (body) lines.push(`--data-raw ${quote(body)}`);

  return lines.join(' \\\n  ');
}
