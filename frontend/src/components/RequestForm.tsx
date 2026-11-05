import type { FormEventHandler } from 'react';

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

interface RequestFormProps {
  method: string;
  url: string;
  headers: string;
  body: string;
  loading: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onHeadersChange: (headers: string) => void;
  onBodyChange: (body: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function RequestForm({
  method,
  url,
  headers,
  body,
  loading,
  onMethodChange,
  onUrlChange,
  onHeadersChange,
  onBodyChange,
  onSubmit,
}: RequestFormProps) {
  return (
    <form className="request-form" onSubmit={onSubmit}>
      <div className="panel-header">
        <span className="panel-title">Request</span>
      </div>

      <div className="panel-body">
        <div className="request-top-row">
          <select
            id="request-method"
            className="method-select"
            value={method}
            onChange={(event) => onMethodChange(event.target.value)}
          >
            {methods.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <input
            id="request-url"
            className="url-input"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            type="text"
            placeholder="https://example.com/api/resource"
            required
          />
          <button className="btn send-btn" type="submit" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        <div className="tabs">
          <button className="tab-btn active" type="button">
            Params
          </button>
          <button className="tab-btn" type="button">
            Authorization
          </button>
          <button className="tab-btn" type="button">
            Headers
          </button>
          <button className="tab-btn" type="button">
            Body
          </button>
        </div>

        <div className="request-field">
          <label className="field-label">
            Headers <span className="field-hint">JSON object</span>
          </label>
          <textarea
            className="textarea request-headers"
            value={headers}
            onChange={(event) => onHeadersChange(event.target.value)}
            spellCheck={false}
            placeholder='{\n  "Authorization": "Bearer token"\n}'
          />
        </div>

        <div className="request-field">
          <label className="field-label">
            Body <span className="field-hint">Request body (optional)</span>
          </label>
          <textarea
            className="textarea request-body"
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            spellCheck={false}
            placeholder='{"key": "value"}'
          />
        </div>
      </div>
    </form>
  );
}
