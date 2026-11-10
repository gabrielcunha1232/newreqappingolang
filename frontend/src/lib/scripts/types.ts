
export type ScriptPhase = 'pre' | 'post';

export interface ScriptRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface ScriptResponse {
  code: number;
  responseTime: number;
  size: number;
  body: string;
}

export interface ScriptInput {
  phase: ScriptPhase;
  code: string;
  request: ScriptRequest;
  response?: ScriptResponse;
  environment: Record<string, string>;
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
  error?: string;
  request: ScriptRequest;
  environmentChanges: Record<string, string | null>;
  variables: Record<string, string>;
  tests: TestResult[];
  logs: ScriptLog[];
}
