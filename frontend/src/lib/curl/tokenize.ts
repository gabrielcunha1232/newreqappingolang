
function normalizeCmd(text: string): string {
  if (!/\^"/.test(text)) return text;
  return text.replace(/\^\r?\n/g, ' ').replace(/\^(.)/g, '$1');
}

function joinContinuations(text: string): string {
  return text.replace(/\\\r?\n/g, ' ').replace(/`\r?\n/g, ' ');
}

const ANSI_ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0' };

export function tokenizeShell(command: string): string[] {
  const text = joinContinuations(normalizeCmd(command));
  const tokens: string[] = [];
  let current = '';
  let inToken = false;
  let i = 0;

  const push = () => {
    if (inToken) tokens.push(current);
    current = '';
    inToken = false;
  };

  while (i < text.length) {
    const char = text[i];

    if (/\s/.test(char)) {
      push();
      i++;
    } else if (char === "'") {
      const end = text.indexOf("'", i + 1);
      current += text.slice(i + 1, end === -1 ? text.length : end);
      inToken = true;
      i = end === -1 ? text.length : end + 1;
    } else if (char === '$' && text[i + 1] === "'") {
      i += 2;
      while (i < text.length && text[i] !== "'") {
        if (text[i] === '\\' && i + 1 < text.length) {
          const next = text[i + 1];
          if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
            current += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16));
            i += 6;
          } else {
            current += ANSI_ESCAPES[next] ?? next;
            i += 2;
          }
        } else {
          current += text[i++];
        }
      }
      inToken = true;
      i++;
    } else if (char === '"') {
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\' && '"\\$`'.includes(text[i + 1] ?? '')) {
          current += text[i + 1];
          i += 2;
        } else {
          current += text[i++];
        }
      }
      inToken = true;
      i++;
    } else if (char === '\\' && i + 1 < text.length) {
      current += text[i + 1];
      inToken = true;
      i += 2;
    } else {
      current += char;
      inToken = true;
      i++;
    }
  }
  push();
  return tokens;
}
