import { assert, test } from 'vitest';
import { findResponseSchema, validateAgainstSchema as v, withInferredSchema } from '../lib/schemaValidation';

const msgs = (value: unknown, schema: any) => v(value, schema).map((i) => `${i.path}: ${i.message}`);

const user = {
  type: 'object',
  required: ['id', 'name', 'secret'],
  properties: {
    id: { type: 'integer', minimum: 1 },
    name: { type: 'string', minLength: 2 },
    secret: { type: 'string', writeOnly: true },
    nick: { type: 'string', nullable: true },
    role: { type: 'string', enum: ['a', 'b'] },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 2 },
    at: { type: 'string', format: 'date-time' },
    deep: { type: 'object' },
    'a-b': { type: 'number' },
  },
  additionalProperties: false,
};

test('valida respostas e gera schema', () => {
  assert.deepEqual(msgs({ id: 1, name: 'ab', nick: null, role: 'a', tags: ['x'], at: '2024-01-02T03:04:05Z', deep: 5 }, user), []);
  assert.deepEqual(msgs({ id: 1.5, name: 'a', 'a-b': 'x', z: 1 }, user), [
    '$.id: esperado integer, veio number',
    '$.name: deve ter ao menos 2 caractere(s)',
    '$["a-b"]: esperado number, veio string',
    '$.z: campo não declarado',
  ]);
  assert.deepEqual(msgs({ name: 'ab' }, user), ['$.id: campo obrigatório ausente']);
  assert.deepEqual(msgs({ id: 0, name: 'ab', role: 'c', tags: [1, 'a', 'b'], at: 'ontem' }, user), [
    '$.id: deve ser no mínimo 1',
    '$.role: valor fora da lista permitida: "a", "b"',
    '$.tags: deve ter no máximo 2 item(ns)',
    '$.tags[0]: esperado string, veio number',
    '$.at: formato date-time inválido',
  ]);

  assert.deepEqual(msgs(1, { oneOf: [{ type: 'integer' }, { type: 'number' }] }), ['$: corresponde a 2 opções de oneOf; esperada exatamente uma']);
  assert.deepEqual(msgs('x', { anyOf: [{ type: 'integer' }, { type: 'null' }] }), ['$: não corresponde a nenhuma das opções de anyOf']);
  assert.deepEqual(msgs({ a: 1 }, { allOf: [{ required: ['a'] }, { required: ['b'] }] }), ['$.b: campo obrigatório ausente']);
  assert.deepEqual(msgs('x', { type: 'object', description: 'Referência circular: User' }), []);
  assert.deepEqual(msgs(null, { type: ['string', 'null'] }), []);
  assert.deepEqual(msgs(5, { type: 'number', minimum: 5, exclusiveMinimum: true }), ['$: deve ser maior que 5']);
  assert.deepEqual(msgs('a', { type: 'string', pattern: '(' }), []);

  const s = { type: 'string' };
  const doc = { responses: [{ status: '200', schema: s }, { status: '4xx', schema: { type: 'array' } }, { status: 'default', schema: { type: 'null' } }, { status: '201' }] };
  assert.strictEqual(findResponseSchema(doc, 200)?.status, '200');
  assert.strictEqual(findResponseSchema(doc, 404)?.status, '4xx');
  assert.strictEqual(findResponseSchema(doc, 201)?.status, 'default');
  assert.strictEqual(findResponseSchema(undefined, 200), undefined);

  const gen = withInferredSchema({ description: 'd', responses: [{ status: '200', example: 'e' }] }, 200, { a: 1, b: null });
  assert.strictEqual(gen.description, 'd');
  assert.strictEqual(gen.responses![0].example, 'e');
  assert.strictEqual(gen.responses![0].schemaInferred, true);
  assert.deepEqual(msgs({ a: 2, b: 'x' }, gen.responses![0].schema), []);
  assert.deepEqual(msgs({ a: 'x' }, gen.responses![0].schema), ['$.a: esperado integer, veio string']);
});
