# 012-evolucao-arquitetura

## Objetivo

Levar para o BR Data Hub os padrões de arquitetura que valem a pena do `projeto-arquitetura` (Value Objects, pacote compartilhado entre front e back, contratos comuns de paginação e erro), sem trocar a stack atual (Express 5 + Prisma 6 + Next em JavaScript).

## Contexto técnico

Origem: análise comparativa entre o BR Data Hub v2 e o `projeto-arquitetura` (Turborepo + NestJS + TS), publicada em https://claude.ai/artifact/XQmNGrqrzKXp4HVzRNE3K2. O roteiro desta spec é a seção "Roteiro" dessa análise.

Problemas que esta mudança resolve:

- Regras de domínio presas na camada HTTP: formato de CEP, formato e dígito verificador do CNPJ (inclusive alfanumérico) e UF só existem como cadeias do express-validator em `cep.validator.js` e `cnpj.validator.js`.
- O frontend copia contratos do backend à mão: `frontend/src/modules/dashboard/config/record-resources.config.js` "espelha os UPDATABLE_FIELDS do backend" (12 campos de CEP e 44 de CNPJ).
- `GET /cep` e `GET /cnpj` devolvem a tabela inteira (`findMany` sem `skip`/`take`).
- A API tem dois formatos de erro: `{ status, error }` no handler global (`src/app.js`) e `{ errors: [...] }` em `validate.middleware.js`.
- `AuthService` instancia `AuthRepository` e `EmailService` fixos, ao contrário de Cep, Cnpj e Job, que recebem as dependências no construtor.
- `.specs/memory/` está vazia, mas os templates apontam para arquivos dentro dela, e `.specs/templates/modelo-crud.md` descreve NestJS/TS com skills que não existem neste repositório.
- A pasta do projeto não é um repositório git.
- O PostgreSQL não está no `docker-compose.yml` (só o Redis).

### Decisões já tomadas

- **Sem migração de stack.** Continua Express 5, Prisma 6, Next 16 e JavaScript ESM. Nada de NestJS nem TypeScript completo.
- **Não copiar da referência:** monkey-patch em `String.prototype`, endpoint único `POST` para criar e atualizar, guard de autenticação decorativo e fallback de segredo (`JWT_SECRET` padrão). O `POST` + `PATCH` atual e a allowlist de rotas públicas em `routes/index.js` continuam.
- **Pacote compartilhado:** `packages/shared`, nome `@br-data-hub/shared`, JavaScript ESM, sem dependência de Express, Prisma, React ou Next. Deve rodar no Node (backend e workers) e no navegador (frontend).
- **VOs no padrão `create`/`tryCreate`:** `tryCreate(valor)` retorna um `Result` (nunca lança); `create(valor)` lança se falhar. O valor fica normalizado (ex.: CEP com 8 dígitos, CNPJ sem máscara e em maiúsculas, UF em maiúsculas).
- **Códigos de erro estáveis:** cada falha tem um `code` em `UPPER_SNAKE_CASE` (ex.: `INVALID_CEP`, `CEP_NOT_FOUND`), reaproveitando o nome das chaves que já existem em `*.constants.js` (`MESSAGES.ERROR.*`).
- **Envelope de erro único da API:** `{ status, code, message, details? }`. `details` é opcional e, na validação, traz a lista `[{ field, code, message }]`.
- **Contrato de paginação:** query `page` (padrão 1) e `pageSize` (padrão 10, máximo 50). Valores inválidos são normalizados, não rejeitados. Resposta: `{ message, data: [...], meta: { page, pageSize, total, totalPages } }`.
- **Mudança de contrato sem nova versão:** o único consumidor da API é o nosso frontend, atualizado nesta mesma spec. Por isso as rotas continuam em `/api/v1`.
- **Tipagem:** só `checkJs` + JSDoc dentro de `packages/shared`. Migrar o resto para TS fica fora desta spec.

### Monorepo

