---
name: new-prisma-model
description: Cria (sobe) um novo model no schema Prisma do projeto atual, com os campos informados ou deduzidos a partir do nome do model, formata/valida com o Prisma CLI do próprio projeto e gera + aplica a migration. Use ao pedir "novo model", "criar model prisma", "adicionar tabela", "criar entidade no prisma", "subir model", "nova tabela no banco", "new-prisma-model".
---

# new-prisma-model

Adiciona um model ao schema Prisma **do projeto em que está sendo executada**
(usa o `node_modules/prisma` local, nunca um Prisma global), roda `prisma format`
(valida e completa o lado inverso das relações nos outros models) e, por padrão,
`prisma migrate dev --name create_<model>`. Todo o trabalho é feito por
`generate.mjs`, ao lado deste arquivo.

## 1. Montar o pedido

**Nome do model**: PascalCase e singular (`Produto`, `ItemPedido`, `UserProfile`).
Se o usuário pediu no plural ("crie a tabela de clientes"), use o singular (`Cliente`).
O script converte `item_pedido`/`item-pedido` → `ItemPedido`.

**Campos informados pelo usuário** → traduza para a sintaxe abaixo e passe como 2º argumento.

**Nenhum campo informado** → deduza você mesmo os campos pelo nome e domínio do model
(ex.: `Produto` → nome, descrição, preço, estoque, ativo), no idioma do nome do model,
e passe-os explicitamente. Diga ao usuário quais campos foram deduzidos. Se não passar
campos, o script usa um dicionário interno (usuário, cliente, produto, pedido,
pagamento, endereço, cidade, tarefa, evento, arquivo, log, fonte, indicador...) e, sem
correspondência, cai em `nome`/`descricao`/`ativo` (ou `name`/`description`/`active`).

Não inclua `id`, `createdAt` e `updatedAt` — o script já gera (e ignora se vierem).

### Sintaxe dos campos

`nome:Tipo[?][:modificador...][=default]`, separados por espaço ou vírgula
(parênteses e aspas são respeitados).

| Exemplo | Resultado |
|---|---|
| `nome:String` | `nome String` |
| `email:String:unique` | `email String @unique` |
| `apelido:String?` | campo opcional |
| `bio:text` ou `bio:String:text` | `String @db.Text` |
| `sigla:String(10)` | `String @db.VarChar(10)` |
| `preco:Decimal(10,2)` | `Decimal @db.Decimal(10, 2)` |
| `ativo:Boolean=true` | `@default(true)` |
| `status:String=pendente` / `status:String="em aberto"` | `@default("...")` (aspas automáticas) |
| `publicadoEm:DateTime=now` | `@default(now())` |
| `nascimento:date` | `DateTime @db.Date` |
| `codigo:String:index` | adiciona `@@index([codigo])` |
| `tags:String[]` | lista escalar (PostgreSQL) |
| `categoria:Categoria` | relação N:1 obrigatória → `categoria` + `categoriaId` (FK, `onDelete: Cascade`, `@@index`) |
| `autor:Usuario?` | relação opcional (`onDelete: SetNull`) |
| `usuario:Usuario:unique` | relação 1:1 (FK `@unique`) |
| `pai:ItemPedido` (o próprio model) | auto-relação opcional + lado inverso `paiInverso` |
| `tipo:TipoConta` | usa um `enum` já existente no schema |

Aliases de tipo: `string text uuid int integer bigint float double decimal money bool
boolean date datetime timestamp json bytes`. Relações só apontam para models **já
existentes** (crie o model alvo antes). Enums novos não são criados — crie no schema antes.

## 2. Executar

Da raiz do projeto (onde está o `package.json`):

```bash
node .claude/skills/new-prisma-model/generate.mjs <Model> "<campos>"
```

Exemplos:

```bash
node .claude/skills/new-prisma-model/generate.mjs Produto "nome:String descricao:text? preco:Decimal(12,2) estoque:Int=0 categoria:Categoria"
node .claude/skills/new-prisma-model/generate.mjs Cliente --dry-run
```

Rode primeiro com `--dry-run` quando os campos foram deduzidos e o usuário pode
querer revisar; depois rode sem a flag.

Flags:
- `--dry-run` — só imprime o model, não escreve nada.
- `--no-migrate` — escreve o model, formata e roda `prisma generate`, sem migration.
- `--schema <arquivo|pasta>` — força o schema (senão: `package.json#prisma.schema`,
  `prisma.config.*`, `prisma/schema.prisma`, `prisma/schema/`, `schema.prisma`).
- `--id uuid|cuid|autoincrement` — estratégia do id.
- `--no-map` — não gera o `@@map` da tabela (a tabela fica com o nome do model, em PascalCase).
- `--no-timestamps` — sem `createdAt`/`updatedAt`.
- `--dir <raiz>` — quando não estiver na raiz do projeto.

## Convenções (seguem o schema existente)

- **id**: copia a estratégia dos models existentes; schema sem models → `uuid()`
  (+ `@db.Uuid` no PostgreSQL). MongoDB → `ObjectId` e `db push` no lugar de migrate.
- **Colunas em camelCase**: os campos **nunca** recebem `@map` — o nome da coluna no banco é o
  próprio nome camelCase do campo (`corporateName`, `createdAt`, FKs como `usuarioId`). Não use
  snake_case (`created_at`) nem no schema nem no banco.
- **@@map da tabela**: usado se algum model existente usa `@@map`; schema sem models → usa.
  Tabela = nome do model em camelCase (`ItemPedido` → `itemPedido`, `Cnpj` → `cnpj`).
- **FKs** recebem exatamente o tipo do id do model alvo (inclusive `@db.Uuid`).
- **Schema multi-arquivo** (pasta `prisma/schema/`): cria `<model_snake>.prisma` nela.
- Tipos nativos (`@db.*`) só em PostgreSQL/MySQL/CockroachDB.

## Resultado e códigos de saída

- `0` — model escrito, formatado, migration aplicada e client gerado (ou `--no-migrate`/`--dry-run`).
- `1` — erro de entrada ou `prisma format` falhou → **o schema é restaurado** ao estado anterior.
- `2` — model ficou no schema, mas a migration falhou (banco fora do ar, `DATABASE_URL`
  incompleta no `.env`, ou o `migrate dev` pediu confirmação/reset). Informe o usuário;
  o comando para aplicar depois é impresso.

Depois de sucesso, mostre ao usuário o bloco do model (impresso pelo script) e o
nome da migration (`prisma/migrations/<timestamp>_create_<model>`).

## Gotchas

- `migrate dev` é interativo quando detecta perda de dados ou drift — nesse caso ele
  aborta (saída 2). **Nunca** rode `prisma migrate reset` ou `--accept-data-loss` sem o usuário pedir.
- O lado inverso das relações é adicionado pelo `prisma format` nos outros models
  (ex.: `itemPedidos ItemPedido[]` em `Produto`); renomeie se quiser um nome melhor
  e rode `npx prisma format` de novo.
- Com o `.env` deste projeto, `DATABASE_URL` é montada a partir de `DB_*`; se algum
  estiver vazio a migration falha com saída 2.
- Para expor o model via API depois, use a skill `new-backend-module`.
