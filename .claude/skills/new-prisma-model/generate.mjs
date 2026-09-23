#!/usr/bin/env node
// Adiciona um novo model ao schema Prisma do projeto atual, formata/valida com o
// Prisma CLI do próprio projeto e (opcionalmente) gera e aplica a migration.
//
// Uso: node generate.mjs <NomeDoModel> [campos...] [flags]
//   campos: "nome:String email:String:unique idade:Int? ativo:Boolean=true autor:Usuario"
//   flags : --dir <raiz> --schema <arquivo|pasta> --id uuid|cuid|autoincrement
//           --no-map --no-timestamps --no-migrate --dry-run
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const TAG = '[new-prisma-model]';
const args = process.argv.slice(2);
const VALUE_FLAGS = ['--dir', '--schema', '--id', '--fields'];
const flag = (name) => args.includes(name);
const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));

const fail = (msg) => {
    console.error(`${TAG} ERRO: ${msg}`);
    process.exit(1);
};

// ---- nomes ---------------------------------------------------------------
const splitWords = (s) => s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
const toPascal = (s) => splitWords(s).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const toCamel = (s) => { const p = toPascal(s); return p[0].toLowerCase() + p.slice(1); };
const toSnake = (s) => splitWords(s).join('_');

const rawName = positional[0];
if (!rawName) fail('informe o nome do model. Ex.: node generate.mjs Produto "nome:String preco:Decimal(10,2)"');
const modelName = toPascal(rawName);
if (!modelName || /^[0-9]/.test(modelName)) fail(`nome de model inválido: "${rawName}"`);
const modelWords = splitWords(rawName);

