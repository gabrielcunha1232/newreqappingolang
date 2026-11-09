import { assert, test } from 'vitest';
import { bodyExample, serializeBody } from '../lib/requestBody';
import { newKeyValue, newRequest } from '../lib/factories';

const id = (t: string) => t;
const vars = (t: string) => t.replace('{{x}}', 'a b&c');

test('serializa form, graphql e json', () => {
  const form = { ...newRequest(), bodyType: 'form' as const, formFields: [newKeyValue({ key: 'k', value: '{{x}}' }), newKeyValue({ key: 'off', value: '1', enabled: false })] };
  assert.strictEqual(serializeBody(form, vars).body, 'k=a+b%26c');
  assert.strictEqual(serializeBody(form, vars).contentType, 'application/x-www-form-urlencoded');
  assert.match(serializeBody(form, id).unresolvedText, /\{\{x\}\}/);
  assert.strictEqual(bodyExample(form), 'k={{x}}');
  const gql = { ...newRequest(), bodyType: 'graphql' as const, body: 'query { a }', graphqlVariables: '{"id": 1}' };
  assert.deepEqual(JSON.parse(serializeBody(gql, id).body), { query: 'query { a }', variables: { id: 1 } });
  assert.ok(serializeBody({ ...gql, graphqlVariables: '{oops' }, id).error);
  assert.deepEqual(JSON.parse(serializeBody({ ...gql, graphqlVariables: '' }, id).body), { query: 'query { a }' });
  assert.strictEqual(serializeBody({ ...newRequest(), bodyType: 'json', body: '' }, id).contentType, undefined);
});
