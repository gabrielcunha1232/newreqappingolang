import { useState } from 'react';
import { Scan, SelectDirectory } from '../../bindings/changeme/scannerservice';
import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import { EndpointList } from './EndpointList';

export function ScannerPanel({
  onEndpointSelect,
  onScanComplete,
}: {
  onEndpointSelect: (endpoint: Endpoint) => void;
  onScanComplete?: (dir: string, endpoints: Endpoint[], baseUrl?: string) => void;
}) {
  const [directory, setDirectory] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);

  const handleBrowse = async () => {
    setError('');
    try {
      const selected = await SelectDirectory();
      if (selected) {
        setDirectory(selected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleScan = async () => {
    setError('');
    setEndpoints([]);
    setSelectedEndpoint(null);

    if (!directory.trim()) {
      setError('Informe o caminho do diretório do projeto Go.');
      return;
    }

    setLoading(true);
    try {
      const result = await Scan(directory);
      const list = result || [];
      setEndpoints(list);
      onScanComplete?.(directory, list, baseUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    onEndpointSelect(endpoint);
  };

  return (
    <div className="view">
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Scanner de Endpoints</span>
        </div>
        <div className="panel-body">
          {error && (
            <div className="request-error">{error}</div>
          )}
          <div className="scan-control">
            <input
              className="dir-input"
              type="text"
              value={directory}
              onChange={(event) => setDirectory(event.target.value)}
              placeholder="Caminho do diretório Go (ex: ./meu-projeto)"
            />
            <button className="browse-btn" onClick={handleBrowse} disabled={loading}>
              Procurar…
            </button>
            <button className="scan-btn" onClick={handleScan} disabled={loading}>
              {loading ? 'Escaneando…' : 'Escanear'}
            </button>
          </div>
          <div className="scan-control scan-base">
            <label className="base-url-label" htmlFor="scan-base-url">
              URL base
            </label>
            <input
              id="scan-base-url"
              className="dir-input"
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="http://localhost:8080 — prefixo dos caminhos importados (opcional)"
            />
          </div>
          <EndpointList
            endpoints={endpoints}
            selectedEndpoint={selectedEndpoint}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  );
}
