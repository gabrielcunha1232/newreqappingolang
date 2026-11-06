import { useMemo } from 'react';
import { languageLabel } from '../../lib/endpointSource';
import { tryParseJson } from '../../lib/json';
import type { ApiEndpoint, ApiEndpointSource, ApiSecurity } from '../../types';
import { JsonCode } from '../response/JsonCode';
import { DocsSection } from './DocsSection';
import { ParamsTable } from './ParamsTable';

function isJson(contentType: string | undefined): boolean {
  return /json/i.test(contentType ?? '');
}

/** Exemplo formatado; texto com {{variáveis}} (JSON inválido) fica como está. */
function formatExample(example: string, contentType: string | undefined): string {
  if (!isJson(contentType)) return example;
  const parsed = tryParseJson(example);
  return parsed.ok ? JSON.stringify(parsed.value, null, 2) : example;
}

function securityLabel(security: ApiSecurity): string {
  switch (security.type) {
    case 'bearer':
      return 'Bearer token no cabeçalho Authorization';
    case 'basic':
      return 'Basic Auth (usuário e senha) no cabeçalho Authorization';
    case 'apikey':
      return `API key no cabeçalho ${security.name ?? '(sem nome)'}`;
  }
}

function SourceInfo({ source }: { source: ApiEndpointSource }) {
  const location = source.line ? `${source.file}:${source.line}` : source.file;
  const stack = [source.language && languageLabel(source.language), source.framework].filter(Boolean).join(' · ');

  return (
    <dl className="docs-source">
      <dt>Arquivo</dt>
      <dd>
        <code title={location}>{location}</code>
      </dd>
      {source.handler && (
        <>
          <dt>Handler</dt>
          <dd>
            <code>{source.handler}</code>
          </dd>
        </>
      )}
      {stack && (
        <>
          <dt>Tecnologia</dt>
          <dd>{stack}</dd>
        </>
      )}
    </dl>
  );
}

interface EndpointDetailsProps {
  endpoint: ApiEndpoint;
  onTryIt?: () => void;
}

/** Corpo expandido de um endpoint: parâmetros, corpo, respostas, segurança e origem. */
export function EndpointDetails({ endpoint, onTryIt }: EndpointDetailsProps) {
  const { requestBody, responses, params, security, source } = endpoint;
  const bodyExample = useMemo(
    () => (requestBody?.example ? formatExample(requestBody.example, requestBody.contentType) : ''),
    [requestBody]
  );

  return (
    <div className="docs-details">
      {endpoint.description && <p className="docs-description">{endpoint.description}</p>}

      <DocsSection title="Parâmetros">
        {params.length > 0 ? <ParamsTable params={params} /> : <p className="muted">Sem parâmetros.</p>}
      </DocsSection>

      {requestBody && (
        <DocsSection title="Corpo da requisição" aside={requestBody.contentType}>
          {bodyExample ? (
            <JsonCode text={bodyExample} highlight={isJson(requestBody.contentType)} />
          ) : (
            <p className="muted">Sem exemplo.</p>
          )}
        </DocsSection>
      )}

      {responses.length > 0 && (
        <DocsSection title="Respostas">
          <ul className="docs-responses">
            {responses.map((response) => (
              <li key={response.status}>
                <code className="docs-response-status">{response.status}</code>
                <span>{response.description ?? ''}</span>
                {response.example && (
                  <JsonCode
                    text={formatExample(response.example, response.contentType)}
                    highlight={isJson(response.contentType)}
                  />
                )}
              </li>
            ))}
          </ul>
        </DocsSection>
      )}

      {security && (
        <DocsSection title="Autorização">
          <p>{securityLabel(security)}</p>
        </DocsSection>
      )}

      {source && (
        <DocsSection title="Origem no código">
          <SourceInfo source={source} />
        </DocsSection>
      )}

      {onTryIt && (
        <div className="docs-actions">
          <button className="primary" onClick={onTryIt}>
            ▶ Testar
          </button>
        </div>
      )}
    </div>
  );
}
