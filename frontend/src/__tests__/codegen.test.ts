import { assert, test } from 'vitest';
import { generateCode } from '../lib/codegen';

test('gera código por linguagem', () => {
  const src = { method: 'post', url: 'https://a.b/c?d=1', headers: { 'X-A': 'q"uote' }, body: '{"é":1}' };
  const js = generateCode('fetch', src);
  assert.match(js, /method: "POST"/);
  assert.ok(js.includes('"X-A": "q\\"uote"'));
  assert.match(generateCode('python', src), /data=body\.encode\("utf-8"\)/);
  const go = generateCode('go', src);
  assert.match(go, /"strings"/);
  assert.ok(!generateCode('go', { ...src, body: '' }).includes('"strings"'));
});