- Raiz com `"workspaces": ["backend", "frontend", "packages/*"]`, um único `npm install` e um único `package-lock.json` na raiz. Os `package-lock.json` de `backend/` e `frontend/` deixam de existir.
- Os scripts atuais da raiz (`dev`, `dev:backend`, `dev:frontend`) continuam funcionando.
- O `postinstall` do backend (`prisma generate`) precisa continuar rodando no install da raiz.
- Ponto de atenção: o Next pode precisar de `transpilePackages: ['@br-data-hub/shared']` em `next.config.mjs`, e o Jest do backend (babel-jest) e o do frontend precisam resolver o pacote do workspace.

### Backend

- Validators do express-validator passam a delegar para os VOs (ex.: `.custom(valor => Cnpj.tryCreate(valor).isOk)` + sanitização com o valor normalizado do VO), mantendo as mesmas mensagens.
- `UPDATABLE_FIELDS` de CEP e CNPJ passam a ser exportados pelo `@br-data-hub/shared`, e os `*.constants.js` do backend reexportam de lá.
- Repositories de CEP e CNPJ ganham listagem paginada (`findPage({ page, pageSize })` com `count` + `findMany` na mesma transação).

### Frontend

- Formulário de cadastro de CEP e CNPJ valida com os mesmos VOs antes de chamar a API.
- `record-resources.config.js` importa as listas de campos editáveis do shared em vez de copiá-las.
- Os widgets de tabela do dashboard passam a paginar pela API, usando o `pagination.component.jsx` que já existe.
- `api-client.factory.js` lê o novo envelope de erro (`message`, `code` e `details`).

### Testes

- Os thresholds de cobertura atuais (100% nos módulos do backend e nos arquivos cobertos do front) continuam valendo. `packages/shared` também entra com 100%.
- Os testes existentes dos validators de CEP e CNPJ são a garantia de paridade: devem continuar passando sem mudar o comportamento, a não ser pelo formato do corpo de erro.

## Referências de Projeto

- [Produto](../../memory/produto.md)
- [Contexto técnico global](../../memory/contexto-tecnico.md)
- [Estrutura do projeto](../../memory/estrutura.md)

## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Observações Locais

- As referências de projeto acima só vão existir depois da primeira task do grupo "Base". Até lá, os links estão quebrados de propósito.
- Os grupos devem ser executados **na ordem em que aparecem**: cada grupo prepara o seguinte (Base → Monorepo → Negócio → Backend → Frontend → Infra e higiene → Tipagem → Validação final).
- Não configurar remote nem fazer push do git: só `git init` e o commit inicial local.
- Sem testes no navegador do Claude. A validação da UI é manual, feita pelo usuário.

## Tasks

### Tasks - Base (versionamento e specs)

- [ ] Inicializar o repositório git na raiz do projeto (`git init`) e fazer o commit inicial com o estado atual, antes de qualquer outra alteração. Conferir antes que o `.gitignore` da raiz cobre `node_modules/`, `.env`, `backend/logs/*.log` e `coverage/`. Não configurar remote nem fazer push.
- [ ] Preencher `.specs/memory/` com `produto.md` (o que é o BR Data Hub, para quem, funcionalidades), `contexto-tecnico.md` (stack, portas, infraestrutura, padrões de erro, autenticação, fila e rate limit) e `estrutura.md` (árvore de pastas e responsabilidade de cada camada), incluindo os padrões novos desta spec (shared, VOs, envelope de erro, paginação).
- [ ] Reescrever `.specs/templates/modelo-crud.md` para a arquitetura real (Express + Prisma + Next em JS, módulos em `backend/src/modules/<modulo>/`, VOs em `packages/shared`), citando só as skills que existem no projeto (`new-backend-module`, `new-prisma-model`) e removendo as referências a NestJS, `apps/backend`, `.tsx` e às skills da referência. Corrigir os links de `modelo-base.md` para `../../memory/`.

### Tasks - Monorepo

- [ ] Converter a raiz em npm workspaces (`backend`, `frontend`, `packages/*`), com um único `package-lock.json` na raiz. Remover os locks de `backend/` e `frontend/`, mantendo os scripts `dev`, `dev:backend` e `dev:frontend` e o `postinstall` do Prisma funcionando.
- [ ] Criar `packages/shared` (`@br-data-hub/shared`), ESM, com `package.json` (`exports`), `src/index.js`, Jest e cobertura de 100%. Adicionar como dependência do backend e do frontend e garantir que os dois importam o pacote (incluindo `transpilePackages` no Next e a resolução no Jest de cada app, se necessário).

