import { useMemo } from 'react';
import { tokenizePath } from '../../lib/pathTemplate';

interface PathTemplateProps {
  path: string;
}

export function PathTemplate({ path }: PathTemplateProps) {
  const tokens = useMemo(() => tokenizePath(path), [path]);

  return (
    <code className="docs-path" title={path}>
      {tokens.map((token, index) => {
        switch (token.kind) {
          case 'text':
            return token.text;
          case 'variable':
            return (
              <span key={index} className="docs-path-var" title={`Variável de ambiente ${token.name}`}>
                {token.text}
              </span>
            );
          case 'param':
            return (
              <span key={index} className="docs-path-param" title={`Parâmetro de rota ${token.name}`}>
                {token.text}
              </span>
            );
        }
      })}
    </code>
  );
}
