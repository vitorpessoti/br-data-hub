# 004-rate-limit-control-bull-mq

## Objetivo

Padronizar um controle de rate-limit para as APIs ViaCEP e BrasilAPI, que estão ligadas ao módulos `cep` e `cnpj`, respectivamente. O objetivo é não receber 429 nas chamadas destas APIs, pois são APIs externas e públicas.

## Contexto técnico

Configurar com BullMQ (lib do node) o rate-limit interno no projeto, de acordo com o mínimo esperado pelas APIs externas. Caso tenham muitas chamadas ao mesmo tempo, a aplicação deve devolver 202 com um `jobId` para ser consultado posteriormente em uma rota que espera receber o `jobId` para retornar se já foi processado ou não.
O `jobId` ficará salvo no banco de dados via Prisma, assim como o status do enriquecimento do item (pending, processing, completed, failed). Será necessária alteração nas models `cep` e `cnpj` e na lógica dos módulos, pois precisa da gravação do `jobId` e do `status`. Caso a requisição não seja barrada pelo rate-limiter do nosso BullMQ, grava `jobId` nulo (se não tiver sido criado pelo BullMQ) e `status` = completed. Caso contrário, grava o `jobId` e seu correspondente `status`.

### Backend

- Redis local via Docker para salvar as filas e jobs do BullMQ
- arquivo de configuração do Redis no projeto para se conectar ao Redis criado na etapa anterior
- migration no Prisma para adicionar os campos `jobId` e `status` nas models `cep` e `cnpj`
- módulos `cep` e `cnpj` alterados para gravarem `jobId` e `status` em seus respectivos momentos
- controle de requisições simultâneas para as APIs ViaCEP e BrasilAPI (separadamente)
- caso tenha mais requisições do que o permitido, retorna 202 com `jobId` no body
- persistência dos dados via Prisma
- se uma requisição entrar para a fila de processamento, grava imediatamente no Prisma o seu documento (CEP ou CNPJ), o `jobId` e o `status` = pending
- retorno 202 com `jobId` no body caso a requisição tenha entrado na fila de execução
- constantes de mensagens do retorno 202 para ambos os módulos `cep` e `cnpj`
- rota para pesquisar por jobId no banco de dados via Prisma

## Referências Compartilhadas

- [Como executar](../../shared/como-executar.md)
- [Regras de nomenclatura](../../shared/regras-de-nomenclatura.md)

## Tasks

- [x] Criar e configurar um Redis local via Docker para salvar as filas e jobs do BullMQ
  > ✅ 2026-09-21 16:09 — `docker-compose.yml` na raiz com o serviço `redis` (`redis:7-alpine`, container `br-data-hub-v2-redis`, porta `${REDIS_PORT:-6379}:6379`, AOF ligado, volume `redis-data`, healthcheck `redis-cli ping`). Subir com `docker compose up -d redis` (verificado: `PONG`). Obs.: já existia outro Redis de outro projeto na porta 6389; este é dedicado ao projeto. Dependências: `bullmq@^6.3.8` e `ioredis@^6.0.0` (na v6 do BullMQ o `ioredis` virou peer dependency, então foi instalado explicitamente).
