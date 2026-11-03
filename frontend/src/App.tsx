import { useEffect, useState, type FormEvent } from 'react'
import { Events, WML } from "@wailsio/runtime";
import { HttpClientService } from "../bindings/changeme";
import { Request, type Response } from "../bindings/changeme/internal/models";
import { AppFooter } from "./components/AppFooter";
import { AppHeader } from "./components/AppHeader";
import { RequestError } from "./components/RequestError";
import { RequestForm } from "./components/RequestForm";
import { ResponsePanel } from "./components/ResponsePanel";

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
        <AppHeader />
        <RequestForm
          method={method}
          url={url}
          headers={headers}
          body={body}
          loading={loading}
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onHeadersChange={setHeaders}
          onBodyChange={setBody}
          onSubmit={doRequest}
        />
        <RequestError message={error} />
        {response && <ResponsePanel response={response} />}
      </main>
      <AppFooter time={time} />
    </>
  )
}

export default App
