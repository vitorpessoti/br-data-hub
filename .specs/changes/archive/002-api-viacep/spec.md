# 002-api-viacep

## Objetivo

Entregar o fluxo completo de **enriquecimento de dados de CEP** com um módulo `cep` com busca na API da ViaCEP e persistência de dados via Prisma.

## Contexto técnico

### Backend

- módulo `cep`
- acesso à API ViaCEP (viacep.com.br)
- dados sempre em JSON
- persistência via prisma
- endpoint de recebimento de um CEP no body que será usado para buscar os dados completos na ViaCEP
- endpoint de busca na base de dados para retornar os dados existentes para aquele CEP
- endpoint de atualização dos dados na base via Prisma
- endpoint de exclusão dos dados da base via Prisma
- constantes de mensagens de erro definidas para insucesso na busca na API externa; para erros na persistência dos dados; para erros na busca de dados do CEP na base

## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

- [x] Criar o módulo `cep` com a skill [new-backend-module](../../../.claude/skills/new-backend-module).
  > ✅ 2026-09-21 10:54 — `node .claude/skills/new-backend-module/generate.mjs cep` gerou `src/modules/cep/` (route, validator, service, repository, constants, test) e registrou `/api/v1/cep` em `src/routes/index.js`. A rota GET default do template foi substituída pelas rotas da spec. Desvio: adicionado `viacep.service.js` no módulo (cliente HTTP da ViaCEP via `fetch` nativo, timeout com `AbortSignal.timeout`), fora do que a skill gera. Novas variáveis opcionais `VIACEP_BASE_URL` e `VIACEP_TIMEOUT_MS` (`.env` e `.env.example`).
- [x] Criar um novo model e configurar no prisma com a skill [new-prisma-model](../../../.claude/skills/new-prisma-model). Os campos utilizados serão: `cep`, `street` (logradouro), `complement` (complemento), `unit` (unidade), `neighborhood` (bairro), `city` (localidade), `uf`, `state` (estado), `region` (regiao), `ibgeCode` (ibge), `giaCode` (gia), `ddd`, `siafiCode` (siafiCode). Em parênteses, são os nomes dos campos no retorno da API.
  > ✅ 2026-09-21 10:54 — `generate.mjs Cep "cep:String(8):unique street:String? complement:String? unit:String? neighborhood:String? city:String uf:String(2) state:String? region:String? ibgeCode:String(7)? giaCode:String? ddd:String(2)? siafiCode:String?"` adicionou o model `Cep` (tabela `cep`, id uuid, `cep` único com 8 dígitos sem hífen, colunas `ibge_code`/`gia_code`/`siafi_code`, `created_at`/`updated_at`). Migration `20260921134851_create_cep` aplicada no banco e Prisma Client gerado. Decisão: só `cep`, `city` e `uf` são obrigatórios (a ViaCEP devolve `""` nos demais, que são gravados como `null`). Desvio: a API real devolve `siafi` (não `siafiCode`); o mapeamento lê `siafi` com fallback para `siafiCode`.
- [x] O módulo `cep` deve ter rotas de busca na API ViaCEP, passando o CEP recebido via body; busca na base de dados via Prisma para obter os dados do CEP informado via path param; atualização de dados de um CEP via Prisma para o CEP informado via path param; exclusão de um CEP informado via path param (CRUD completo).
  > ✅ 2026-09-21 10:54 — `POST /api/v1/cep` body `{ "cep" }` busca na ViaCEP e grava (201) ou atualiza o registro existente com os dados frescos (200); `GET /api/v1/cep/:cep` (200/404); `PATCH /api/v1/cep/:cep` atualização parcial dos 12 campos de endereço, campos opcionais aceitam `null` (200/404); `DELETE /api/v1/cep/:cep` retorna o registro removido (200/404). CEP aceito como `00000000` ou `00000-000` (normalizado para 8 dígitos). Erros: ViaCEP sem o CEP → 404 `VIACEP_CEP_NOT_FOUND`; ViaCEP fora/resposta inválida → 502 `VIACEP_REQUEST_FAILED`; timeout → 504 `VIACEP_TIMEOUT`; persistência → 500 `SAVE_FAILED`/`UPDATE_FAILED`/`DELETE_FAILED`; busca na base → 404 `CEP_NOT_FOUND` / 500 `FETCH_FAILED`. Todas as mensagens em `cep.constants.js`.
- [x] O módulo deve também ter testes unitários, testes de integração e E2E cobrindo 100% dos cenários.
  > ✅ 2026-09-21 10:54 — Unitários em `test/unit/cep/` (`viacep.service`, `cep.service`, `cep.repository`; `fetch`/Prisma/Logger mockados); integração em `src/modules/cep/cep.test.js` (supertest → validator → service → repository, Prisma e `fetch` mockados, todas as validações e erros); E2E em `test/e2e/cep.e2e.test.js` (banco real + ViaCEP real: ciclo completo POST→GET→PATCH→POST (refresh)→DELETE, 404s, CEP inexistente na ViaCEP, CEP inválido). `npm test` → 135/135, 100% statements/branches/functions/lines em `src/modules/cep/**`. `npm run test:e2e` → 9/9. Desvio: o E2E foi separado do `npm test` (`--testPathIgnorePatterns /test/e2e/`) porque exige banco e internet; roda com o novo script `test:e2e`. Correção feita durante os testes: corpo `null`/não-objeto da ViaCEP virava 500 e agora retorna 502.
- [x] Toda nomenclatura das rotas e todo o código deve estar em inglês.
  > ✅ 2026-09-21 10:54 — rotas (`/cep`, `/cep/:cep`), identificadores, campos do model/colunas, mensagens das constantes, comentários e descrições dos testes em inglês. Arquivos em kebab-case com sufixos de papel.