import { normalize } from './globalSearch';

export type HelpBlock = { text: string } | { items: string[] } | { code: string };

export interface HelpTopic {
  id: string;
  title: string;
  blocks: HelpBlock[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'inicio',
    title: 'Primeiros passos',
    blocks: [
      { text: 'Crie uma requisição com Ctrl+T, escolha o método, informe a URL e envie com Ctrl+Enter. A resposta aparece no painel Resposta, e os detalhes do envio ficam no Console.' },
      { items: [
        'A URL aceita {{variáveis}} do ambiente ativo.',
        'Caminhos como /users/:id ou /users/{id} criam campos em Parâmetros → Variáveis de caminho.',
        'Caminhos relativos, como /albums, usam a URL base da pasta ou da coleção.',
        'Colar um comando cURL no campo de URL preenche a requisição.',
        'O layout dos painéis pode ser alterado no menu Visualizar.',
      ] },
    ],
  },
  {
    id: 'colecoes',
    title: 'Coleções e pastas',
    blocks: [
      { text: 'Use o menu ⋯ ou o clique direito na barra lateral para criar, renomear, mover, executar e configurar itens.' },
      { items: [
        'Pastas podem ter subpastas, URL base e autorização próprias.',
        'Excluir uma pasta não apaga o conteúdo: ele sobe um nível.',
        'Requisições podem mudar de coleção ou pasta pelo menu "Mover para". Pastas só se movem dentro da mesma coleção.',
        'No menu da coleção, "Agrupar por grupos" mostra as requisições separadas pelos mesmos grupos da documentação (tag ou primeiro trecho do caminho). É só visualização: as pastas ficam ocultas e a reordenação por arraste fica desativada enquanto o modo estiver ligado.',
        'Duplo clique ou F2 renomeia uma requisição.',
        'Arraste para reordenar. Soltar no meio de uma pasta ou sobre uma coleção coloca o item dentro dela. O arraste fica desativado durante a busca.',
      ] },
    ],
  },
  {
    id: 'autorizacao',
    title: 'Autorização e OAuth 2.0',
    blocks: [
      { text: 'Na aba Autorização, escolha Bearer Token, Basic Auth, API Key, OAuth 2.0, Herdar da pasta/coleção ou Sem autenticação. Para configurar uma pasta ou coleção, use "Autorização…" no menu dela.' },
      { items: [
        'Com Herdar, vale a primeira pasta configurada subindo a árvore e, por último, a coleção.',
        'OAuth 2.0 aceita client credentials e authorization code com PKCE.',
        'Um token vencido é renovado no envio, e um token herdado é guardado na pasta ou coleção dona dele.',
      ] },
    ],
  },
  {
    id: 'corpo',
    title: 'Corpo da requisição',
    blocks: [
      { text: 'A aba Corpo oferece quatro formatos:' },
      { items: [
        'JSON: com botões para formatar e compactar.',
        'Texto: enviado como foi escrito.',
        'Form: campos enviados como application/x-www-form-urlencoded.',
        'GraphQL: query e variáveis em JSON.',
      ] },
    ],
  },
  {
    id: 'ambientes',
    title: 'Ambientes e variáveis secretas',
    blocks: [
      { text: 'O painel Ambiente guarda variáveis usadas como {{nome}}. Só as variáveis do ambiente ativo são aplicadas.' },
      { text: 'O cadeado marca uma variável como secreta, e o olho mostra o valor temporariamente. O envio sempre usa o valor real.' },
      { items: [
        'Console, histórico, erros, cURL, código gerado e OpenAPI mostram {{nome}} no lugar do valor.',
        'Por isso, um cURL copiado com variável secreta precisa do valor antes de rodar no terminal.',
        'O valor continua em texto puro no arquivo do app e no backup.',
        'O corpo da resposta não é mascarado, e valores com menos de 4 caracteres não são substituídos nos textos.',
      ] },
    ],
  },
  {
    id: 'scripts',
    title: 'Scripts e testes',
    blocks: [
      { text: 'As abas Pré-processamento e Pós-processamento executam JavaScript antes e depois do envio, com trechos prontos ao lado do editor. Cada script tem até 5 segundos.' },
      { code: 'pm.test("Status é 200", () => {\n  pm.response.to.have.status(200);\n});\n\nconst data = pm.response.json();\npm.environment.set("token", data.token);' },
      { items: [
        'pm.environment: variáveis do ambiente ativo.',
        'pm.variables: variáveis válidas só nesta execução.',
        'pm.iterationData: dados da linha atual no Runner.',
        'pm.request e pm.response: requisição e resposta.',
        'pm.test e pm.expect: testes, exibidos na aba Testes da resposta.',
      ] },
    ],
  },
  {
    id: 'resposta',
    title: 'Visualizar respostas',
    blocks: [
      { items: [
        'Pretty, Raw e Preview: corpo formatado, original ou renderizado.',
        'Visualização: tabela para respostas JSON com listas de objetos.',
        'Comparar: diferenças em relação à execução anterior.',
        'Testes: resultado do pós-processamento, quando há script.',
        'Schema: validação da resposta.',
        'Extrair: guarda campos do JSON em variáveis.',
      ] },
      { text: 'A última resposta de cada requisição é mantida ao fechar o app, até 128 KB por resposta e 4 MB no total. Ela fica em texto puro no arquivo do app.' },
    ],
  },
  {
    id: 'encadear',
    title: 'Encadear requisições',
    blocks: [
      { text: 'Na aba Extrair da resposta, clique em "Extrair" no campo desejado e dê um nome à variável. A cada envio, o valor é gravado no ambiente ativo, inclusive no Runner, e pode ser usado na próxima requisição como {{nome}}.' },
      { items: [
        'A extração roda antes do script de pós-processamento.',
        'Se o campo não vier na resposta, a variável mantém o valor anterior e o Console mostra um aviso.',
        'Marque a variável como secreta no ambiente se ela guardar um token.',
      ] },
    ],
  },
  {
    id: 'historico',
    title: 'Histórico',
    blocks: [
      { text: 'A barra lateral guarda as últimas 100 execuções, agrupadas por dia, com filtros por URL, método e faixa de status. Clique direito em uma entrada e use "Ver resposta" para abrir o corpo daquela execução.' },
      { text: 'O corpo é guardado até 64 KB por execução e 2 MB no total, em texto puro. Acima disso, a entrada fica sem resposta.' },
    ],
  },
  {
    id: 'comparar',
    title: 'Comparar ambientes',
    blocks: [
      { text: '"Comparar ambientes…", no menu da requisição ou em Editar, envia a mesma requisição em dois ambientes e mostra o diff das respostas.' },
      { items: [
        'A requisição é executada de verdade nos dois ambientes; métodos como POST exibem um alerta.',
        'Scripts e extrações não rodam, e nada entra no histórico.',
        'Tokens OAuth 2.0 vencidos não são renovados nesta comparação.',
      ] },
    ],
  },
  {
    id: 'exemplos',
    title: 'Exemplos de resposta',
    blocks: [
      { text: 'Na barra da resposta, "Salvar como exemplo" guarda o corpo na requisição. Há um exemplo por status: salvar outro 200 substitui o anterior, e clicar em "✓ Exemplo 200" remove.' },
      { items: [
        'Os exemplos aparecem na documentação e no OpenAPI exportado.',
        'Respostas acima de 1 MB não podem ser salvas.',
        'O corpo é guardado como veio; revise respostas com dados sensíveis.',
      ] },
    ],
  },
  {
    id: 'schema',
    title: 'Validação por schema',
    blocks: [
      { text: 'A aba Schema compara a resposta com o schema do status exato, da faixa (4XX) ou do default. Specs OpenAPI importadas já são validadas automaticamente.' },
      { text: 'Sem schema, "Gerar schema" cria um a partir da resposta atual. Ele compara só os tipos: detecta um campo que mudou de tipo, mas não um campo que sumiu. Em listas, o tipo dos itens vem do primeiro elemento.' },
      { text: '"Editar schema" permite marcar campos obrigatórios ou editar o JSON. No Runner, a opção "Reprovar se divergir do schema" transforma divergências em falha.' },
    ],
  },
  {
    id: 'runner',
    title: 'Collection Runner',
    blocks: [
      { text: 'No menu de uma coleção ou pasta, "Executar…" roda as requisições em sequência. Variáveis alteradas por scripts passam para a requisição seguinte.' },
      { text: 'Em "Dados (CSV/JSON)", escolha um arquivo para repetir a execução uma vez por linha. Cada coluna vira uma {{variável}}.' },
      { code: 'nome,idade,status\nAna,30,200\nBruno,25,404' },
      { items: [
        'O CSV pode usar vírgula, ponto e vírgula ou tab. O JSON deve ser uma lista de objetos.',
        'Valores do arquivo têm prioridade sobre o ambiente.',
        'Nos scripts, a linha atual fica em pm.iterationData.get("coluna").',
        'Sem testes, falha é status 400 ou maior. Com testes, os testes decidem.',
        '"Parar na primeira falha" interrompe também as linhas seguintes.',
        'Cada linha faz requisições reais; use Intervalo em APIs com limite de taxa.',
        'O relatório salvo não inclui cabeçalhos, corpos nem valores do arquivo.',
      ] },
    ],
  },
  {
    id: 'documentacao',
    title: 'Documentação e OpenAPI',
    blocks: [
      { text: '"Ver documentação", no menu da coleção, abre os endpoints com parâmetros, corpo, respostas e autorização, e permite testar cada um.' },
      { text: '"Exportar OpenAPI" gera um arquivo 3.0 para compartilhar. Valores de autorização não são incluídos, e campos JSON com nome sensível saem como ***.' },
    ],
  },
  {
    id: 'scanner',
    title: 'Scanner de APIs',
    blocks: [
      { text: 'Em Janela → APIs (scanner), escolha a pasta de um projeto para descobrir as rotas no código. Os endpoints encontrados viram requisições em uma coleção com o nome da pasta.' },
    ],
  },
  {
    id: 'importar',
    title: 'Importar',
    blocks: [
      { text: 'As importações ficam no menu Arquivo:' },
      { items: [
        'OpenAPI / Swagger: por arquivo, texto ou URL.',
        'cURL: cria uma requisição nova.',
        'Postman v2.0/v2.1 e Insomnia formato 4: mantêm pastas, autorização e scripts de requisição. Variáveis criam um novo ambiente.',
        'O que não for suportado gera um aviso no Console.',
      ] },
    ],
  },
  {
    id: 'exportar',
    title: 'Exportar e backup',
    blocks: [
      { text: '"Exportar para Postman", no menu da coleção, gera uma Collection v2.1. Tokens, senhas e campos com nome sensível saem em branco, e {{variáveis}} são mantidas. Scripts saem como estão. Exemplos e ambientes não são exportados.' },
      { text: 'Em Arquivo, "Fazer backup" salva coleções, pastas, ambientes, histórico e abas em um JSON. Esse arquivo contém tokens e senhas em texto puro.' },
      { text: '"Restaurar backup…" substitui tudo depois da confirmação. O app baixa uma cópia dos dados atuais antes; confira se ela foi salva.' },
    ],
  },
  {
    id: 'codigo',
    title: 'cURL e geração de código',
    blocks: [
      { text: '"Copiar como cURL" e "Gerar código…" estão no menu Editar e no menu da requisição. O resultado já sai com URL base, autorização e variáveis aplicadas, exceto as secretas.' },
    ],
  },
  {
    id: 'busca',
    title: 'Busca global',
    blocks: [
      { text: 'Ctrl+K encontra requisições, pastas, coleções, ambientes e comandos dos menus. Use ↑ e ↓ para navegar e Enter para abrir.' },
      { text: 'Requisições também são encontradas por método, URL, local e corpo. Várias palavras podem ser combinadas, como "post pedido".' },
    ],
  },
  {
    id: 'aparencia',
    title: 'Aparência e temas',
    blocks: [
      { text: 'Em Visualizar → Tema…, clique em um tema para ver a prévia e use Aplicar para manter. Cancelar volta ao tema anterior.' },
      { items: [
        'Os temas ficam separados em escuros, claros e importados.',
        'A cor de destaque personaliza botões, abas ativas e foco em qualquer tema.',
        '"Exportar tema" e "Importar tema…" usam um arquivo JSON só com cores em #rrggbb.',
      ] },
    ],
  },
  {
    id: 'atalhos',
    title: 'Atalhos de teclado',
    blocks: [
      { items: [
        'F1: abre este guia.',
        'Ctrl+K: busca global.',
        'Ctrl+T: nova requisição.',
        'Ctrl+W: fecha a aba ativa.',
        'Ctrl+Tab / Ctrl+Shift+Tab (ou Ctrl+PageDown / Ctrl+PageUp): próxima / aba anterior.',
        'Ctrl+1 a Ctrl+8: vai para a aba na posição; Ctrl+9: última aba.',
        'Setas ←/→, Home e End na barra de abas: navegam entre as abas; Delete fecha a aba focada.',
        'Arraste as abas de requisição para reordenar; clique do meio fecha; duplo clique na área vazia cria uma nova.',
        'Ctrl+Enter: envia a requisição.',
        'F2: renomeia a requisição selecionada na barra lateral.',
        'Esc: fecha janelas.',
      ] },
    ],
  },
  {
    id: 'limites',
    title: 'Limitações atuais',
    blocks: [
      { items: [
        'Os cabeçalhos da resposta não ficam disponíveis; o tipo do conteúdo é deduzido do corpo.',
        'Requisições em andamento não podem ser canceladas.',
        'Corpo multipart e respostas binárias não são suportados.',
        'Timeout, TLS e proxy não são configuráveis.',
        'Segredos ficam em texto puro no disco.',
      ] },
    ],
  },
];

function topicText(topic: HelpTopic): string {
  const parts = topic.blocks.flatMap((block) => ('text' in block ? [block.text] : 'items' in block ? block.items : [block.code]));
  return normalize([topic.title, ...parts].join(' '));
}

export function filterHelpTopics(topics: HelpTopic[], term: string): HelpTopic[] {
  const tokens = normalize(term).split(/\s+/).filter(Boolean);
  return topics.filter((topic) => {
    const text = topicText(topic);
    return tokens.every((token) => text.includes(token));
  });
}
