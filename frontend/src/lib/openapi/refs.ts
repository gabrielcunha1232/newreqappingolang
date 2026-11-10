import { isObject, type SpecObject } from './parseSpec';

const MAX_DEPTH = 12;

function hasOwn(object: SpecObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function refName(ref: string): string {
  return ref.split('/').pop() ?? ref;
}

export function createRefResolver(root: SpecObject, warn: (message: string) => void) {
  const warned = new Set<string>();
  const warnOnce = (message: string) => {
    if (warned.has(message)) return;
    warned.add(message);
    warn(message);
  };

  function lookup(ref: string): unknown {
    if (!ref.startsWith('#/')) {
      warnOnce(`Referência externa não suportada: ${ref}`);
      return undefined;
    }
    let node: unknown = root;
    for (const raw of ref.slice(2).split('/')) {
      const key = decodeURIComponent(raw.replace(/~1/g, '/').replace(/~0/g, '~'));
      node = isObject(node) && hasOwn(node, key) ? node[key] : undefined;
    }
    if (node === undefined) warnOnce(`Referência não encontrada: ${ref}`);
    return node;
  }

  function resolve(value: unknown): unknown {
    const seen = new Set<string>();
    let current = value;
    while (isObject(current) && typeof current.$ref === 'string') {
      if (seen.has(current.$ref)) return {};
      seen.add(current.$ref);
      current = lookup(current.$ref);
    }
    return current;
  }

  function deref(value: unknown, stack: string[] = [], depth = 0): unknown {
    if (depth > MAX_DEPTH) return { type: 'object' };
    if (Array.isArray(value)) return value.map((item) => deref(item, stack, depth + 1));
    if (!isObject(value)) return value;

    if (typeof value.$ref === 'string') {
      const ref = value.$ref;
      if (stack.includes(ref)) return { type: 'object', description: `Referência circular: ${refName(ref)}` };
      const target = lookup(ref);
      return target === undefined ? {} : deref(target, [...stack, ref], depth + 1);
    }

    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deref(item, stack, depth + 1)]));
  }

  return { resolve, deref };
}

export type RefResolver = ReturnType<typeof createRefResolver>;