### Tasks - Negócio (packages/shared)

- [ ] Criar a base do domínio: `Result` (`ok`, `fail`, `combine`, `isOk`, `isFailure`, `errors`), a classe base `ValueObject` (`value`, `equals`) e o helper `optional(valor, VO)`. Sem alterar protótipos globais.
- [ ] Criar os VOs `Cep`, `Cnpj` e `Uf` no padrão `create`/`tryCreate`, movendo para eles a regra que hoje está em `cep.validator.js` e `cnpj.validator.js` (formato com e sem máscara, normalização, dígito verificador do CNPJ inclusive alfanumérico), com os códigos `INVALID_CEP`, `INVALID_CNPJ` e `INVALID_UF`.
- [ ] Criar os VOs `Email` e `Password`, com a mesma regra usada hoje em `auth.validator.js` e em `frontend/src/utils/validate-email.util.js` / `validate-password.util.js`.
- [ ] Exportar do shared as constantes de contrato compartilhadas: `CEP_UPDATABLE_FIELDS`, `CNPJ_UPDATABLE_FIELDS`, os status de enriquecimento (`pending`, `processing`, `completed`, `failed`) e os limites de paginação (`DEFAULT_PAGE_SIZE = 10`, `MAX_PAGE_SIZE = 50`).
- [ ] Cobrir todo o `packages/shared` com testes unitários (casos válidos, inválidos, normalização, `create` lançando, `tryCreate` sem lançar), com 100% de cobertura.

### Tasks - Back-end

- [ ] Fazer os validators de `cep`, `cnpj` e `auth` delegarem para os VOs do shared, sem mudar as regras aceitas nem as mensagens. Os testes atuais dos validators devem continuar passando.
- [ ] Trocar as listas `UPDATABLE_FIELDS` e os status de enriquecimento dos `*.constants.js` e de `utils/constants.util.js` por reexports do shared.
- [ ] Padronizar o envelope de erro da API em `{ status, code, message, details? }`: ajustar o handler global de `src/app.js` e o `validate.middleware.js` (validação → 400 com `code: "VALIDATION_ERROR"` e `details: [{ field, code, message }]`), e fazer os services lançarem erros com `code` derivado da chave em `MESSAGES.ERROR`. Erros 500 não podem expor mensagem interna.
- [ ] Paginar `GET /api/v1/cep` e `GET /api/v1/cnpj` com `page` e `pageSize` (padrão 10, máximo 50, valores inválidos normalizados), respondendo `{ message, data, meta: { page, pageSize, total, totalPages } }`, ordenado do mais novo para o mais antigo. Adicionar `findPage` nos repositories (`count` + `findMany` numa transação).
- [ ] Fazer o `AuthService` receber `repository` e `emailService` pelo construtor com default, no mesmo padrão de `CepService`, e ajustar os testes para injetar dublês em vez de mockar módulos quando isso simplificar.
- [ ] Atualizar os testes unitários, de integração (`*.test.js` dos módulos) e E2E (`test/e2e`) para o novo envelope de erro e para a listagem paginada, mantendo a cobertura de 100% dos módulos.

### Tasks - Front-end

- [ ] Atualizar `config/api-client.factory.js` para o novo envelope de erro: mensagem a partir de `message` e acesso a `code`/`details`, mantendo o logout automático no 401 e a mensagem de erro de rede.
- [ ] Trocar os `editableFields` copiados em `modules/dashboard/config/record-resources.config.js` por imports de `CEP_UPDATABLE_FIELDS`/`CNPJ_UPDATABLE_FIELDS` do shared.
- [ ] Validar CEP e CNPJ na modal de cadastro (`create-record-modal.component.jsx`) com os VOs do shared antes de chamar a API, exibindo o erro no campo.
- [ ] Trocar `utils/validate-email.util.js` e `utils/validate-password.util.js` pelos VOs `Email` e `Password` do shared nos formulários de auth, removendo os utilitários que ficarem sem uso (e seus specs).
- [ ] Paginar os widgets de tabela do dashboard (`record-table-widget.component.jsx`) pela API com o contrato novo (`data`/`meta`), usando o `components/ui/table/pagination.component.jsx`. Ao excluir o último item de uma página maior que 1, voltar uma página.
- [ ] Atualizar os specs do frontend afetados, mantendo os thresholds de cobertura atuais e o `npm run lint` sem erros.