- [x] Criar um arquivo de configuração do Redis no projeto para se conectar ao Redis criado na etapa anterior
  > ✅ 2026-09-21 16:09 — `src/config/redis.config.js`: `redisConfig` lido do `.env` (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`; padrão `localhost:6379`), `workerRedisConfig` (`maxRetriesPerRequest: null`, exigido pelos workers) e `getRedisClient()`/`closeRedisClient()` (conexão única do lado HTTP, com `maxRetriesPerRequest: 1` para falhar rápido e erros de conexão enviados ao Logger). Variáveis adicionadas em `.env` e `.env.example`.
- [x] Adicionar os campos `jobId` e `status` nas models `cep` e `cnpj`
  > ✅ 2026-09-21 16:09 — Enum `EnrichmentStatus` (`pending`, `processing`, `completed`, `failed`; tipo `enrichment_status` no banco) e, em `Cep` e `Cnpj`, `jobId String? @unique` e `status EnrichmentStatus @default(completed)` (registros existentes ficam `completed`). Para permitir gravar o registro pendente só com o documento: `Cep.city`/`Cep.uf` e `Cnpj.corporateName` passaram a ser opcionais e as listas JSON do `Cnpj` ganharam `@default("[]")`. Migration `20260921180000_add_enrichment_job_status` (sem perda de dados). Desvio: `prisma migrate dev` não roda em ambiente não interativo, então o SQL foi gerado com `prisma migrate diff` (banco → schema) e aplicado com `prisma migrate deploy`; `migrate status` → up to date.
- [x] Alterar os módulos `cep` e `cnpj` para gravarem `jobId` e `status` na criação e alteração de dados de cada módulo
  > ✅ 2026-09-21 16:09 — `POST /cep` e `POST /cnpj` (`enrich`): dentro do limite, chamam a API externa e gravam/atualizam com `jobId: null` e `status: completed`; acima do limite, gravam `jobId` + `status: pending` antes de enfileirar. O worker (`processJob`) move o registro para `processing` → `completed` (com os dados da API, mantendo o `jobId`) ou `failed`; falha transitória com tentativas restantes volta para `pending`. Se o documento já está `pending`/`processing`, a requisição devolve o job atual em vez de criar outro. Decisão: o `PATCH` manual não altera `jobId`/`status` (não são campos editáveis).
- [x] Criar o controle de requisições simultâneas para as APIs ViaCEP e BrasilAPI (separadamente). Consultas em cada API qual a quantidade de requisições simultâneas são aceitas e configurar o controle de requisições no BullMQ com o valor aceito por cada API.
  > ✅ 2026-09-21 16:09 — Pesquisa: nenhuma das duas APIs publica um limite numérico — o ViaCEP só avisa que "uso massivo" bloqueia o acesso por tempo indeterminado e a BrasilAPI bloqueia abuso sem número documentado. Adotado um padrão conservador de 3 req/s por API, com 3 jobs em paralelo, configurável no `.env` (`VIACEP_RATE_LIMIT_MAX`, `VIACEP_RATE_LIMIT_DURATION_MS`, `VIACEP_QUEUE_CONCURRENCY` e os equivalentes `BRASILAPI_*`), em `src/config/rate-limit.config.js`. Controle separado por API: `RateLimiterService` (`src/services/rate-limiter.service.js`, janela fixa atômica em Redis via Lua, chaves `rate-limit:viacep`/`rate-limit:brasilapi`), dividido entre as requisições HTTP e o worker, para que somados nunca passem do limite. Filas BullMQ `cep-enrichment`/`cnpj-enrichment` (`src/services/queue.factory.js`, `cep.queue.js`/`cnpj.queue.js`, `cep.worker.js`/`cnpj.worker.js`) com `limiter { max, duration }` e `concurrency` de cada API. Sem vaga, o worker chama `queue.rateLimit(ttl)` + `Worker.RateLimitError()`. Retentativas: 3 com backoff exponencial, só para falhas transitórias (4xx vira `UnrecoverableError`). Os workers sobem em `src/server.js`, que também faz o encerramento limpo com SIGINT/SIGTERM.
- [x] Preparar as APIs de cada módulo para retornar status code 202 com `jobId` no body caso tenha estourado o número de requisições simultâneas. Neste caso, o body deve retornar também o `status`, que será "pending" e deve ser registrado no banco de dados juntamente com seu respectivo documento (CEP ou CNPJ).
  > ✅ 2026-09-21 16:09 — Acima do limite, `POST /api/v1/cep|cnpj` → `202 { message, jobId (UUID), status: "pending", cep|cnpj }`; se o documento já estiver na fila → `202` com o mesmo `jobId`/`status`. Constantes de mensagem: `CEP_QUEUED`/`CEP_ALREADY_QUEUED` e `CNPJ_QUEUED`/`CNPJ_ALREADY_QUEUED`; com o Redis fora → `503 QUEUE_UNAVAILABLE` (o registro pendente é desfeito). Teste manual com o servidor real: rajada de 8 CEPs → 3×201 + 5×202, os 5 concluídos pelo worker em ~2 s; 6 CNPJs → 3×201 + 3×202 e repetição → 202 "already queued"; Redis parado → 503 em 0,36 s, voltando a 201 quando o Redis volta.
- [x] Persistir os dados (jobId e status) via Prisma.
  > ✅ 2026-09-21 16:09 — Toda gravação passa pelos repositories Prisma (`CepRepository`/`CnpjRepository`): `create`/`update` com `{ jobId, status }` no enfileiramento, `update` de status no worker e rollback (`delete` do novo registro ou restauração do `jobId`/`status` anteriores) se a fila falhar. O `jobId` é gravado antes do `queue.add`, então o worker sempre encontra o registro.
- [x] Criar uma rota que pesquisa no banco por `jobId`.
  > ✅ 2026-09-21 16:09 — Módulo `job` criado com a skill `new-backend-module` (`generate.mjs job`; a rota GET de exemplo do template foi substituída). Correção (2026-09-21): a rota foi registrada inicialmente no singular (`/api/v1/job`) e passou para o plural `/api/v1/jobs` em `src/routes/index.js`; o módulo continua `src/modules/job`. `GET /api/v1/jobs/:jobId` (UUID; maiúsculas aceitas) busca o `jobId` nas tabelas `cep` e `cnpj` (é único entre as duas) → `200 { message, jobId, type: "cep"|"cnpj", status, cep|cnpj: registro }`; `404 JOB_NOT_FOUND`; `400 INVALID_JOB_ID`; `500 FETCH_FAILED`. Testes: `npm test` → 378/378, 100% de statements/branches/functions/lines em `src/modules/{cep,cnpj,job}` e nos novos `queue.factory`/`rate-limiter.service` (os testes de integração e unitários mockam Redis/BullMQ). Novos testes: `test/unit/{queue.factory,rate-limiter.service,redis.config,enrichment-queues}.test.js`, `test/unit/job/job.service.test.js`, `src/modules/job/job.test.js`, mais cenários de fila em `cep`/`cnpj`. `npm run test:e2e` → 24/24, incluindo o novo `test/e2e/rate-limit.e2e.test.js` (Redis + BullMQ + Postgres + ViaCEP/BrasilAPI reais: rajada → 202 → worker → `completed` via `/jobs/:jobId`). Os E2E de `cep`/`cnpj` agora zeram a janela de rate limit antes de cada teste e fecham a conexão Redis no final; o script `test:e2e` passou a medir cobertura também de `src/modules/job`. 