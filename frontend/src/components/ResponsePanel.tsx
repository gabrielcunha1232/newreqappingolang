import type { Response } from "../../bindings/changeme/internal/models";

interface ResponsePanelProps {
  response: Response;
}

export function ResponsePanel({ response }: ResponsePanelProps) {
  return (
    <section className="response-panel" aria-live="polite">
      <div className="response-meta">
        <strong>Status {response.status_code}</strong>
        <span>{response.time_spent} ms</span>
        <span>{response.size} bytes</span>
      </div>
      <pre className="response-body">{response.body || '(empty response body)'}</pre>
    </section>
  );
}