// ---- projeto / schema ----------------------------------------------------
const root = path.resolve(opt('--dir') ?? process.cwd());
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) fail(`sem package.json em ${root} (use --dir <raiz-do-projeto>)`);
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function resolveSchema() {
    const candidates = [];
    if (opt('--schema')) candidates.push(opt('--schema'));
    if (pkg.prisma?.schema) candidates.push(pkg.prisma.schema);
    for (const cfg of ['prisma.config.ts', 'prisma.config.mts', 'prisma.config.js', 'prisma.config.mjs']) {
        const p = path.join(root, cfg);
        if (!fs.existsSync(p)) continue;
        const m = fs.readFileSync(p, 'utf8').match(/schema\s*:\s*(?:path\.join\([^)]*?)?['"`]([^'"`]+)['"`]/);
        if (m) candidates.push(m[1]);
    }
    candidates.push('prisma/schema.prisma', 'prisma/schema', 'schema.prisma');
    for (const c of candidates) {
        const abs = path.resolve(root, c);
        if (fs.existsSync(abs)) return abs;
    }
    return null;
}

const schemaPath = resolveSchema();
if (!schemaPath) fail('não encontrei o schema Prisma (prisma/schema.prisma). Rode `npx prisma init` ou use --schema.');
const isFolder = fs.statSync(schemaPath).isDirectory();
const listPrismaFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'migrations' ? [] : listPrismaFiles(p);
    return e.name.endsWith('.prisma') ? [p] : [];
});
const schemaFiles = isFolder ? listPrismaFiles(schemaPath) : [schemaPath];
const schemaText = schemaFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const provider = schemaText.match(/datasource\s+\w+\s*\{[^}]*provider\s*=\s*"(\w+)"/)?.[1] ?? 'postgresql';
const nativeTypes = ['postgresql', 'mysql', 'cockroachdb'].includes(provider);
const isMongo = provider === 'mongodb';

// models existentes: nome -> { idType, hasMap }
const existing = new Map();
for (const m of schemaText.matchAll(/^\s*model\s+(\w+)\s*\{([\s\S]*?)^\s*\}/gm)) {
    const idLine = m[2].split(/\r?\n/).find((l) => /@id\b/.test(l));
    existing.set(m[1], {
        idType: idLine?.trim().split(/\s+/)[1] ?? 'String',
        idDefault: idLine?.match(/@default\((\w+)\(/)?.[1],
        idNative: idLine?.match(/@db\.\w+(\([^)]*\))?/)?.[0],
        hasMap: /@@map\(/.test(m[2]),
    });
}
const enums = new Set([...schemaText.matchAll(/^\s*enum\s+(\w+)\s*\{/gm)].map((m) => m[1]));
if (existing.has(modelName) || enums.has(modelName)) fail(`o model/enum "${modelName}" já existe no schema.`);

// convenções: seguem os models existentes; sem models, usa os defaults da skill.
// Colunas nunca recebem @map: o nome no banco é o próprio nome camelCase do campo.
// O @@map (quando usado) dá à tabela o nome do model em camelCase (ItemPedido -> itemPedido).
const models = [...existing.values()];
const useMap = !flag('--no-map') && (models.length ? models.some((m) => m.hasMap) : true);
const idStrategy = opt('--id')
    ?? ({ uuid: 'uuid', cuid: 'cuid', autoincrement: 'autoincrement' }[models.find((m) => m.idDefault)?.idDefault] ?? 'uuid');
const timestamps = !flag('--no-timestamps');
if (!['uuid', 'cuid', 'autoincrement'].includes(idStrategy)) fail(`--id inválido: "${idStrategy}" (use uuid, cuid ou autoincrement)`);
const ownIdLine = isMongo
    ? ['id', 'String', '@id @default(auto()) @map("_id") @db.ObjectId']
    : idStrategy === 'autoincrement'
        ? ['id', 'Int', '@id @default(autoincrement())']
        : ['id', 'String', `@id @default(${idStrategy}())${provider === 'postgresql' && idStrategy === 'uuid' ? ' @db.Uuid' : ''}`];

// ---- dicionário para dedução de campos -------------------------------------
// "nome:Tipo[?][:mod...]" ; mods: unique, index, text, default(x) ; "=x" é atalho de default
const DICT = [
    { keys: ['usuario'], fields: 'nome:String email:String:unique senha:String ativo:Boolean=true' },
    { keys: ['user'], fields: 'name:String email:String:unique password:String active:Boolean=true' },
    { keys: ['cliente'], fields: 'nome:String documento:String:unique email:String? telefone:String? ativo:Boolean=true' },
    { keys: ['customer', 'client'], fields: 'name:String document:String:unique email:String? phone:String? active:Boolean=true' },
    { keys: ['fornecedor'], fields: 'nome:String documento:String:unique email:String? telefone:String?' },
    { keys: ['supplier', 'vendor'], fields: 'name:String document:String:unique email:String? phone:String?' },
    { keys: ['empresa'], fields: 'razaoSocial:String nomeFantasia:String? cnpj:String:unique email:String? telefone:String?' },
    { keys: ['company', 'organization'], fields: 'name:String document:String:unique email:String? phone:String?' },
    { keys: ['funcionario', 'colaborador'], fields: 'nome:String email:String:unique cargo:String salario:Decimal(12,2)? dataAdmissao:DateTime' },
    { keys: ['employee'], fields: 'name:String email:String:unique position:String salary:Decimal(12,2)? hiredAt:DateTime' },
    { keys: ['produto'], fields: 'nome:String descricao:String?:text preco:Decimal(12,2) estoque:Int=0 ativo:Boolean=true' },
    { keys: ['product', 'item'], fields: 'name:String description:String?:text price:Decimal(12,2) stock:Int=0 active:Boolean=true' },
    { keys: ['categoria'], fields: 'nome:String:unique descricao:String?' },
    { keys: ['category'], fields: 'name:String:unique description:String?' },
    { keys: ['pedido', 'venda'], fields: 'codigo:String:unique status:String=pendente total:Decimal(12,2)=0 observacao:String?' },
    { keys: ['order', 'sale'], fields: 'code:String:unique status:String=pending total:Decimal(12,2)=0 notes:String?' },
    { keys: ['pagamento'], fields: 'valor:Decimal(12,2) metodo:String status:String=pendente pagoEm:DateTime?' },
    { keys: ['payment'], fields: 'amount:Decimal(12,2) method:String status:String=pending paidAt:DateTime?' },
    { keys: ['transacao', 'lancamento'], fields: 'valor:Decimal(12,2) tipo:String descricao:String? data:DateTime' },
    { keys: ['transaction', 'entry'], fields: 'amount:Decimal(12,2) type:String description:String? date:DateTime' },
    { keys: ['fatura', 'nota', 'boleto'], fields: 'numero:String:unique valor:Decimal(12,2) vencimento:DateTime pagoEm:DateTime? status:String=aberta' },
    { keys: ['invoice', 'bill'], fields: 'number:String:unique amount:Decimal(12,2) dueDate:DateTime paidAt:DateTime? status:String=open' },
    { keys: ['conta'], fields: 'nome:String tipo:String saldo:Decimal(14,2)=0' },
    { keys: ['account', 'wallet'], fields: 'name:String type:String balance:Decimal(14,2)=0' },
    { keys: ['endereco'], fields: 'logradouro:String numero:String complemento:String? bairro:String cidade:String uf:String cep:String' },
    { keys: ['address'], fields: 'street:String number:String complement:String? district:String city:String state:String zipCode:String' },
    { keys: ['cidade', 'municipio'], fields: 'nome:String uf:String codigoIbge:String:unique' },
    { keys: ['city'], fields: 'name:String state:String code:String:unique' },
    { keys: ['estado'], fields: 'nome:String uf:String:unique codigoIbge:String?:unique' },
    { keys: ['state', 'province'], fields: 'name:String code:String:unique' },
    { keys: ['pais'], fields: 'nome:String codigo:String:unique' },
    { keys: ['country'], fields: 'name:String code:String:unique' },
    { keys: ['post', 'artigo', 'noticia'], fields: 'titulo:String slug:String:unique conteudo:String:text publicado:Boolean=false publicadoEm:DateTime?' },
    { keys: ['article', 'news', 'blog'], fields: 'title:String slug:String:unique content:String:text published:Boolean=false publishedAt:DateTime?' },
    { keys: ['comentario'], fields: 'conteudo:String:text' },
    { keys: ['comment', 'review'], fields: 'content:String:text' },
    { keys: ['tarefa', 'atividade'], fields: 'titulo:String descricao:String?:text concluida:Boolean=false prazo:DateTime?' },
    { keys: ['task', 'todo'], fields: 'title:String description:String?:text done:Boolean=false dueDate:DateTime?' },
    { keys: ['projeto'], fields: 'nome:String descricao:String?:text status:String=ativo dataInicio:DateTime? dataFim:DateTime?' },
    { keys: ['project'], fields: 'name:String description:String?:text status:String=active startDate:DateTime? endDate:DateTime?' },
    { keys: ['evento', 'agendamento', 'reserva'], fields: 'titulo:String descricao:String? inicio:DateTime fim:DateTime? local:String? status:String=agendado' },
    { keys: ['event', 'appointment', 'booking'], fields: 'title:String description:String? startsAt:DateTime endsAt:DateTime? location:String? status:String=scheduled' },
    { keys: ['arquivo', 'documento', 'anexo'], fields: 'nome:String url:String mimeType:String tamanho:Int' },
    { keys: ['file', 'document', 'attachment', 'upload'], fields: 'name:String url:String mimeType:String size:Int' },
    { keys: ['notificacao', 'mensagem'], fields: 'titulo:String conteudo:String:text lida:Boolean=false' },
    { keys: ['notification', 'message'], fields: 'title:String content:String:text read:Boolean=false' },
    { keys: ['log', 'auditoria', 'audit'], fields: 'level:String message:String:text context:Json?' },
    { keys: ['configuracao', 'parametro'], fields: 'chave:String:unique valor:String descricao:String?' },
    { keys: ['setting', 'config', 'parameter'], fields: 'key:String:unique value:String description:String?' },
    { keys: ['perfil', 'papel', 'permissao'], fields: 'nome:String:unique descricao:String?' },
    { keys: ['role', 'permission', 'group', 'tag'], fields: 'name:String:unique description:String?' },
    { keys: ['veiculo', 'carro'], fields: 'placa:String:unique marca:String modelo:String ano:Int' },
    { keys: ['vehicle', 'car'], fields: 'plate:String:unique brand:String model:String year:Int' },
    { keys: ['fonte'], fields: 'nome:String url:String? descricao:String? ativa:Boolean=true' },
    { keys: ['source', 'dataset'], fields: 'name:String url:String? description:String? active:Boolean=true' },
    { keys: ['indicador'], fields: 'codigo:String:unique nome:String unidade:String? descricao:String?' },
    { keys: ['indicator', 'metric'], fields: 'code:String:unique name:String unit:String? description:String?' },
    { keys: ['sessao', 'token'], fields: 'token:String:unique expiraEm:DateTime revogado:Boolean=false' },
    { keys: ['session'], fields: 'token:String:unique expiresAt:DateTime revoked:Boolean=false' },
];
const PT_HINT = /(cao|coes|ao|oes|ario|eiro|eira|ente|dade|ria|nte|gem)$|^(nome|dado|registro|cadastro)/;

function deduceFields() {
    const singular = (w) => [w, w.replace(/(oes|aes|ais|eis)$/, (s) => ({ oes: 'ao', aes: 'ao', ais: 'al', eis: 'el' })[s]),
        w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, '')];
    // PT: substantivo principal vem primeiro (ItemPedido); EN: vem por último (UserAccount)
    const order = [...modelWords, ...[...modelWords].reverse()];
    for (const word of order) {
        const hit = DICT.find((d) => singular(word).some((s) => d.keys.includes(s)));
        if (hit) return { spec: hit.fields, source: `dicionário ("${word}")` };
    }
    const pt = modelWords.some((w) => PT_HINT.test(w));
    return {
        spec: pt ? 'nome:String descricao:String? ativo:Boolean=true' : 'name:String description:String? active:Boolean=true',
        source: 'genérico',
    };
}

// ---- parsing dos campos ---------------------------------------------------
const TYPE_ALIASES = {
    string: 'String', str: 'String', text: 'String', uuid: 'String', int: 'Int', integer: 'Int',
    bigint: 'BigInt', float: 'Float', double: 'Float', decimal: 'Decimal', money: 'Decimal',
    bool: 'Boolean', boolean: 'Boolean', date: 'DateTime', datetime: 'DateTime', timestamp: 'DateTime',
    json: 'Json', bytes: 'Bytes',
};
const SCALARS = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes']);

function tokenizeSpec(spec) {
    // separa por espaço/vírgula/; mas respeita parênteses e aspas: preco:Decimal(10,2) status:String="em aberto"
    const out = []; let cur = ''; let depth = 0; let quote = null;
    for (const ch of spec) {
        if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
        if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth === 0 && /[\s,;]/.test(ch)) { if (cur) out.push(cur); cur = ''; continue; }
        cur += ch;
    }
    if (cur) out.push(cur);
    return out;
}

function formatDefault(type, raw) {
    const v = raw.trim();
    if (/^\w+\(.*\)$/.test(v) && !/^Decimal/.test(v)) return v;          // now(), uuid(), dbgenerated(...)
    if (type === 'String') return /^["'].*["']$/.test(v) ? `"${v.slice(1, -1)}"` : `"${v}"`;
    if (type === 'DateTime' && v.toLowerCase() === 'now') return 'now()';
    if (type === 'Boolean') return /^(true|1|sim|yes)$/i.test(v) ? 'true' : 'false';
    return v.replace(/^["']|["']$/g, '');
}

function parseField(token) {
    let [lhs, def] = [token, undefined];
    const eq = token.indexOf('=');
    if (eq > 0 && !token.slice(0, eq).includes('(')) { lhs = token.slice(0, eq); def = token.slice(eq + 1); }
    const parts = lhs.match(/(?:[^:(]+|\([^)]*\))+/g) ?? [];
    const [rawField, rawType = 'String', ...mods] = parts;
    const name = toCamel(rawField);
    if (!name) fail(`campo inválido: "${token}"`);

    const tm = rawType.match(/^(\w+)(\([^)]*\))?(\[\])?(\?)?$/);
    if (!tm) fail(`tipo inválido em "${token}"`);
    const [, baseRaw, args0, list, opt0] = tm;
    const alias = baseRaw.toLowerCase();
    let type = TYPE_ALIASES[alias] ?? baseRaw;
    const optional = !!opt0;
    const attrs = [];

    // relação com model existente (ou o próprio model, auto-relação)
    const relModel = [...existing.keys(), modelName].find((m) => m.toLowerCase() === type.toLowerCase());
    if (relModel && !list) {
        // FK precisa do mesmo tipo (inclusive nativo, ex. @db.Uuid) do id do model alvo
        const target = existing.get(relModel)
            ?? { idType: ownIdLine[1], idNative: ownIdLine[2].match(/@db\.\w+/)?.[0] };
        const fk = `${name}Id`;
        const fkAttrs = [];
        if (target.idNative) fkAttrs.push(target.idNative);
        if (mods.includes('unique')) fkAttrs.push('@unique');
        // auto-relação: precisa de nome, é sempre opcional (senão nenhum registro pode ser o primeiro)
        // e o lado inverso tem de ser escrito aqui, pois o `prisma format` não o completa
        const self = relModel === modelName;
        const opt1 = optional || self;
        const relName = self ? `"${modelName}${toPascal(name)}", ` : '';
        const onDelete = opt1 ? (self ? 'NoAction, onUpdate: NoAction' : 'SetNull') : 'Cascade';
        const unique = mods.includes('unique');
        return {
            lines: [
                [name, `${relModel}${opt1 ? '?' : ''}`, `@relation(${relName}fields: [${fk}], references: [id], onDelete: ${onDelete})`],
                [fk, `${target.idType}${opt1 ? '?' : ''}`, fkAttrs.join(' ')],
                ...(self ? [[`${name}Inverso`, `${modelName}${unique ? '?' : '[]'}`, `@relation("${modelName}${toPascal(name)}")`]] : []),
            ],
            index: mods.includes('unique') ? null : fk,
        };
    }
    if (!SCALARS.has(type) && !enums.has(type) && !existing.has(type)) {
        fail(`tipo "${baseRaw}" desconhecido em "${token}" (não é escalar, enum nem model existente).`);
    }

    if (nativeTypes) {
        if (alias === 'text' || mods.includes('text')) attrs.push('@db.Text');
        if (alias === 'uuid' && provider === 'postgresql') attrs.push('@db.Uuid');
        if (type === 'Decimal' && args0) attrs.push(`@db.Decimal${args0.replace(/\s/g, '').replace(',', ', ')}`);
        if (type === 'String' && args0 && alias !== 'text') attrs.push(`@db.VarChar${args0}`);
        if (alias === 'date' && provider !== 'cockroachdb') attrs.push('@db.Date');
    }
    if (mods.includes('unique')) attrs.push('@unique');
    const defMod = mods.find((m) => /^default/.test(m));
    if (defMod) def = defMod.replace(/^default\(?/, '').replace(/\)$/, '');
    if (def !== undefined) attrs.unshift(`@default(${formatDefault(type, def)})`);

    return {
        lines: [[name, `${type}${list ?? ''}${optional ? '?' : ''}`, attrs.join(' ')]],
        index: mods.includes('index') ? name : null,
    };
}

// ---- monta o model -----------------------------------------------------------
let spec = [opt('--fields'), ...positional.slice(1)].filter(Boolean).join(' ').trim();
let deducedFrom = null;
if (!spec) {
    const d = deduceFields();
    spec = d.spec; deducedFrom = d.source;
}

const reserved = new Set(['id', 'createdAt', 'updatedAt']);
const parsed = tokenizeSpec(spec).map(parseField);
const lines = [ownIdLine];
const indexes = [];
const seen = new Set();

for (const p of parsed) {
    for (const l of p.lines) {
        if (reserved.has(l[0])) continue;                         // id/timestamps são gerados pela skill
        if (seen.has(l[0])) fail(`campo duplicado: "${l[0]}"`);
        seen.add(l[0]);
        lines.push(l);
    }
    if (p.index) indexes.push(p.index);
}
if (timestamps) {
    lines.push(['createdAt', 'DateTime', '@default(now())']);
    lines.push(['updatedAt', 'DateTime', '@updatedAt']);
}

const w1 = Math.max(...lines.map((l) => l[0].length));
const w2 = Math.max(...lines.map((l) => l[1].length));
const body = lines.map(([n, t, a]) => `  ${n.padEnd(w1)} ${a ? t.padEnd(w2) + ' ' + a : t}`.trimEnd());
const tail = [
    ...indexes.map((i) => `  @@index([${i}])`),
    ...(useMap ? [`  @@map("${toCamel(modelName)}")`] : []),
];
const block = `model ${modelName} {\n${body.join('\n')}${tail.length ? '\n\n' + tail.join('\n') : ''}\n}\n`;

console.log(`${TAG} schema: ${path.relative(root, schemaPath) || schemaPath} (provider: ${provider})`);
console.log(`${TAG} convenções: id=${isMongo ? 'ObjectId' : idStrategy}, @@map=${useMap}, timestamps=${timestamps}`);
if (deducedFrom) console.log(`${TAG} nenhum campo informado — campos deduzidos pelo nome (${deducedFrom}): ${spec}`);
console.log(`\n${block}`);

if (flag('--dry-run')) {
    console.log(`${TAG} --dry-run: nada foi escrito.`);
    process.exit(0);
}

// ---- escreve --------------------------------------------------------------
const targetFile = isFolder ? path.join(schemaPath, `${toSnake(modelName)}.prisma`) : schemaPath;
if (isFolder && fs.existsSync(targetFile)) fail(`${path.relative(root, targetFile)} já existe.`);
const backup = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf8') : null;
const eol = backup?.includes('\r\n') ? '\r\n' : '\n';
const withEol = (s) => s.replace(/\n/g, eol);
const next = backup === null
    ? withEol(block)
    : backup.replace(/\s*$/, '') + eol + eol + withEol(block);
fs.writeFileSync(targetFile, next);
const restore = () => (backup === null ? fs.rmSync(targetFile) : fs.writeFileSync(targetFile, backup));
console.log(`${TAG} model ${modelName} escrito em ${path.relative(root, targetFile)}`);

// ---- Prisma CLI do projeto -----------------------------------------------
const localCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
if (!fs.existsSync(localCli)) {
    restore();
    fail('Prisma CLI não encontrado em node_modules/prisma. Rode `npm install` (ou `npm i -D prisma`) no projeto. Schema restaurado.');
}
const schemaArg = ['--schema', schemaPath];
const prisma = (...cmd) => {
    console.log(`\n${TAG} > prisma ${cmd.join(' ')}`);
    return spawnSync(process.execPath, [localCli, ...cmd, ...schemaArg], { cwd: root, stdio: 'inherit' }).status === 0;
};

// format valida o schema e completa o lado oposto das relações nos outros models
if (!prisma('format')) {
    restore();
    fail('`prisma format` falhou — schema restaurado ao estado anterior. Corrija os campos e rode de novo.');
}

if (flag('--no-migrate')) {
    prisma('generate');
    console.log(`\n${TAG} OK (sem migration). Para aplicar depois: npx prisma migrate dev --name create_${toSnake(modelName)}`);
    process.exit(0);
}

const migrated = isMongo ? prisma('db', 'push') : prisma('migrate', 'dev', '--name', `create_${toSnake(modelName)}`);
if (!migrated) {
    prisma('generate');
    console.error(`\n${TAG} AVISO: o model foi adicionado ao schema, mas a migration NÃO foi aplicada ` +
        '(banco inacessível, DATABASE_URL incompleta ou migrate exigiu confirmação). ' +
        `Corrija e rode: npx prisma migrate dev --name create_${toSnake(modelName)}`);
    process.exit(2);
}
console.log(`\n${TAG} OK: model ${modelName} criado, migration aplicada e Prisma Client gerado.`);
