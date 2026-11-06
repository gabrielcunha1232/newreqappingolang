import type { ScriptPhase } from './types';

export interface ScriptSnippet {
  label: string;
  code: string;
}

/** Trechos prontos inseridos pelo editor de scripts (como os "snippets" do Postman). */
export const SCRIPT_SNIPPETS: Record<ScriptPhase, ScriptSnippet[]> = {
  pre: [
    {
      label: 'Definir variável de ambiente',
      code: `pm.environment.set("nome", "valor");`,
    },
    {
      label: 'Timestamp em variável',
      code: `pm.variables.set("timestamp", Date.now());`,
    },
    {
      label: 'ID aleatório em variável',
      code: `pm.variables.set("requestId", Math.random().toString(36).slice(2));`,
    },
    {
      label: 'Adicionar cabeçalho',
      code: `pm.request.headers.upsert("X-Request-Id", pm.variables.get("requestId"));`,
    },
    {
      label: 'Log no console',
      code: `console.log("Enviando", pm.request.method, pm.request.url);`,
    },
  ],
  post: [
    {
      label: 'Status é 200',
      code: `pm.test("Status é 200", () => {\n  pm.response.to.have.status(200);\n});`,
    },
    {
      label: 'Status 2xx',
      code: `pm.test("Status de sucesso", () => {\n  pm.response.to.be.ok;\n});`,
    },
    {
      label: 'Tempo de resposta < 500 ms',
      code: `pm.test("Responde em menos de 500 ms", () => {\n  pm.expect(pm.response.responseTime).to.be.below(500);\n});`,
    },
    {
      label: 'Corpo contém texto',
      code: `pm.test("Corpo contém texto", () => {\n  pm.expect(pm.response.text()).to.include("texto");\n});`,
    },
    {
      label: 'JSON tem propriedade',
      code: `pm.test("Resposta tem id", () => {\n  const data = pm.response.json();\n  pm.expect(data).to.have.property("id");\n});`,
    },
    {
      label: 'Salvar token da resposta',
      code: `const data = pm.response.json();\npm.environment.set("token", data.token);`,
    },
  ],
};
