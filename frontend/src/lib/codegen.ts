import type { CurlSource } from './curl/toCurl';

export type CodeTarget = 'fetch' | 'python' | 'go';

export const CODE_TARGETS: Array<{ id: CodeTarget; label: string }> = [
  { id: 'fetch', label: 'JavaScript (fetch)' },
  { id: 'python', label: 'Python (requests)' },
  { id: 'go', label: 'Go (net/http)' },
];

const str = (text: string) => JSON.stringify(text);

function entries(source: CurlSource): Array<[string, string]> {
  return Object.entries(source.headers).map(([name, value]) => [name, value ?? '']);
}

function toFetch(source: CurlSource): string {
  const options = [`  method: ${str(source.method.toUpperCase())},`];
  const headers = entries(source);
  if (headers.length > 0) {
    options.push('  headers: {', ...headers.map(([k, v]) => `    ${str(k)}: ${str(v)},`), '  },');
  }
  if (source.body) options.push(`  body: ${str(source.body)},`);
  return [
    `const response = await fetch(${str(source.url)}, {`,
    ...options,
    '});',
    '',
    'console.log(response.status, await response.text());',
  ].join('\n');
}

function toPython(source: CurlSource): string {
  const lines = ['import requests', '', `url = ${str(source.url)}`];
  const args = [str(source.method.toUpperCase()), 'url'];
  const headers = entries(source);
  if (headers.length > 0) {
    lines.push('headers = {', ...headers.map(([k, v]) => `    ${str(k)}: ${str(v)},`), '}');
    args.push('headers=headers');
  }
  if (source.body) {
    lines.push(`body = ${str(source.body)}`);
    args.push('data=body.encode("utf-8")');
  }
  lines.push('', `response = requests.request(${args.join(', ')})`, 'print(response.status_code, response.text)');
  return lines.join('\n');
}

function toGo(source: CurlSource): string {
  const hasBody = Boolean(source.body);
  const imports = ['fmt', 'io', 'log', 'net/http', ...(hasBody ? ['strings'] : [])];
  const reader = hasBody ? `strings.NewReader(${str(source.body)})` : 'nil';
  return [
    'package main',
    '',
    'import (',
    ...imports.map((name) => `\t${str(name)}`),
    ')',
    '',
    'func main() {',
    `\treq, err := http.NewRequest(${str(source.method.toUpperCase())}, ${str(source.url)}, ${reader})`,
    '\tif err != nil {',
    '\t\tlog.Fatal(err)',
    '\t}',
    ...entries(source).map(([k, v]) => `\treq.Header.Set(${str(k)}, ${str(v)})`),
    '',
    '\tresp, err := http.DefaultClient.Do(req)',
    '\tif err != nil {',
    '\t\tlog.Fatal(err)',
    '\t}',
    '\tdefer resp.Body.Close()',
    '',
    '\tbody, err := io.ReadAll(resp.Body)',
    '\tif err != nil {',
    '\t\tlog.Fatal(err)',
    '\t}',
    '\tfmt.Println(resp.StatusCode, string(body))',
    '}',
  ].join('\n');
}

export function generateCode(target: CodeTarget, source: CurlSource): string {
  switch (target) {
    case 'python':
      return toPython(source);
    case 'go':
      return toGo(source);
    default:
      return toFetch(source);
  }
}
