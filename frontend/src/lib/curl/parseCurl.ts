import type { KeyValue, RequestAuth, SavedRequest } from '../../types';
import { defaultAuth, newKeyValue } from '../factories';
import { tryParseJson } from '../json';
import { splitBaseAndPath } from '../pathTemplate';
import { tokenizeShell } from './tokenize';

export interface CurlImport {
  request: Pick<SavedRequest, 'title' | 'method' | 'url' | 'headers' | 'auth' | 'bodyType' | 'body'>;
  warnings: string[];
}

export function looksLikeCurl(text: string): boolean {
  return /^\s*curl(\.exe)?\s/i.test(text);
}

const WITH_VALUE = new Set([
  '-X', '--request', '-H', '--header', '-d', '--data', '--data-raw', '--data-binary', '--data-ascii',
  '--data-urlencode', '--json', '-u', '--user', '-b', '--cookie', '-A', '--user-agent', '-e', '--referer',
  '-F', '--form', '--form-string', '--url', '-o', '--output', '-m', '--max-time', '--connect-timeout',
  '-x', '--proxy', '--cacert', '--cert', '--key', '-w', '--write-out', '-T', '--upload-file', '--resolve',
  '-r', '--range', '-c', '--cookie-jar', '--retry', '--limit-rate', '-K', '--config', '--oauth2-bearer',
]);

const IGNORED = new Set([
  '-L', '--location', '-k', '--insecure', '-s', '--silent', '-S', '--show-error', '-v', '--verbose', '-i',
  '--include', '--compressed', '-#', '--progress-bar', '-f', '--fail', '--http1.1', '--http2', '-o',
  '--output', '-m', '--max-time', '--connect-timeout', '-w', '--write-out', '--retry', '-N', '--no-buffer',
  '-c', '--cookie-jar', '--cacert', '--limit-rate', '-x', '--proxy', '--resolve',
]);

const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii']);

function encodeFormValue(part: string): string {
  const eq = part.indexOf('=');
  if (eq === -1) return encodeURIComponent(part);
  return `${part.slice(0, eq)}=${encodeURIComponent(part.slice(eq + 1))}`;
}

function normalizeUrl(url: string): string {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(url) || url.startsWith('/') || url.startsWith('{{')) return url;
  return `http://${url}`;
}

function splitOption(token: string): [string, string | undefined] {
  if (token.startsWith('--')) {
    const eq = token.indexOf('=');
    return eq === -1 ? [token, undefined] : [token.slice(0, eq), token.slice(eq + 1)];
  }
  if (token.length > 2 && WITH_VALUE.has(token.slice(0, 2))) return [token.slice(0, 2), token.slice(2)];
  return [token, undefined];
}

export function parseCurl(command: string): CurlImport {
  const tokens = tokenizeShell(command.trim());
  if (/^curl(\.exe)?$/i.test(tokens[0] ?? '')) tokens.shift();

  const warnings: string[] = [];
  const headers: KeyValue[] = [];
  const data: string[] = [];
  let method: string | undefined;
  let url: string | undefined;
  let auth: RequestAuth = defaultAuth();
  let get = false;
  let head = false;
  let json = false;

  const addHeader = (key: string, value: string) => headers.push(newKeyValue({ key, value }));

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.startsWith('-') || token === '-') {
      if (!url) url = token;
      else warnings.push(`Argumento extra ignorado: ${token}`);
      continue;
    }

    const [flag, inline] = splitOption(token);
    const value = WITH_VALUE.has(flag) ? inline ?? tokens[++i] ?? '' : undefined;

    if (flag === '-X' || flag === '--request') method = value?.toUpperCase();
    else if (flag === '--url') url = value;
    else if (flag === '-G' || flag === '--get') get = true;
    else if (flag === '-I' || flag === '--head') head = true;
    else if (flag === '-H' || flag === '--header') {
      const header = value ?? '';
      const colon = header.indexOf(':');
      if (colon > 0) {
        const headerValue = header.slice(colon + 1).trim();
        if (headerValue) addHeader(header.slice(0, colon).trim(), headerValue);
      } else if (header.endsWith(';')) {
        addHeader(header.slice(0, -1).trim(), '');
      }
    } else if (DATA_FLAGS.has(flag) || flag === '--json') {
      if (value?.startsWith('@') && flag !== '--data-raw') {
        warnings.push(`Corpo lido de arquivo (${value}) não é suportado; cole o conteúdo no corpo.`);
      } else {
        data.push(value ?? '');
      }
      if (flag === '--json') json = true;
    } else if (flag === '--data-urlencode') data.push(encodeFormValue(value ?? ''));
    else if (flag === '-u' || flag === '--user') {
      const credentials = value ?? '';
      const colon = credentials.indexOf(':');
      auth = {
        ...defaultAuth(),
        type: 'basic',
        username: colon === -1 ? credentials : credentials.slice(0, colon),
        password: colon === -1 ? '' : credentials.slice(colon + 1),
      };
    } else if (flag === '--oauth2-bearer') auth = { ...defaultAuth(), type: 'bearer', token: value ?? '' };
    else if (flag === '-b' || flag === '--cookie') addHeader('Cookie', value ?? '');
    else if (flag === '-A' || flag === '--user-agent') addHeader('User-Agent', value ?? '');
    else if (flag === '-e' || flag === '--referer') addHeader('Referer', value ?? '');
    else if (flag === '-F' || flag === '--form' || flag === '--form-string') {
      warnings.push(`Formulário multipart (${flag} ${value}) ainda não é suportado.`);
    } else if (flag === '-T' || flag === '--upload-file') {
      warnings.push(`Upload de arquivo (${value}) não é suportado.`);
    } else if (!IGNORED.has(flag)) {
      warnings.push(`Opção ${flag} ignorada.`);
    }
  }

  if (!url) throw new Error('Nenhuma URL encontrada no comando curl.');
  url = normalizeUrl(url);

  const bearer = headers.find((h) => h.key.toLowerCase() === 'authorization' && /^bearer\s+/i.test(h.value));
  if (bearer && auth.type === 'none') {
    auth = { ...defaultAuth(), type: 'bearer', token: bearer.value.replace(/^bearer\s+/i, '') };
    headers.splice(headers.indexOf(bearer), 1);
  }

  let body = data.join('&');
  if (get && body) {
    url += (url.includes('?') ? '&' : '?') + body;
    body = '';
  }

  if (json) {
    if (!headers.some((h) => h.key.toLowerCase() === 'content-type')) addHeader('Content-Type', 'application/json');
    if (!headers.some((h) => h.key.toLowerCase() === 'accept')) addHeader('Accept', 'application/json');
  }

  const contentType = headers.find((h) => h.key.toLowerCase() === 'content-type')?.value ?? '';
  const parsed = body ? tryParseJson(body) : ({ ok: false } as const);
  const isJson = json || /json/i.test(contentType) || (parsed.ok && typeof parsed.value === 'object' && parsed.value !== null);

  const finalMethod = method ?? (head ? 'HEAD' : body ? 'POST' : 'GET');
  return {
    request: {
      title: `${finalMethod} ${splitBaseAndPath(url).path}`,
      method: finalMethod,
      url,
      headers,
      auth,
      bodyType: isJson ? 'json' : 'text',
      body: isJson && parsed.ok ? JSON.stringify(parsed.value, null, 2) : body,
    },
    warnings,
  };
}
