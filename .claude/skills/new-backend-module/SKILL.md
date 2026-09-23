---
name: new-backend-module
description: Cria (gera/scaffold) um novo módulo de negócio no backend Express + Prisma, com route, service, repository, validator, constants e teste juntos em src/modules/<modulo>/, e registra a rota em src/routes/index.js. Use ao pedir "novo módulo", "criar módulo", "gerar módulo backend", "adicionar recurso/endpoint novo", "scaffold de módulo", "new-backend-module".
---

# new-backend-module

Gera um módulo no padrão do `transactions-service` (route → validator + `validate`
→ service com `http-errors` → repository com Prisma), mas **modularizado**: todos
os arquivos do módulo ficam juntos em `src/modules/<modulo>/`, em vez de espalhados
em `routes/`, `services/`, `repositories/`, `validators/`. Os templates estão
embutidos em `generate.mjs` (ao lado deste arquivo) — não é preciso abrir o projeto
de referência.

Caminhos abaixo são relativos à raiz do projeto backend.

## Gerar (caminho do agente)

Rode da raiz do projeto (onde fica o `package.json`):

```bash
node .claude/skills/new-backend-module/generate.mjs <nome-do-modulo>
```

O nome aceita qualquer formato e vira kebab-case: `"User Profiles"`,
`UserProfiles`, `user_profiles` → `user-profiles`; acentos são removidos
(`ContasBancárias` → `contas-bancarias`).

Flags: `--dir <raiz-do-projeto>` (quando não estiver na raiz), `--force`
(sobrescreve os arquivos de um módulo existente; não duplica o registro da rota).

## O que é gerado

```
src/modules/<modulo>/
  <modulo>.route.js        GET /  -> ...Validator.defaultValidation(), validate, Service.execute(req.query)
  <modulo>.validator.js    classe com static defaultValidation(): query('message') opcional, string 1..255
  <modulo>.service.js      classe; usa o Repository; Logger; erros via http-errors
  <modulo>.repository.js   classe; importa prisma de ../../services/prisma.service.js; isDatabaseAlive()
  <modulo>.constants.js    <Pascal>Constants.MESSAGES.SUCCESS/ERROR do módulo
  <modulo>.test.js         jest + supertest(app): 200 default, 200 com message, 400 inválido
src/routes/index.js        + import <camel>Route from '../modules/<modulo>/<modulo>.route.js';
                           + router.use(`${baseRoute}/<modulo>`, <camel>Route);  (após o último router.use)
```

Rota default resultante: `GET /api/v1/<modulo>` →
`{"module":"<modulo>","message":"Módulo <modulo> respondendo.","isDatabaseAlive":false}`.

## Verificar o módulo gerado

Suba o servidor e chame a rota (porta do `.env`, padrão 3000):

```bash
node src/server.js &
curl -s localhost:3000/api/v1/<modulo>
curl -s "localhost:3000/api/v1/<modulo>?message=teste"
npm test
```

Saídas verificadas (módulo `pedidos`):
- `GET /api/v1/pedidos?message=teste` → `200 {"module":"pedidos","message":"teste","isDatabaseAlive":false}`
- `message` com 256 chars → `400 {"errors":["O parâmetro 'message' deve ser um texto de até 255 caracteres."]}`
- `npm test` → todas as suítes passam (o teste do módulo mocka o Prisma, não precisa de banco).

Pare o servidor pela porta, **nunca** com `taskkill /IM node.exe`:
`Get-NetTCPConnection -LocalPort 3000 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`

## Evoluindo o módulo

- Crie o model em `prisma/schema.prisma` e rode `npm run prisma:migrate -- --name <modulo>`.
- Adicione os métodos no repository (há um exemplo comentado `prisma.<camel>.findMany()`).
- Novas regras de validação: novos métodos estáticos no validator
  (`createValidation()`, `updateValidation()`), usando `body(...)` como no original.
- Novas mensagens vão no `<modulo>.constants.js` do próprio módulo, não no `utils/constants.util.js` global.

## Gotchas

- O gerador **exige** `src/routes/index.js`, `src/services/prisma.service.js`,
  `src/services/logger.service.js` e `src/middlewares/validate.middleware.js`
  (estrutura criada pela skill `new-backend-project`). Se faltar algum, ele aborta sem escrever nada.
- O `<modulo>.test.js` fica dentro de `src/modules/`, não em `test/unit/`; o
  `testMatch` do `jest.config.mjs` (`**/?(*.)+(spec|test).js`) já o encontra.
- Mocks de ESM precisam de `jest.unstable_mockModule` + `await import(...)` antes de
  importar o `app` — `jest.mock` (usado no projeto original) não funciona com `"type": "module"`.
- `isDatabaseAlive: false` é esperado enquanto o `.env` não tiver credenciais válidas de banco;
  a rota responde 200 mesmo assim.
- O registro na rota preserva o final de linha do arquivo (LF/CRLF) e é idempotente.

## Troubleshooting

- `src/modules/<modulo> já existe. Use --force` → o módulo já foi gerado; `--force` reescreve os 6 arquivos (perde edições).
- `sem package.json em <pasta>` → você não está na raiz do projeto; use `--dir <raiz>`.
