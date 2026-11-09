import { isJson, type CollectionImport } from './common';
import { importInsomnia, isInsomniaExport } from './insomnia';
import { importPostman, isPostmanCollection } from './postman';

export type { CollectionImport } from './common';

/** Detecta o formato pelo conteúdo. Lança Error com mensagem para o usuário. */
export function importCollectionText(content: string, existingNames: string[]): CollectionImport {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('O conteúdo não é um JSON válido.');
  }
  if (isJson(data)) {
    if (isPostmanCollection(data)) return importPostman(data, existingNames);
    if (isInsomniaExport(data)) return importInsomnia(data, existingNames);
  }
  throw new Error('Formato não reconhecido. Use uma coleção Postman v2.x ou um export do Insomnia (formato 4, JSON).');
}
