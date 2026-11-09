import { assert, test } from 'vitest';
import { parseRunnerData as p } from '../lib/runnerData';
import { runScript } from '../lib/scripts/runScript';

test('lê CSV e JSON e expõe iterationData', () => {
  const csv = p('\uFEFFnome,idade\r\n"Silva, Ana",30\r\n\r\n"dito ""x""\nlinha2",\r\nZé', 'a.csv');
  assert.deepEqual(csv.columns, ['nome', 'idade']);
  assert.deepEqual(csv.rows, [{ nome: 'Silva, Ana', idade: '30' }, { nome: 'dito "x"\nlinha2', idade: '' }, { nome: 'Zé', idade: '' }]);
  assert.deepEqual(p('a;b\n1,5;2\n', 'x.csv').rows, [{ a: '1,5', b: '2' }]);
  assert.deepEqual(p('a\tb\n1\t2', 'x.tsv').rows, [{ a: '1', b: '2' }]);
  assert.deepEqual(p('"a;x",b\n1,2', 'x.csv').columns, ['a;x', 'b']);
  assert.deepEqual(p('so\n1\n2', 'x.csv').rows, [{ so: '1' }, { so: '2' }]);

  assert.throws(() => p('', 'x.csv'), /vazio/);
  assert.throws(() => p('a,b\n', 'x.csv'), /linhas de dados/);
  assert.throws(() => p('a,\n1,2', 'x.csv'), /sem nome/);
  assert.throws(() => p('a,a\n1,2', 'x.csv'), /mais de uma vez/);
  assert.throws(() => p('a,b\n1,2\n1,2,3', 'x.csv'), /linha 3 tem 3/);
  assert.throws(() => p('a\n"1', 'x.csv'), /fechamento a partir da linha 2/);

  const json = p('[{"a":1,"b":null},{"c":{"d":true},"a":"x"}]', 'd.json');
  assert.deepEqual(json.columns, ['a', 'b', 'c']);
  assert.deepEqual(json.rows, [{ a: '1', b: '' }, { c: '{"d":true}', a: 'x' }]);
  assert.deepEqual(p('[{"a":1}]', 'dados.txt').rows, [{ a: '1' }]);
  assert.throws(() => p('{"a":1}', 'd.json'), /lista/);
  assert.throws(() => p('[1]', 'd.json'), /item 1/);
  assert.throws(() => p('[oops', 'd.json'), /JSON válido/);
  assert.throws(() => p('[]', 'd.json'), /linhas de dados/);

  const out = runScript({
    phase: 'pre',
    code: 'console.log(pm.iterationData.get("a"), pm.iterationData.has("b"), pm.variables.get("a"), JSON.stringify(pm.iterationData.toObject()));',
    request: { method: 'GET', url: 'http://x', headers: {}, body: '' } as any,
    environment: {},
    variables: { a: '1' },
    iterationData: { a: '1' },
  });
  assert.ok(!out.error, String(out.error));
  assert.strictEqual(out.logs[0].message, '1 false 1 {"a":"1"}');
});
