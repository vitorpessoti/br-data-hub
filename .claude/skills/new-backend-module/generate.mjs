#!/usr/bin/env node
// Gera um módulo de negócio em src/modules/<modulo>/ (route + service + repository +
// validator + constants + teste) e registra a rota em src/routes/index.js.
//
// Uso: node generate.mjs <nome-do-modulo> [--dir <raiz-do-projeto>] [--force]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--dir');

const fail = (msg) => {
    console.error(`[new-backend-module] ERRO: ${msg}`);
    process.exit(1);
};

const rawName = positional[0];
if (!rawName) fail('informe o nome do módulo. Ex.: node generate.mjs user-profiles');

// ---- nomes ---------------------------------------------------------------
const words = rawName
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
if (!words.length || /^[0-9]/.test(words[0])) fail(`nome inválido: "${rawName}"`);

const kebab = words.join('-');                                            // user-profiles
const pascal = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(''); // UserProfiles
const camel = pascal[0].toLowerCase() + pascal.slice(1);                  // userProfiles
const constKey = words.join('_').toUpperCase();                           // USER_PROFILES

// ---- projeto -------------------------------------------------------------
const root = path.resolve(opt('--dir') ?? process.cwd());
const routesIndex = path.join(root, 'src', 'routes', 'index.js');
if (!fs.existsSync(path.join(root, 'package.json'))) fail(`sem package.json em ${root}`);
if (!fs.existsSync(routesIndex)) fail(`não encontrei ${path.relative(root, routesIndex)}`);
for (const dep of ['services/prisma.service.js', 'services/logger.service.js', 'middlewares/validate.middleware.js']) {
    if (!fs.existsSync(path.join(root, 'src', dep))) fail(`dependência ausente: src/${dep}`);
}

const moduleDir = path.join(root, 'src', 'modules', kebab);
if (fs.existsSync(moduleDir) && !flag('--force')) {
    fail(`src/modules/${kebab} já existe. Use --force para sobrescrever.`);
}

