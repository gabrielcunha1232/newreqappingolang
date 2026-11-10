import { AssertionError, expect } from './expect';
import type { ScriptInput, ScriptLog, ScriptLogLevel, ScriptOutput, ScriptRequest, TestResult } from './types';


function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function errorText(err: unknown): string {
  if (err instanceof AssertionError) return err.message;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

function asVariable(value: unknown): string {
  return typeof value === 'string' ? value : stringify(value);
}

function findHeader(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : key;
}

function headerApi(request: ScriptRequest) {
  return {
    get: (name: string) => {
      const key = findHeader(request.headers, name);
      return key === undefined ? undefined : request.headers[key];
    },
    has: (name: string) => findHeader(request.headers, name) !== undefined,
    upsert: (header: string | { key: string; value: unknown }, value?: unknown) => {
      const name = typeof header === 'string' ? header : header.key;
      const text = asVariable(typeof header === 'string' ? value : header.value);
      const existing = findHeader(request.headers, name);
      if (existing !== undefined) delete request.headers[existing];
      request.headers[name] = text;
    },
    remove: (name: string) => {
      const key = findHeader(request.headers, name);
      if (key !== undefined) delete request.headers[key];
    },
    toObject: () => ({ ...request.headers }),
  };
}

export function runScript(input: ScriptInput): ScriptOutput {
  const request: ScriptRequest = { ...input.request, headers: { ...input.request.headers } };
  const environment = { ...input.environment };
  const environmentChanges: Record<string, string | null> = {};
  const variables = { ...input.variables };
  const tests: TestResult[] = [];
  const logs: ScriptLog[] = [];

  const log = (level: ScriptLogLevel) => (...args: unknown[]) =>
    logs.push({ level, message: args.map(stringify).join(' ') });
  const console = { log: log('info'), info: log('info'), debug: log('info'), warn: log('warn'), error: log('error') };

  const response = input.response;
  const responseApi = response && {
    code: response.code,
    status: response.code,
    responseTime: response.responseTime,
    size: response.size,
    text: () => response.body,
    json: () => JSON.parse(response.body) as unknown,
    to: {
      have: {
        status: (code: number) => {
          if (response.code !== code) throw new AssertionError(`esperado status ${code}, veio ${response.code}`);
        },
      },
      be: {
        get ok() {
          if (response.code < 200 || response.code >= 300) {
            throw new AssertionError(`esperado status 2xx, veio ${response.code}`);
          }
          return true;
        },
      },
    },
  };

  const pm = {
    info: { phase: input.phase === 'pre' ? 'prerequest' : 'test' },
    environment: {
      get: (name: string) => environment[name],
      has: (name: string) => Object.prototype.hasOwnProperty.call(environment, name),
      set: (name: string, value: unknown) => {
        environment[name] = asVariable(value);
        environmentChanges[name] = environment[name];
      },
      unset: (name: string) => {
        delete environment[name];
        environmentChanges[name] = null;
      },
      toObject: () => ({ ...environment }),
    },
    variables: {
      get: (name: string) => variables[name] ?? environment[name],
      has: (name: string) => name in variables || name in environment,
      set: (name: string, value: unknown) => {
        variables[name] = asVariable(value);
      },
      unset: (name: string) => {
        delete variables[name];
      },
      toObject: () => ({ ...environment, ...variables }),
    },
    iterationData: {
      get: (name: string) => input.iterationData?.[name],
      has: (name: string) => Boolean(input.iterationData) && Object.prototype.hasOwnProperty.call(input.iterationData, name),
      toObject: () => ({ ...input.iterationData }),
    },
    request: {
      get method() {
        return request.method;
      },
      set method(value: string) {
        request.method = String(value).toUpperCase();
      },
      get url() {
        return request.url;
      },
      set url(value: string) {
        request.url = String(value);
      },
      get body() {
        return request.body;
      },
      set body(value: unknown) {
        request.body = typeof value === 'string' ? value : stringify(value);
      },
      headers: headerApi(request),
    },
    response: responseApi,
    test: (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name: String(name), passed: true });
      } catch (err) {
        tests.push({ name: String(name), passed: false, error: errorText(err) });
      }
    },
    expect: (value: unknown) => expect(value),
  };

  let error: string | undefined;
  try {
    const run = new Function('pm', 'console', `"use strict";\n${input.code}`);
    run(pm, console);
  } catch (err) {
    error = errorText(err);
  }

  return { error, request, environmentChanges, variables, tests, logs };
}