### Tasks - Infra e higiene

- [ ] Adicionar o serviço `postgres` (`postgres:16-alpine`, volume nomeado, healthcheck `pg_isready`, variáveis do `.env`) ao `backend/docker-compose.yml`, para que `docker compose up -d` suba Postgres e Redis. Atualizar o `README.md` (passo de instalação e comandos de parar/retomar), mantendo o `docker run` como alternativa.
- [ ] Remover as pastas vazias `backend/src/repositories/` e `backend/src/validators/`, e remover o comentário/scaffold que as cria, se existir, em `.claude/skills/new-backend-project`.
- [ ] Tirar do roteamento as páginas de demo do TailAdmin (`app/(private)/(elements)/*` e `app/(private)/data-tables`, com seus módulos em `modules/elements` e `modules/data-tables` e os mocks usados só por elas), mantendo os componentes de UI reaproveitados pelo produto.
- [ ] Avaliar a troca do cookie de sessão legível por JS (`session.store.js`) por um cookie `HttpOnly` emitido pelo backend. Registrar na evidência a análise (impacto no `proxy.js`, CORS com `credentials`, logout, "manter conectado") e a recomendação. **Não implementar** sem aprovação do usuário.
- [ ] Atualizar o `README.md` (instalação com um único `npm install`, estrutura de pastas com `packages/shared`, formato de erro e paginação na seção API) e a URL/árvore que ainda apontam para `br-data-hub` v1, se o usuário confirmar o nome do repositório.

### Tasks - Tipagem

- [ ] Habilitar `checkJs` em `packages/shared` (`jsconfig.json` ou `tsconfig.json` com `allowJs` + `checkJs` + `noEmit`), documentar os VOs, o `Result` e as constantes com JSDoc (`@template`, `@param`, `@returns`) e adicionar o script `check-types` ao pacote, sem erros.

### Tasks - Validação final

- [ ] Rodar do zero, na raiz: `npm install`, `docker compose -f backend/docker-compose.yml up -d`, `npm run prisma:deploy --prefix backend`, os testes (`npm test` no backend, no frontend e no shared), `npm run test:e2e --prefix backend`, `npm run lint --prefix frontend` e `npm run build --prefix frontend`. Registrar a contagem de testes e a cobertura de cada um.
- [ ] Subir o projeto com `npm run dev` e conferir, via chamadas HTTP, o envelope de erro (validação, 401, 404) e a paginação de `/cep` e `/cnpj`. Registrar as respostas na evidência. A validação visual do dashboard fica com o usuário.
- [ ] Commit local ao final de cada grupo de tasks, com mensagem descritiva (sem push).

## Resultado Esperado

- Um único `npm install` na raiz instala backend, frontend e `@br-data-hub/shared`.
- As regras de CEP, CNPJ, UF, e-mail e senha existem em um só lugar (VOs do shared) e são usadas pelo backend e pelo frontend.
- O frontend não tem mais listas de campos copiadas do backend.
- `GET /cep` e `GET /cnpj` são paginados com `{ data, meta }`, e o dashboard pagina pela API.
- Todo erro da API tem o formato `{ status, code, message, details? }`.
- `AuthService` segue o mesmo padrão de injeção de dependência dos outros services.
- `docker compose up -d` sobe Postgres e Redis.
- `.specs/memory/` preenchida e templates alinhados com a arquitetura real.
- O projeto está versionado em git localmente.
- Todos os testes passam, com a cobertura atual mantida e 100% no shared.

## Encerramento

Esta spec termina apenas quando todos os itens estiverem marcados e com evidência registrada, no formato definido em [Como executar](../../shared/como-executar.md).
