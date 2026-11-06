import { Request } from '../../bindings/changeme/internal/models/models';
import { sendHttpRequest } from './httpService';

/**
 * Baixa uma especificação OpenAPI/Swagger. Usa o cliente HTTP do Go (e não
 * fetch) porque o webview bloquearia por CORS a maioria das APIs.
 */
export async function fetchSpecText(url: string): Promise<string> {
  const target = url.trim();
  if (!/^https?:\/\//i.test(target)) throw new Error('Informe uma URL http(s) completa.');

  const response = await sendHttpRequest(
    new Request({
      method: 'GET',
      url: target,
      headers: { Accept: 'application/json, application/yaml, text/yaml, */*' },
      body: '',
    })
  );
  if (response.status_code < 200 || response.status_code >= 300) {
    throw new Error(`O servidor respondeu ${response.status_code} ao baixar a especificação.`);
  }
  return response.body;
}
