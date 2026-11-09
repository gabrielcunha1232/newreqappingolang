import { assert, test } from 'vitest';
import { findExample, inferContentType, withExample, withoutExample } from '../lib/responseExamples';

test('salva, substitui e remove exemplos', () => {
  assert.strictEqual(inferContentType('{"a":1}'), 'application/json');
  assert.strictEqual(inferContentType('  <!DOCTYPE html><p>'), 'text/html');
  assert.strictEqual(inferContentType('oi'), 'text/plain');

  const imported = { description: 'd', responses: [{ status: '404', description: 'Não achou', schema: { type: 'object' } }, { status: '500' }] };
  const saved = withExample(imported, 404, '{"e":1}');
  assert.strictEqual(saved.description, 'd');
  assert.strictEqual(saved.responses!.length, 2);
  assert.deepEqual(findExample(saved, 404), { status: '404', description: 'Não achou', schema: { type: 'object' }, contentType: 'application/json', example: '{"e":1}' });

  const first = withExample(undefined, 200, 'x');
  assert.deepEqual(first.responses, [{ status: '200', contentType: 'text/plain', example: 'x' }]);
  assert.deepEqual(withoutExample(first, 200).responses, []);

  const removed = withoutExample(saved, 404);
  assert.strictEqual(findExample(removed, 404)?.example, undefined);
  assert.strictEqual(findExample(removed, 404)?.description, 'Não achou');
  assert.deepEqual(withExample(withExample(undefined, 500, 'a'), 200, 'b').responses!.map((r) => r.status), ['200', '500']);
});
