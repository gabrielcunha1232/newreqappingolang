/*
 * Subconjunto do pm.expect (estilo Chai) usado em testes de API:
 *   pm.expect(x).to.equal(1) / .eql({...}) / .be.ok / .be.true / .be.false
 *   .to.include("a") / .to.have.property("id"[, valor]) / .to.have.lengthOf(3)
 *   .to.be.above(1) / .below(5) / .to.be.a("string") / .to.match(/re/)
 *   .not inverte qualquer asserção.
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

function show(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text.length > 120 ? `${text.slice(0, 117)}...` : text;
  } catch {
    return String(value);
  }
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return (
    keysA.length === keysB.length &&
    keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  );
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** Cria a cadeia de asserções; `negate` vem do `.not`. */
export function expect(actual: unknown, negate = false): Record<string, unknown> {
  const assert = (passed: boolean, message: string, negatedMessage: string) => {
    if (passed === negate) throw new AssertionError(negate ? negatedMessage : message);
  };

  const chain: Record<string, unknown> = {};

  const methods = {
    equal(expected: unknown) {
      assert(Object.is(actual, expected), `esperado ${show(actual)} igual a ${show(expected)}`, `esperado ${show(actual)} diferente de ${show(expected)}`);
      return chain;
    },
    eql(expected: unknown) {
      assert(deepEqual(actual, expected), `esperado ${show(actual)} igual (profundo) a ${show(expected)}`, `esperado ${show(actual)} diferente (profundo) de ${show(expected)}`);
      return chain;
    },
    include(item: unknown) {
      let has = false;
      if (typeof actual === 'string') has = actual.includes(String(item));
      else if (Array.isArray(actual)) has = actual.some((x) => deepEqual(x, item));
      else if (actual && typeof actual === 'object' && item && typeof item === 'object') {
        has = Object.entries(item).every(([k, v]) => deepEqual((actual as Record<string, unknown>)[k], v));
      }
      assert(has, `esperado ${show(actual)} conter ${show(item)}`, `esperado ${show(actual)} não conter ${show(item)}`);
      return chain;
    },
    property(name: string, ...value: unknown[]) {
      const target = actual as Record<string, unknown> | null | undefined;
      const has = target !== null && target !== undefined && Object.prototype.hasOwnProperty.call(target, name);
      if (value.length === 0 || !has) {
        assert(has, `esperado ${show(actual)} ter a propriedade "${name}"`, `esperado ${show(actual)} não ter a propriedade "${name}"`);
      } else {
        assert(
          deepEqual(target?.[name], value[0]),
          `esperado "${name}" = ${show(value[0])}, veio ${show(target?.[name])}`,
          `esperado "${name}" diferente de ${show(value[0])}`
        );
      }
      return chain;
    },
    lengthOf(length: number) {
      const size = (actual as { length?: unknown } | null)?.length;
      assert(size === length, `esperado tamanho ${length}, veio ${show(size)}`, `esperado tamanho diferente de ${length}`);
      return chain;
    },
    above(limit: number) {
      assert(typeof actual === 'number' && actual > limit, `esperado ${show(actual)} maior que ${limit}`, `esperado ${show(actual)} no máximo ${limit}`);
      return chain;
    },
    below(limit: number) {
      assert(typeof actual === 'number' && actual < limit, `esperado ${show(actual)} menor que ${limit}`, `esperado ${show(actual)} no mínimo ${limit}`);
      return chain;
    },
    a(type: string) {
      assert(typeOf(actual) === type.toLowerCase(), `esperado tipo ${type}, veio ${typeOf(actual)}`, `esperado tipo diferente de ${type}`);
      return chain;
    },
    match(pattern: RegExp) {
      assert(typeof actual === 'string' && pattern.test(actual), `esperado ${show(actual)} casar com ${pattern}`, `esperado ${show(actual)} não casar com ${pattern}`);
      return chain;
    },
  };

  const properties: Record<string, () => unknown> = {
    ok: () => assert(Boolean(actual), `esperado ${show(actual)} verdadeiro`, `esperado ${show(actual)} falso`),
    true: () => assert(actual === true, `esperado true, veio ${show(actual)}`, 'esperado diferente de true'),
    false: () => assert(actual === false, `esperado false, veio ${show(actual)}`, 'esperado diferente de false'),
    null: () => assert(actual === null, `esperado null, veio ${show(actual)}`, 'esperado diferente de null'),
    undefined: () => assert(actual === undefined, `esperado undefined, veio ${show(actual)}`, 'esperado diferente de undefined'),
    empty: () => {
      const isEmpty =
        typeof actual === 'string' || Array.isArray(actual)
          ? actual.length === 0
          : actual !== null && typeof actual === 'object' && Object.keys(actual).length === 0;
      assert(isEmpty, `esperado ${show(actual)} vazio`, `esperado ${show(actual)} não vazio`);
    },
  };

  Object.assign(chain, methods, {
    eq: methods.equal,
    equals: methods.equal,
    deep: { equal: methods.eql },
    contain: methods.include,
    includes: methods.include,
    an: methods.a,
    greaterThan: methods.above,
    lessThan: methods.below,
    length: methods.lengthOf,
  });

  // Palavras de ligação ("to", "be", "have"...) devolvem a própria cadeia.
  for (const word of ['to', 'be', 'been', 'is', 'that', 'which', 'and', 'has', 'have', 'with', 'at', 'of', 'same', 'does']) {
    Object.defineProperty(chain, word, { get: () => chain });
  }
  Object.defineProperty(chain, 'not', { get: () => expect(actual, !negate) });
  for (const [name, check] of Object.entries(properties)) {
    Object.defineProperty(chain, name, {
      get: () => {
        check();
        return chain;
      },
    });
  }

  return chain;
}