// ---- templates -----------------------------------------------------------
const files = {
    [`${kebab}.constants.js`]: `export const ${pascal}Constants = {
    MESSAGES: {
        SUCCESS: {
            DEFAULT: "Módulo ${kebab} respondendo.",
        },
        ERROR: {
            DEFAULT: "Algo deu errado no módulo ${kebab}.",
            INVALID_MESSAGE: "O parâmetro 'message' deve ser um texto de até 255 caracteres.",
        },
    },
};
`,

    [`${kebab}.validator.js`]: `import { query } from 'express-validator';
import { ${pascal}Constants } from './${kebab}.constants.js';

class ${pascal}Validator {
    static defaultValidation() {
        return [
            query('message')
                .optional()
                .isString()
                .withMessage(${pascal}Constants.MESSAGES.ERROR.INVALID_MESSAGE)
                .bail()
                .trim()
                .isLength({ min: 1, max: 255 })
                .withMessage(${pascal}Constants.MESSAGES.ERROR.INVALID_MESSAGE),
        ];
    }
}

export default ${pascal}Validator;
`,

    [`${kebab}.repository.js`]: `import prisma from '../../services/prisma.service.js';

export default class ${pascal}Repository {
    async isDatabaseAlive() {
        try {
            await prisma.$queryRaw\`SELECT 1\`;
            return true;
        } catch {
            return false;
        }
    }

    // Após criar o model em prisma/schema.prisma, adicione aqui as operações. Ex.:
    // async findAll() {
    //     return prisma.${camel}.findMany();
    // }
}
`,

    [`${kebab}.service.js`]: `import httpStatus from 'http-status';
import createError from 'http-errors';
import ${pascal}Repository from './${kebab}.repository.js';
import { ${pascal}Constants } from './${kebab}.constants.js';
import Logger from '../../services/logger.service.js';

const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

export default class ${pascal}Service {
    constructor() {
        this.repository = new ${pascal}Repository();
    }

    async execute({ message } = {}) {
        try {
            return {
                module: '${kebab}',
                message: message ?? ${pascal}Constants.MESSAGES.SUCCESS.DEFAULT,
                isDatabaseAlive: await this.repository.isDatabaseAlive(),
            };
        } catch (error) {
            logger.error(\`[${kebab}] \${error.message}\`);
            throw createError(
                error.status || httpStatus.INTERNAL_SERVER_ERROR,
                error.message || ${pascal}Constants.MESSAGES.ERROR.DEFAULT
            );
        }
    }
}
`,

    [`${kebab}.route.js`]: `import express from "express";
import httpStatus from "http-status";
import ${pascal}Service from "./${kebab}.service.js";
import ${pascal}Validator from "./${kebab}.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = express.Router();

router.get(
    "/",
    ...${pascal}Validator.defaultValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new ${pascal}Service().execute(req.query);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
`,

    [`${kebab}.test.js`]: `import { jest } from '@jest/globals';
import request from 'supertest';
import httpStatus from 'http-status';

jest.unstable_mockModule('../../services/prisma.service.js', () => ({
    default: { $queryRaw: jest.fn().mockRejectedValue(new Error('offline')) },
}));

const { default: app } = await import('../../app.js');
const { ${pascal}Constants } = await import('./${kebab}.constants.js');

const basePath = '/api/v1/${kebab}';

describe('# ${pascal} - GET /${kebab}', () => {
    it('should return the default module response', async () => {
        const response = await request(app).get(basePath);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({
            module: '${kebab}',
            message: ${pascal}Constants.MESSAGES.SUCCESS.DEFAULT,
            isDatabaseAlive: false,
        });
    });

    it('should echo a valid message', async () => {
        const response = await request(app).get(basePath).query({ message: 'olá' });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe('olá');
    });

    it('should reject an invalid message', async () => {
        const response = await request(app).get(basePath).query({ message: 'x'.repeat(256) });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors[0]).toBe(${pascal}Constants.MESSAGES.ERROR.INVALID_MESSAGE);
    });
});
`,
};

// ---- escrita -------------------------------------------------------------
fs.mkdirSync(moduleDir, { recursive: true });
for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(moduleDir, name), content);
    console.log(`  criado  src/modules/${kebab}/${name}`);
}

// ---- registro em src/routes/index.js --------------------------------------
const eol = (s) => (s.includes('\r\n') ? '\r\n' : '\n');
let index = fs.readFileSync(routesIndex, 'utf8');
const nl = eol(index);
const importLine = `import ${camel}Route from '../modules/${kebab}/${kebab}.route.js';`;
const useLine = `router.use(\`\${baseRoute}/${kebab}\`, ${camel}Route);`;

if (index.includes(`../modules/${kebab}/${kebab}.route.js`)) {
    console.log('  ok      src/routes/index.js já registrava o módulo');
} else {
    const lines = index.split(/\r?\n/);
    const lastImport = lines.reduce((acc, l, i) => (/^import\s/.test(l) ? i : acc), -1);
    if (lastImport < 0) fail('src/routes/index.js sem linhas de import');
    lines.splice(lastImport + 1, 0, importLine);

    // após o último router.use(...) ativo; senão, antes do export default
    let lastUse = lines.reduce((acc, l, i) => (/^\s*router\.use\(/.test(l) ? i : acc), -1);
    if (lastUse < 0) lastUse = lines.findIndex((l) => /^export default/.test(l)) - 1;
    if (lastUse < -1) fail('src/routes/index.js sem router.use nem export default');
    lines.splice(lastUse + 1, 0, useLine);

    fs.writeFileSync(routesIndex, lines.join(nl));
    console.log('  editado src/routes/index.js');
}

console.log(`\nMódulo "${kebab}" pronto: GET /api/v1/${kebab}`);
