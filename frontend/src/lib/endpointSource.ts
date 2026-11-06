import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import type { ApiEndpointSource } from '../types';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  php: 'php',
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  cs: 'csharp',
  rb: 'ruby',
};

const LANGUAGE_LABELS: Record<string, string> = {
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  php: 'PHP',
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  csharp: 'C#',
  ruby: 'Ruby',
};

export function languageFromFile(file: string): string | undefined {
  const extension = /\.([a-z0-9]+)$/i.exec(file)?.[1]?.toLowerCase();
  return extension ? LANGUAGE_BY_EXTENSION[extension] : undefined;
}

export function languageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

/** "C:\api\handlers\user.go" → "user.go" */
export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

/** Metadados do endpoint retornado pelo scanner do backend. */
export function sourceFromScan(endpoint: Endpoint): ApiEndpointSource {
  return { file: endpoint.source_file, language: languageFromFile(endpoint.source_file) };
}
