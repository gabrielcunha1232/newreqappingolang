import { assert, test } from 'vitest';
import { HELP_TOPICS, filterHelpTopics } from '../lib/helpContent';

test('tópicos têm id único e conteúdo', () => {
  assert.strictEqual(new Set(HELP_TOPICS.map((topic) => topic.id)).size, HELP_TOPICS.length);
  assert.ok(HELP_TOPICS.every((topic) => topic.blocks.length > 0));
  assert.ok(HELP_TOPICS.some((topic) => topic.id === 'atalhos'));
});

test('busca no conteúdo, sem acentos e com vários termos', () => {
  assert.deepEqual(filterHelpTopics(HELP_TOPICS, 'iterationdata csv').map((topic) => topic.id), ['runner']);
  assert.ok(filterHelpTopics(HELP_TOPICS, 'SECRETAS').some((topic) => topic.id === 'ambientes'));
  assert.ok(filterHelpTopics(HELP_TOPICS, 'autorizacao').some((topic) => topic.id === 'autorizacao'));
  assert.strictEqual(filterHelpTopics(HELP_TOPICS, '').length, HELP_TOPICS.length);
  assert.deepEqual(filterHelpTopics(HELP_TOPICS, 'xyzinexistente'), []);
});
