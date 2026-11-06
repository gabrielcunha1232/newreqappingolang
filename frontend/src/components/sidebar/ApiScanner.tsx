import { useState } from 'react';
import type { Endpoint } from '../../../bindings/changeme/internal/models/models';
import { fileName } from '../../lib/endpointSource';
import { methodClass, methodShort } from '../../lib/format';
import { pickDirectory, scanEndpoints } from '../../services/scannerService';

interface ApiScannerProps {
  onScanComplete: (dir: string, endpoints: Endpoint[], baseUrl: string) => void;
  onEndpointSelect: (endpoint: Endpoint) => void;
}

/** Escaneia um projeto Go e importa os endpoints encontrados para uma coleção. */
export function ApiScanner({ onScanComplete, onEndpointSelect }: ApiScannerProps) {
  const [directory, setDirectory] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);

  const handleBrowse = async () => {
    setError('');
    try {
      const selected = await pickDirectory();
      if (selected) setDirectory(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleScan = async () => {
    setError('');
    if (!directory.trim()) {
      setError('Informe o caminho do diretório do projeto Go.');
      return;
    }

    setLoading(true);
    try {
      const list = await scanEndpoints(directory);
      setEndpoints(list);
      setScanned(true);
      onScanComplete(directory, list, baseUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner">
      <div className="scanner-form">
        <label className="field-label" htmlFor="scan-dir">Projeto Go</label>
        <div className="side-tools flush">
          <input
            id="scan-dir"
            value={directory}
            onChange={(event) => setDirectory(event.target.value)}
            placeholder="C:\projetos\minha-api"
          />
          <button onClick={handleBrowse} disabled={loading} title="Procurar pasta">
            …
          </button>
        </div>
        <label className="field-label" htmlFor="scan-base-url">URL base (opcional)</label>
        <input
          id="scan-base-url"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="http://localhost:8080"
        />
        <button className="primary" onClick={handleScan} disabled={loading}>
          {loading ? 'Escaneando…' : '⌕ Escanear endpoints'}
        </button>
        {error && <div className="inline-error" role="alert">⚠ {error}</div>}
      </div>

      <div className="tree">
        {scanned && endpoints.length === 0 && <div className="tree-empty">Nenhum endpoint encontrado.</div>}
        {endpoints.map((endpoint) => (
          <div
            key={`${endpoint.method}:${endpoint.path}`}
            role="button"
            tabIndex={0}
            className="tree-item flat"
            title={endpoint.source_file}
            onClick={() => onEndpointSelect(endpoint)}
            onKeyDown={(event) => event.key === 'Enter' && onEndpointSelect(endpoint)}
          >
            <span className={methodClass(endpoint.method)}>{methodShort(endpoint.method)}</span>
            <span className="tree-label">{endpoint.path}</span>
            <span className="tree-count">{fileName(endpoint.source_file)}</span>
          </div>
        ))}
      </div>

      {endpoints.length > 0 && (
        <div className="side-bottom hint">
          {endpoints.length} endpoint{endpoints.length > 1 ? 's' : ''} importado(s) para a coleção. Clique para abrir.
        </div>
      )}
    </div>
  );
}
