/* Contrato entre o app e o sandbox de scripts (dados que cruzam o Web Worker). */

export type ScriptPhase = 'pre' | 'post';

/** Requisição como o script a vê (e, no pre-script, pode alterar). */
export interface ScriptRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface ScriptResponse {
  code: number;
  /** Tempo de resposta em ms. */
  responseTime: number;
  size: number;
  body: string;
}

export interface ScriptInput {
  phase: ScriptPhase;
  code: string;
  request: ScriptRequest;
  response?: ScriptResponse;
  /** Variáveis do ambiente ativo. */
  environment: Record<string, string>;
  /** Variáveis locais da execução (pm.variables), compartilhadas entre pre e post. */
  variables: Record<string, string>;
  iterationData?: Record<string, string>;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export type ScriptLogLevel = 'info' | 'warn' | 'error';

export interface ScriptLog {
  level: ScriptLogLevel;
  message: string;
}

export interface ScriptOutput {
  /** Erro que interrompeu o script (sintaxe, exceção não tratada, tempo limite). */
  error?: string;
  request: ScriptRequest;
  /** Alterações no ambiente: valor novo, ou null para remover. */
  environmentChanges: Record<string, string | null>;
  variables: Record<string, string>;
  tests: TestResult[];
  logs: ScriptLog[];
}
