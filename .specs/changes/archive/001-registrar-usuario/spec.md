# 001-registrar-usuario

## Objetivo

Entregar o fluxo completo de **registrar usuário** com um módulo `auth` com persistência via Prisma e criptografia de senha com bcrypt.

## Contexto técnico

### Backend

- módulo `auth`
- persistência via prisma com criptografia de senha via `bcrypt`
- endpoint de registro de usuário
- endpoint de login retornando token do usuário autenticado
- constantes de mensagens de erro definidas para insucesso de login ou problema durante o registro do usuário.

## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

- [x] Criar o módulo `auth` com a skill [new-backend-module](../../../.claude/skills/new-backend-module).
  > ✅ 2026-09-20 23:40 — `node .claude/skills/new-backend-module/generate.mjs auth` gerou `src/modules/auth/` (route, validator, service, repository, constants, test) e registrou `/api/v1/auth` em `src/routes/index.js`. A rota GET default do template foi substituída pelas rotas da spec. Desvio: adicionado `auth.middleware.js` no módulo (validação do JWT), fora do que a skill gera.
- [x] Criar um novo model e configurar no prisma com a skill [new-prisma-model](../../../.claude/skills/new-prisma-model).
  > ✅ 2026-09-20 23:40 — `generate.mjs User "name:String email:String:unique password:String active:Boolean=true"` adicionou o model `User` (tabela `user`, id uuid, `created_at`/`updated_at`) ao `prisma/schema.prisma`; `prisma format` e `prisma generate` ok. ⚠️ A migration **não** foi aplicada (saída 2, `P1010`): `DB_USER`/`DB_PASSWORD`/`DB_NAME` estão vazios no `.env`. Depois de preencher, rodar `npx prisma migrate dev --name create_user`.
- [x] O módulo `auth` deve ter rotas de login, registro e alteração de usuário.
  > ✅ 2026-09-20 23:42 — `POST /api/v1/auth/register` (201; senha com hash `bcrypt`, 10 rounds; 409 se o email já existe), `POST /api/v1/auth/login` (200 com `{ tokenType: "Bearer", token, user }`, JWT via `jsonwebtoken`; 401 credenciais inválidas; 403 usuário inativo), `PATCH /api/v1/auth/users/:id` (exige `Authorization: Bearer <token>`; só o próprio usuário altera `name`/`email`/`password`; 403/404/409). Nenhuma resposta retorna o hash da senha. Mensagens de erro/sucesso em `auth.constants.js` (`REGISTER_FAILED`, `LOGIN_FAILED`, `INVALID_CREDENTIALS` etc.). Novas deps: `bcrypt`, `jsonwebtoken`. Novas variáveis `JWT_SECRET` (gerada no `.env`, vazia no `.env.example`) e `JWT_EXPIRES_IN=1h`.
- [x] O módulo deve também ter testes unitários cobrindo 100% dos cenários.
  > ✅ 2026-09-20 23:43 — `src/modules/auth/auth.test.js` (41 testes, Prisma e Logger mockados, bcrypt/JWT reais): sucesso, validações, conflito (inclusive o `P2002` do Prisma), falhas inesperadas, token ausente/malformado/expirado/com assinatura errada e `JWT_SECRET` ausente. `npm test -- --collectCoverageFrom='src/modules/auth/**/*.js'` → 42/42 passando, 100% de statements/branches/functions/lines em todos os arquivos do módulo.
- [x] Toda nomenclatura das rotas e todo o código deve estar em inglês.
  > ✅ 2026-09-20 23:43 — rotas (`register`, `login`, `users/:id`), identificadores, mensagens das constantes e descrições dos testes estão em inglês. Os nomes do model/campos no Prisma também estão em inglês. Os comentários do código também estão em inglês.