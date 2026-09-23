---
name: new-backend-project
description: Cria (scaffold) um novo projeto backend Node.js/Express 5 + Prisma 6 (PostgreSQL) + Jest no diretório atual, com a estrutura de pastas e configs do transactions-service (sem módulos de negócio). Use ao pedir "novo backend", "criar projeto backend", "gerar backend express", "scaffold backend com prisma", "new-backend-project".
---

# new-backend-project

Gera um backend pronto para rodar com a estrutura aprendida de
`C:\projects\finantial-manager\transactions-service` — **não é preciso consultar
aquela pasta**: todos os templates estão embutidos em `scaffold.mjs` (ao lado
deste arquivo). Nenhum módulo de negócio (transactions, auth, rabbitmq...) é
copiado; só estrutura, configs e infraestrutura (Express, Prisma, logger, testes).

O nome do projeto no `package.json` é o **nome da pasta onde o script roda**
(slugificado: `Meu Backend Teste` → `meu-backend-teste`).

## Gerar (caminho do agente)

Rode a partir da pasta que será a raiz do novo projeto:

```bash
node <caminho-desta-skill>/scaffold.mjs
```

Nesta máquina: `node C:/projects/br-data-hub-v2/.claude/skills/new-backend-project/scaffold.mjs`

Flags: `--dir <pasta>` (destino ≠ cwd; o nome vem dessa pasta), `--skip-install`
(só escreve arquivos), `--force` (sobrescreve se já houver `package.json`; o
`.env` existente nunca é sobrescrito).

O script escreve os arquivos e roda `npm install` (o `postinstall` roda
`prisma generate`). Leva ~4 min na primeira vez.

## Estrutura gerada

```
package.json          name = pasta atual; type=module; scripts start, start:dev (nodemon),
                      test, test:file, prisma:generate|migrate|deploy|studio, postinstall
.env / .env.example   PORT, ENVIRONMENT, DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME,
                      DATABASE_URL (montada via ${VAR}), DATE_FORMAT, LOGS_PATH, CORS_ORIGIN_ALLOWED
.gitignore .dockerignore Dockerfile (node:20-alpine)
babel.config.cjs jest.config.mjs
prisma/schema.prisma  generator prisma-client-js (binaryTargets native + linux-musl) + datasource postgresql, sem models
logs/  __mocks__/
src/app.js            express + cookie-parser + cors (CORS_ORIGIN_ALLOWED) + json + handler de erro {status,error}
src/server.js         app.listen(PORT)
src/config/env.js     dotenv + expansão de ${VAR}
src/routes/index.js   prefixo /api/v1 ; status.route.js -> GET /api/v1/status
src/services/         prisma.service.js (PrismaClient singleton), status.service.js, logger.service.js (winston)
src/middlewares/validate.middleware.js (express-validator -> 400 {errors})
src/utils/constants.util.js   src/repositories/  src/validators/
test/unit/status.service.test.js (ESM + jest.unstable_mockModule)
```

Padrão para novos recursos (herdado do original): `routes/<x>.route.js` →
`services/<x>.service.js` (classe, lança `http-errors`) → `repositories/<x>.repository.js`
(importa `prisma` de `services/prisma.service.js`), validação em
`validators/<x>.validator.js` (classe com método estático que retorna array de
`body(...)`) + `validate` middleware; registrar a rota em `routes/index.js`.

## Depois de gerar — único passo manual

Preencher no `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
Não mexer em `DATABASE_URL`. Depois:

```bash
npx prisma validate
npx prisma migrate status
npm run prisma:migrate -- --name init
```

(`migrate` só depois de adicionar models em `prisma/schema.prisma`.)

## Verificar o projeto gerado

```bash
node src/server.js &
curl -s localhost:3000/api/v1/status
npm test
```

Saída verificada: `{"projectName":"meu-backend-teste","projectVersion":"1.0.0","environment":"development","nodeVersion":"v22.12.0","isDatabaseAlive":false}`
— `isDatabaseAlive` vira `true` quando as credenciais do `.env` são válidas.
Pare o servidor pelo PID/porta (ex.: `Get-NetTCPConnection -LocalPort 3000 -State Listen | % { Stop-Process -Id $_.OwningProcess }`), **nunca** `taskkill /IM node.exe` (mata todos os node da máquina).

## Gotchas

- **Prisma fixado em 6.x** (igual ao original). Prisma 7/8 removeu `url = env(...)`
  do `schema.prisma` e exige `prisma.config.ts` + driver adapter — não atualize sem migrar isso.
- **`DATABASE_URL` com `${DB_USER}`**: o Prisma CLI expande sozinho, mas `dotenv`
  em runtime não. Por isso `src/app.js` importa `./config/env.js` primeiro, que faz
  a expansão. Qualquer entrypoint novo (scripts, seeds) deve importar esse arquivo antes do Prisma.
- `dotenv-expand` não é usado de propósito (o npm mostra a versão `1000.0.0`, suspeita).
- Senha com caracteres especiais (`@`, `:`, `/`, `#`) precisa ser URL-encoded em `DB_PASSWORD`.
- `npm test` usa `--experimental-vm-modules`; mocks de módulos ESM precisam de
  `jest.unstable_mockModule` + `await import(...)` (ver o teste gerado), não `jest.mock`.
- `app.js` não chama `listen` (diferente do original) para permitir `supertest(app)`; o servidor sobe por `src/server.js`.
- `prisma generate` sem models só avisa, não falha.

## Troubleshooting

- `já tem package.json. Use --force` → o destino já é um projeto; use outra pasta ou `--force`.
- `P1000: Authentication failed ... credentials for \`app\`` → a URL foi montada certo,
  mas usuário/senha do `.env` estão errados.
