import { useEffect, useState, type FormEvent } from 'react'
import { Events, WML } from "@wailsio/runtime";
import { HttpClientService } from "../bindings/changeme";
import { Request, type Response } from "../bindings/changeme/internal/models";

const wailsVersion = "v3.0.0";
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

function App() {
  const [time, setTime] = useState<string>('Listening for Time event...');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://httpbin.org/get');
  const [headers, setHeaders] = useState('{}');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResponse(null);

    let parsedHeaders: unknown;
    try {
      parsedHeaders = JSON.parse(headers || '{}');
    } catch {
      setError('Headers must be valid JSON.');
      return;
    }

    if (parsedHeaders === null || typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
      setError('Headers must be a JSON object with string values.');
      return;
    }

    const requestHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsedHeaders)) {
      if (typeof value !== 'string') {
        setError('Every header value must be a string.');
        return;
      }
      requestHeaders[key] = value;
    }

    setLoading(true);
    try {
      const result = await HttpClientService.DoRequest(new Request({
        method,
        url,
        headers: requestHeaders,
        body,
      }));
      setResponse(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Events.On('time', (timeValue: any) => {
      const full = timeValue.data;
      const compact = (full.match(/\d{1,2}:\d{2}:\d{2}/) || [full])[0];
      setTime(window.matchMedia('(max-width: 640px)').matches ? compact : full);
    });
    WML.Reload();
  }, []);

  return (
    <>
      <main className="container">
        <header className="brand">
          <a className="brand-mark" data-wml-openURL="https://v3.wails.io" aria-label="Wails website">
            <img src="/wails.png" className="brand-logo" alt="Wails logo"/>
          </a>
          <a className="brand-badge" data-wml-openURL="https://reactjs.org" aria-label="React">
            <img src="/react.svg" alt="React logo"/>
          </a>
        </header>

        <h1 className="title"><span className="title-accent">HTTP</span> Client</h1>
        <p className="subtitle">Send a request through the Go HTTP client and inspect the response.</p>

        <form className="request-form" onSubmit={doRequest}>
          <div className="request-url-row">
            <label className="sr-only" htmlFor="request-method">Method</label>
            <select id="request-method" className="request-method" value={method} onChange={(event) => setMethod(event.target.value)}>
              {methods.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <label className="sr-only" htmlFor="request-url">Request URL</label>
            <input id="request-url" className="request-url" value={url} onChange={(event) => setUrl(event.target.value)} type="text" placeholder="https://example.com" required/>
            <button className="btn request-submit" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>

          <div className="request-options">
            <label className="request-field">
              <span>Headers <span className="field-hint">JSON object</span></span>
              <textarea className="request-textarea request-headers" value={headers} onChange={(event) => setHeaders(event.target.value)} spellCheck={false} placeholder={'{\n  "Authorization": "Bearer token"\n}'}/>
            </label>
            <label className="request-field">
              <span>Body</span>
              <textarea className="request-textarea request-body" value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} placeholder="Request body (optional)"/>
            </label>
          </div>
        </form>

        {error && <p className="request-error" role="alert">{error}</p>}
        {response && (
          <section className="response-panel" aria-live="polite">
            <div className="response-meta">
              <strong>Status {response.status_code}</strong>
              <span>{response.time_spent} ms</span>
              <span>{response.size} bytes</span>
            </div>
            <pre className="response-body">{response.body || '(empty response body)'}</pre>
          </section>
        )}
      </main>

      <hr className="footer-divider"/>
      <footer className="footer">
        <span className="footer-version"><span>{wailsVersion}</span></span>
        <span className="footer-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>{time}</span>
        </span>
        <a className="footer-docs" data-wml-openURL="https://v3.wails.io" aria-label="Wails documentation">Docs
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        </a>
      </footer>
    </>
  )
}

export default App
