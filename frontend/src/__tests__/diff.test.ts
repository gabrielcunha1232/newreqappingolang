import { assert, test } from 'vitest';
import { diffLines } from '../lib/diff';

test('compara linhas e desiste em textos enormes', () => {
  const kinds = (a: string, b: string) => diffLines(a, b)!.map((l) => l.kind[0] + l.text).join(',');
  assert.strictEqual(kinds('a\nb\nc', 'a\nX\nc'), 'sa,rb,aX,sc');
  assert.strictEqual(kinds('a', 'a'), 'sa');
  assert.strictEqual(kinds('', 'a\nb').replace('r,', ''), 'aa,ab');
  assert.strictEqual(diffLines(Array.from({ length: 3000 }, (_, i) => 'x' + i).join('\n'), Array.from({ length: 3000 }, (_, i) => 'y' + i).join('\n')), null);
});
