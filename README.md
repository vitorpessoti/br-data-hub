# BR Data Hub

Plataforma para **consultar, armazenar e gerenciar dados públicos brasileiros de CEP e CNPJ**.
Os dados são buscados em APIs públicas ([ViaCEP](https://viacep.com.br) e
[BrasilAPI](https://brasilapi.com.br)), gravados em um banco PostgreSQL e exibidos em um painel
web com autenticação.

- [Sobre o projeto](#sobre-o-projeto)
- [Por que BullMQ?](#por-que-bullmq)
- [Pré-requisitos](#pré-requisitos)
- [Passo a passo de instalação](#passo-a-passo-de-instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Executando o projeto](#executando-o-projeto)
- [Testes](#testes)
- [API](#api)
- [Solução de problemas](#solução-de-problemas)

---

## Sobre o projeto

O BR Data Hub é dividido em duas aplicações, no mesmo repositório:

| Pasta       | O que é                                             | Porta  |
| ----------- | ----------------------------------------------------| ------ |
| `backend/`  | API REST em Node.js (Express 5 + Prisma 6 + BullMQ) | `3000` |
| `frontend/` | Painel web em Next.js                               | `4000` |

E depende de dois serviços de infraestrutura, que rodam em Docker:

| Serviço        | Para que serve                                                              | Porta  |
| -------------- | --------------------------------------------------------------------------- | ------ |
| **PostgreSQL** | Banco de dados: usuários, CEPs e CNPJs                                      | `5432` |
| **Redis**      | Filas e jobs do BullMQ e contador do rate limit das APIs externas           | `6379` |

### Funcionalidades

- **Autenticação**: cadastro, login com JWT, "esqueci minha senha" (link por e-mail) e edição do
  perfil (nome). Todas as rotas da API, exceto cadastro, login e redefinição de senha, exigem usuário autenticado.
- **CEP**: informa um CEP, o backend consulta o ViaCEP e grava o endereço. Também é possível
  listar, ver detalhes, editar e excluir.
- **CNPJ**: informa um CNPJ, o backend consulta a BrasilAPI e grava os dados da empresa (razão
  social, CNAEs, endereço, quadro societário etc.). Também é possível listar, editar e excluir.
- **Consulta de jobs**: quando uma consulta vai para a fila (veja abaixo), ela devolve um `jobId`
  que pode ser consultado depois para saber se já foi processada.

### Arquitetura

```
 Navegador ──► Frontend (Next.js :4000) ──► Backend (Express :3000) ──► PostgreSQL
                                                  │        ▲
                                                  ▼        │
                                           Redis (BullMQ) ─┘ workers
                                                  │
                                                  ▼
                                        ViaCEP  /  BrasilAPI
```

## Por que BullMQ?

O ViaCEP e a BrasilAPI são **APIs públicas e gratuitas** e não publicam um limite numérico de
requisições. O ViaCEP avisa que uso massivo bloqueia o cliente por tempo indeterminado, e a
BrasilAPI bloqueia clientes abusivos. Chamar essas APIs sem controle, por exemplo com vários
usuários cadastrando ao mesmo tempo, pode resultar em respostas `429 Too Many Requests` ou até
no bloqueio do servidor.

Para evitar isso, o backend usa o [BullMQ](https://docs.bullmq.io), uma biblioteca de filas para
Node.js que guarda as filas e os jobs no Redis:

1. Cada API externa tem o **próprio limite** (padrão: 3 requisições por segundo), controlado por um
   contador no Redis compartilhado entre as requisições HTTP e os workers, para que somados
   nunca passem do limite.
2. **Dentro do limite**, a API externa é chamada na hora e a resposta é `201 Created` (ou
   `200 OK`, se o registro já existia e foi atualizado).
3. **Acima do limite**, a requisição **não é recusada**: o documento é gravado no banco com
   `status: "pending"` e um job é colocado na fila. A resposta é `202 Accepted` com um `jobId`.
4. Um **worker** do BullMQ processa a fila respeitando o mesmo limite e atualiza o status do
   registro: `pending` → `processing` → `completed` (ou `failed`). Falhas temporárias são
   repetidas até 3 vezes, com espera crescente entre as tentativas.
5. O resultado pode ser acompanhado em `GET /api/v1/jobs/:jobId` ou no painel, pela
   ação de consultar o jobId na linha do registro.

Com isso nenhuma requisição é perdida, o usuário não recebe erro por excesso de chamadas e o
projeto se mantém um bom cliente das APIs públicas. As filas ficam no Redis, então os jobs
pendentes sobrevivem a um reinício do backend.

---

## Pré-requisitos

Instale antes de começar:

| Ferramenta                                                        | Versão         | Motivo                                  |
| ------------------------------------------------------------      | -------------- | --------------------------------------- |
| [Git](https://git-scm.com/downloads)                              | qualquer       | baixar o projeto                        |
| [Node.js](https://nodejs.org) (já inclui o npm)                   | 20 ou superior | rodar backend e frontend                |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | recente        | rodar PostgreSQL e Redis                |

Confira as versões instaladas:

```bash
git --version
node -v
docker --version
docker compose version
```

> No Windows, abra o Docker Desktop e espere ele indicar que está rodando antes de usar os
> comandos `docker`.

---

## Passo a passo de instalação

### 1. Baixar o projeto

O repositório está em [github.com/vitorpessoti/br-data-hub](https://github.com/vitorpessoti/br-data-hub).

```bash
git clone https://github.com/vitorpessoti/br-data-hub.git
```

```bash
cd br-data-hub
```

Sem Git, também é possível baixar o ZIP pelo botão **Code → Download ZIP** na página do
repositório e extrair a pasta.

### 2. Instalar as dependências

São três instalações: a raiz (script que sobe backend e frontend juntos), o backend e o frontend.

```bash
npm install
```

```bash
npm install --prefix backend
```

```bash
npm install --prefix frontend
```

> A instalação do backend também roda o `prisma generate`, que gera o client do banco de dados.

### 3. Subir o PostgreSQL (Docker)

Crie o container do banco. Troque `brdatahub`/`brdatahub123` se quiser outro usuário e senha,
mas use os **mesmos valores** no `.env` do passo 5.

```bash
docker run -d --name br-data-hub-postgres -e POSTGRES_USER=brdatahub -e POSTGRES_PASSWORD=brdatahub123 -e POSTGRES_DB=br_data_hub -p 5432:5432 -v br-data-hub-postgres-data:/var/lib/postgresql/data --restart unless-stopped postgres:16-alpine
```

Confira se o banco está aceitando conexões:

```bash
docker exec br-data-hub-postgres pg_isready -U brdatahub
```

A saída esperada termina com `accepting connections`.

> Já tem um PostgreSQL instalado ou rodando na porta 5432? Use-o e pule este passo: basta
> criar um banco vazio e informar os dados de acesso no `.env`. Outra opção é mapear outra
> porta (ex.: `-p 5433:5432`) e usar `DB_PORT=5433` no `.env`.

### 4. Subir o Redis (Docker)

O Redis já está configurado em `backend/docker-compose.yml`:

```bash
docker compose -f backend/docker-compose.yml up -d redis
```

Confira se ele responde:

```bash
docker exec br-data-hub-v2-redis redis-cli ping
```

A saída esperada é `PONG`. Os dados ficam no volume `redis-data`, então as filas não se perdem
ao reiniciar o container.

### 5. Configurar as variáveis de ambiente

Cada aplicação tem um `.env.example` com todas as variáveis e comentários. Copie-os para `.env`:

**Git Bash / macOS / Linux**

```bash
cp backend/.env.example backend/.env
```

```bash
cp frontend/.env.example frontend/.env
```

Depois abra o `backend/.env` e preencha **obrigatoriamente**:

```dotenv
DB_USER=brdatahub
DB_PASSWORD=brdatahub123
DB_NAME=br_data_hub

JWT_SECRET=cole-aqui-uma-secret-longa-e-aleatoria
```

Para gerar um `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O `frontend/.env` já vem pronto para o ambiente local e não precisa de alteração.
A lista completa das variáveis está em [Variáveis de ambiente](#variáveis-de-ambiente).

### 6. Criar as tabelas no banco

Aplica todas as migrations do Prisma (`backend/prisma/migrations`) no banco configurado:

```bash
npm run prisma:deploy --prefix backend
```

A saída esperada termina com `All migrations have been successfully applied.`

### 7. Iniciar o projeto

Na raiz do projeto:

```bash
npm run dev
```

Esse comando sobe backend e frontend juntos, com os logs identificados por `[backend]` e
`[frontend]`. Quando os dois estiverem prontos:

- Painel web: <http://localhost:4000>
- API: <http://localhost:3000/api/v1>

### 8. Primeiro acesso

1. Abra <http://localhost:4000>. Você será levado à tela de login.
2. Clique em **Cadastre-se** e crie um usuário (nome, e-mail e senha).
3. Faça login. O dashboard mostra as tabelas de CEPs e CNPJs, inicialmente vazias.
4. Adicione um CEP (ex.: `01001000`) ou um CNPJ (ex.: `19131243000197`) para testar a
   integração com as APIs externas.

Pronto, o projeto está instalado.

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável                                   | Obrigatória | Padrão                         | Descrição |
| ------------------------------------------ | :---------: | ------------------------------ | --------- |
| `PORT`                                     |             | `3000`                         | Porta HTTP da API. |
| `ENVIRONMENT`                              |             | `development`                  | Nome do ambiente, exibido em `GET /api/v1/status`. |
| `DB_HOST`                                  | ✅          | `localhost`                    | Host do PostgreSQL. |
| `DB_PORT`                                  | ✅          | `5432`                         | Porta do PostgreSQL. |
| `DB_USER`                                  | ✅          | —                              | Usuário do PostgreSQL. |
| `DB_PASSWORD`                              | ✅          | —                              | Senha do PostgreSQL. |
| `DB_NAME`                                  | ✅          | —                              | Nome do banco. |
| `DATABASE_URL`                             | ✅          | montada a partir de `DB_*`     | URL de conexão usada pelo Prisma. Já vem montada com `${DB_USER}`, `${DB_PASSWORD}` etc.; não precisa alterar. |
| `DATE_FORMAT`                              |             | `DD/MM/YYYY HH:mm:ss`          | Formato de data dos logs. |
| `LOGS_PATH`                                |             | `logs/app.log`                 | Arquivo de log. |
| `CORS_ORIGIN_ALLOWED`                      | ✅          | `http://localhost:4000`        | Origem liberada no CORS (endereço do frontend). |
| `JWT_SECRET`                               | ✅          | —                              | Segredo usado para assinar os tokens de login. |
| `JWT_EXPIRES_IN`                           |             | `1h`                           | Validade do token (formato do `jsonwebtoken`: `30m`, `1h`, `7d`...). |
| `FRONTEND_URL`                             |             | `http://localhost:4000`        | Endereço do frontend usado no link de redefinição de senha. |
| `RESET_PASSWORD_TOKEN_EXPIRES_IN_MINUTES`  |             | `30`                           | Validade do link de redefinição de senha. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | | — / `587` / `false` | Servidor de e-mail. **Opcional**: sem `SMTP_HOST`, `SMTP_USER` e `SMTP_PASSWORD`, nenhum e-mail é enviado (o envio é apenas registrado como ignorado no log), então a redefinição de senha por e-mail não funciona. |
| `EMAIL_FROM`                               |             | `no-reply@brdatahub.com`       | Remetente dos e-mails. |
| `VIACEP_BASE_URL`, `VIACEP_TIMEOUT_MS`     |             | `https://viacep.com.br/ws`, `5000` | Endereço e timeout do ViaCEP. |
| `BRASILAPI_BASE_URL`, `BRASILAPI_TIMEOUT_MS` |           | `https://brasilapi.com.br/api/cnpj/v1`, `10000` | Endereço e timeout da BrasilAPI. |
| `REDIS_HOST`, `REDIS_PORT`                 | ✅          | `localhost`, `6379`            | Conexão com o Redis. |
| `REDIS_PASSWORD`, `REDIS_DB`               |             | vazio, `0`                     | Senha e número do banco do Redis. |
| `VIACEP_RATE_LIMIT_MAX`, `VIACEP_RATE_LIMIT_DURATION_MS` |  | `3`, `1000`                 | Máximo de chamadas ao ViaCEP por janela (ms). |
| `VIACEP_QUEUE_CONCURRENCY`                 |             | `3`                            | Jobs do ViaCEP processados em paralelo pelo worker. |
| `BRASILAPI_RATE_LIMIT_MAX`, `BRASILAPI_RATE_LIMIT_DURATION_MS` | | `3`, `1000`           | Máximo de chamadas à BrasilAPI por janela (ms). |
| `BRASILAPI_QUEUE_CONCURRENCY`              |             | `3`                            | Jobs da BrasilAPI processados em paralelo pelo worker. |

> Se mudar `PORT`, ajuste também `NEXT_PUBLIC_API_BASE_URL` no frontend. Se mudar a porta do
> frontend, ajuste `CORS_ORIGIN_ALLOWED` e `FRONTEND_URL` no backend.

### Frontend (`frontend/.env`)

| Variável                          | Padrão                         | Descrição |
| --------------------------------- | ------------------------------ | --------- |
| `NEXT_PUBLIC_API_BASE_URL`        | `http://localhost:3000/api/v1` | Endereço da API, incluindo o prefixo `/api/v1`. |
| `AUTH_ENABLED`                    | `true`                         | Protege as páginas privadas. `false` deixa todas abertas (apenas para desenvolvimento do layout, sem backend). |
| `NEXT_PUBLIC_AUTH_SESSION_COOKIE` | `access_token`                 | Nome do cookie que guarda o token da sessão. |

---

## Executando o projeto

Todos os comandos abaixo são executados a partir da **raiz** do projeto.

| Comando                                        | O que faz |
| ---------------------------------------------- | --------- |
| `npm run dev`                                  | Sobe backend e frontend juntos, em modo desenvolvimento. |
| `npm run dev:backend`                          | Sobe só o backend (com `nodemon`, reinicia a cada alteração). |
| `npm run dev:frontend`                         | Sobe só o frontend. |
| `npm run prisma:studio --prefix backend`       | Abre o Prisma Studio, interface web para ver e editar o banco. |
| `npm run prisma:migrate --prefix backend`      | Cria uma nova migration após alterar `backend/prisma/schema.prisma`. |
| `npm run build --prefix frontend`              | Gera o build de produção do frontend. |
| `npm run lint --prefix frontend`               | Roda o ESLint no frontend. |

### Parar e retomar a infraestrutura

```bash
docker stop br-data-hub-postgres br-data-hub-v2-redis
```

```bash
docker start br-data-hub-postgres br-data-hub-v2-redis
```

Os dados ficam nos volumes do Docker e continuam lá entre um reinício e outro.

---

## Testes

```bash
npm test --prefix backend
```

```bash
npm test --prefix frontend
```

Os testes acima usam mocks e não precisam de banco, Redis ou internet.

O backend também tem testes **end-to-end**, que usam o PostgreSQL, o Redis e as APIs ViaCEP e
BrasilAPI de verdade (precisam da infraestrutura no ar, das migrations aplicadas e de internet):

```bash
npm run test:e2e --prefix backend
```

---

## API

Base: `http://localhost:3000/api/v1`. Exceto as rotas marcadas como públicas, todas exigem o
header `Authorization: Bearer <token>`, com o token devolvido pelo login.

| Método   | Rota                        | Descrição |
| -------- | --------------------------- | --------- |
| `POST`   | `/auth/register`            | Cadastra usuário (`name`, `email`, `password`). **Pública.** |
| `POST`   | `/auth/login`               | Login (`email`, `password`); devolve `token` e `user`. **Pública.** |
| `POST`   | `/auth/forgot-password`     | Envia o link de redefinição de senha (`email`). **Pública.** |
| `POST`   | `/auth/reset-password`      | Redefine a senha (`token`, `password`). **Pública.** |
| `PATCH`  | `/auth/users/:id`           | Altera o nome e/ou a senha do próprio usuário. O e-mail não pode ser alterado. |
| `GET`    | `/status`                   | Nome, versão, ambiente e se o banco está acessível. |
| `POST`   | `/cep`                      | Consulta o CEP (`cep`) no ViaCEP e grava. `201` criado, `200` atualizado, `202` enfileirado. |
| `GET`    | `/cep`                      | Lista os CEPs gravados. |
| `GET`    | `/cep/:cep`                 | Detalha um CEP. |
| `PATCH`  | `/cep/:cep`                 | Edita campos de um CEP. |
| `DELETE` | `/cep/:cep`                 | Exclui um CEP. |
| `POST`   | `/cnpj`                     | Consulta o CNPJ (`cnpj`) na BrasilAPI e grava. `201` criado, `200` atualizado, `202` enfileirado. |
| `GET`    | `/cnpj`                     | Lista os CNPJs gravados. |
| `GET`    | `/cnpj/:cnpj`               | Detalha um CNPJ. |
| `PATCH`  | `/cnpj/:cnpj`               | Edita campos de um CNPJ. |
| `DELETE` | `/cnpj/:cnpj`               | Exclui um CNPJ. |
| `GET`    | `/jobs/:jobId`              | Status de uma consulta enfileirada (`pending`, `processing`, `completed`, `failed`). |

Exemplo de consulta enfileirada (resposta `202`):

```json
{
  "message": "The ViaCEP request limit was reached, so the CEP was queued for enrichment. Check the progress with the jobId.",
  "jobId": "5f0c2a8e-3b1d-4c61-9d0e-2a7f4e8b9c10",
  "status": "pending",
  "cep": "01001000"
}
```

---

## Estrutura de pastas

```
br-data-hub/
├── package.json            # scripts que sobem backend + frontend juntos
├── backend/
│   ├── docker-compose.yml  # Redis
│   ├── prisma/             # schema.prisma e migrations
│   ├── src/
│   │   ├── config/         # env, Redis, rate limit
│   │   ├── middlewares/    # autenticação, validação
│   │   ├── modules/        # auth, cep, cnpj, job (route, service, repository, queue, worker...)
│   │   ├── routes/         # registro das rotas em /api/v1
│   │   └── services/       # Prisma, logger, e-mail, filas, rate limiter
│   └── test/               # testes unitários e e2e
└── frontend/
    └── src/
        ├── app/            # rotas do Next.js (públicas e privadas)
        ├── modules/        # páginas: auth, dashboard, profile...
        ├── components/     # componentes reutilizáveis
        └── stores/         # sessão do usuário
```

Mais detalhes do frontend em [`frontend/README.md`](frontend/README.md).

---

## Solução de problemas

**`Can't reach database server at localhost:5432`**
O PostgreSQL não está rodando ou os dados do `.env` estão errados. Rode
`docker ps` para ver se o container `br-data-hub-postgres` está `Up` e confira `DB_USER`,
`DB_PASSWORD`, `DB_NAME` e `DB_PORT` no `backend/.env`.

**`Bind for 0.0.0.0:5432 failed: port is already allocated`** (ou `6379`)
Já existe outro serviço usando a porta. Pare-o, ou suba o container em outra porta
(ex.: `-p 5433:5432` para o Postgres; `REDIS_PORT=6380` antes do `docker compose` para o Redis)
e ajuste `DB_PORT`/`REDIS_PORT` no `backend/.env`.

**`503` ao cadastrar CEP/CNPJ, com mensagem de fila indisponível**
O Redis não está acessível. Confira com `docker exec br-data-hub-v2-redis redis-cli ping`.

**Erro de CORS no navegador**
`CORS_ORIGIN_ALLOWED` no `backend/.env` precisa ser exatamente o endereço do frontend
(`http://localhost:4000`, sem barra no final).

**`401` em todas as requisições**
O token expirou (`JWT_EXPIRES_IN`) ou está ausente. Faça login novamente.

**Não recebi o e-mail de redefinição de senha**
Sem SMTP configurado, o e-mail não é enviado: o `backend/logs/app.log` registra
`SMTP not configured; skipping send`. Preencha `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e
`SMTP_PASSWORD` no `backend/.env` (ex.: Gmail com senha de app, Mailtrap, Brevo) e reinicie o
backend.

**`The table ... does not exist`**
As migrations não foram aplicadas. Rode `npm run prisma:deploy --prefix backend`.
