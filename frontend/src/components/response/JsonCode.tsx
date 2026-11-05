import { tokenizeJsonLine } from '../../lib/json';

interface JsonCodeProps {
  text: string;
  highlight: boolean;
}

/** Código com numeração de linhas e, opcionalmente, realce de JSON. */
export function JsonCode({ text, highlight }: JsonCodeProps) {
  const lines = text.split('\n');

  return (
    <div className="codebox">
      {lines.map((line, index) => (
        <div key={index} className="code-line">
          <span className="ln">{index + 1}</span>
          <span>
            {highlight
              ? tokenizeJsonLine(line).map((token, i) =>
                  token.kind === 'plain' ? (
                    token.text
                  ) : (
                    <span key={i} className={token.kind}>
                      {token.text}
                    </span>
                  )
                )
              : line}
          </span>
        </div>
      ))}
    </div>
  );
}
