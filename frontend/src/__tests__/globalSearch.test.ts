import { assert, test } from 'vitest';
import { newRequest } from '../lib/factories';
import { buildSearchItems, indexItems, searchIndex, type SearchItem } from '../lib/globalSearch';
import type { Collection, Environment, Folder, MenuDefinition } from '../types';

const collection: Collection = { id: 'c', name: 'Loja', collapsed: true, baseUrl: 'http://loja' };
const folders: Folder[] = [
  { id: 'a', collectionId: 'c', parentId: null, name: 'Pedidos', collapsed: true, baseUrl: '' },
  { id: 'b', collectionId: 'c', parentId: 'a', name: 'Devolução', collapsed: true, baseUrl: '' },
];
const environment: Environment = { id: 'e', name: 'Produção', variables: [] };
const calls: string[] = [];
const menus: MenuDefinition[] = [
  {
    label: 'Arquivo',
    items: [
      { label: 'Fazer backup', onSelect: () => calls.push('backup') },
      'separator',
      { label: 'Busca global', shortcut: 'Ctrl+K', onSelect: () => calls.push('search') },
    ],
  },
];
const requests = [
  { ...newRequest('c'), id: 'r1', folderId: 'b', title: 'Criar pedido', method: 'POST', url: '/pedidos', body: '{"cupom":"natal"}' },
  { ...newRequest('c'), id: 'r2', title: 'Listar produtos', method: 'GET', url: '/produtos' },
  { ...newRequest(null), id: 'r3', title: 'Ping', method: 'GET', url: 'http://x/ping' },
];

const items = buildSearchItems(
  { collections: [collection], folders, requests, openRequestIds: ['r3'], environments: [environment], menus, excludedCommands: ['Busca global'] },
  {
    openRequest: (id) => calls.push(`open:${id}`),
    revealCollection: (id) => calls.push(`collection:${id}`),
    revealFolder: (ids, id) => calls.push(`folder:${ids.join()}:${id}`),
    selectEnvironment: (env) => calls.push(`env:${env.id}`),
  }
);
const index = indexItems(items);
const ids = (term: string, limit?: number) => searchIndex(index, term, limit).map((item: SearchItem) => item.id);

test('sem termo mostra abas abertas primeiro', () => {
  assert.strictEqual(ids('')[0], 'request:r3');
  assert.deepEqual(ids('', 2), ['request:r3', 'request:r1']);
});

test('prioriza título e ignora acentos e maiúsculas', () => {
  assert.deepEqual(ids('devolucao'), ['folder:b', 'request:r1']);
  assert.strictEqual(ids('PRODUCAO')[0], 'environment:e');
  assert.deepEqual(ids('pedido').slice(0, 2), ['folder:a', 'request:r1']);
});

test('exige todos os termos em qualquer campo', () => {
  assert.deepEqual(ids('post criar'), ['request:r1']);
  assert.deepEqual(ids('natal'), ['request:r1']);
  assert.deepEqual(ids('criar inexistente'), []);
});

test('não lista comandos excluídos e executa a ação certa', () => {
  assert.deepEqual(ids('busca global'), []);
  assert.deepEqual(ids('backup'), ['command:Arquivo:Fazer backup']);
  calls.length = 0;
  for (const id of ['request:r1', 'folder:b', 'collection:c', 'environment:e', 'command:Arquivo:Fazer backup']) {
    items.find((item) => item.id === id)!.run();
  }
  assert.deepEqual(calls, ['open:r1', 'folder:b,a:c', 'collection:c', 'env:e', 'backup']);
});

test('mostra o caminho da pasta na requisição', () => {
  assert.strictEqual(items.find((item) => item.id === 'request:r1')!.subtitle, 'Loja / Pedidos / Devolução · /pedidos');
  assert.strictEqual(items.find((item) => item.id === 'request:r3')!.subtitle, 'Sem grupo · http://x/ping');
});
