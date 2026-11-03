import type { FormEventHandler } from 'react';

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

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
      <div className="request-url-row">
        <label className="sr-only" htmlFor="request-method">Method</label>
        <select id="request-method" className="request-method" value={method} onChange={(event) => onMethodChange(event.target.value)}>
          {methods.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label className="sr-only" htmlFor="request-url">Request URL</label>
        <input id="request-url" className="request-url" value={url} onChange={(event) => onUrlChange(event.target.value)} type="text" placeholder="https://example.com" required/>
        <button className="btn request-submit" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>

      <div className="request-options">
        <label className="request-field">
          <span>Headers <span className="field-hint">JSON object</span></span>
          <textarea className="request-textarea request-headers" value={headers} onChange={(event) => onHeadersChange(event.target.value)} spellCheck={false} placeholder={'{\n  "Authorization": "******"\n}'}/>
        </label>
        <label className="request-field">
          <span>Body</span>
          <textarea className="request-textarea request-body" value={body} onChange={(event) => onBodyChange(event.target.value)} spellCheck={false} placeholder="Request body (optional)"/>
        </label>
      </div>
    </form>
  );
}
