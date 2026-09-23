#!/usr/bin/env node
// Gera um backend Node.js (Express 5 + Prisma 6 + Jest/Babel, ESM) com a mesma
// estrutura/configuração do transactions-service, sem módulos de negócio.
//
// Uso: node scaffold.mjs [--dir <pasta>] [--skip-install] [--force]
//   --dir           pasta de destino (default: diretório atual). O nome do projeto
//                   no package.json é o nome dessa pasta (slugificado).
//   --skip-install  só escreve os arquivos (não roda npm install / prisma generate)
//   --force         sobrescreve arquivos se já existir package.json no destino
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};

const targetDir = path.resolve(opt('--dir') || process.cwd());
const rawName = path.basename(targetDir);
const projectName = rawName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[-]+$/g, '') || 'backend';

if (fs.existsSync(path.join(targetDir, 'package.json')) && !flag('--force')) {
    console.error(`[new-backend-project] ${targetDir} já tem package.json. Use --force para sobrescrever.`);
    process.exit(1);
}

const packageJson = {
    name: projectName,
    version: '1.0.0',
    main: 'src/server.js',
    type: 'module',
    scripts: {
        'start': 'node src/server.js',
        'start:dev': 'nodemon src/server.js',
        'test': 'node --experimental-vm-modules ./node_modules/jest/bin/jest.js --detectOpenHandles',
        'test:file': 'node ./node_modules/jest/bin/jest.js --detectOpenHandles',
        'prisma:generate': 'prisma generate',
        'prisma:migrate': 'prisma migrate dev',
        'prisma:deploy': 'prisma migrate deploy',
        'prisma:studio': 'prisma studio',
        'postinstall': 'prisma generate',
    },
    keywords: [],
    author: '',
    license: 'ISC',
    description: '',
    dependencies: {
        '@prisma/client': '^6.19.3',
        'cookie-parser': '^1.4.7',
        'cors': '^2.8.5',
        'dotenv': '^17.2.1',
        'express': '^5.1.0',
        'express-validator': '^7.2.1',
        'http-errors': '^2.0.0',
        'http-status': '^2.1.0',
        'prisma': '^6.19.3',
        'winston': '^3.17.0',
    },
    devDependencies: {
        '@babel/core': '^7.28.3',
        '@babel/preset-env': '^7.28.3',
        '@types/jest': '^30.0.0',
        'babel-jest': '^30.0.5',
        'jest': '^30.0.5',
        'nodemon': '^3.1.10',
        'supertest': '^7.1.4',
    },
};

const envBody = `# Porta HTTP do servidor
PORT=3000
ENVIRONMENT=development

# ---- Banco de dados (PostgreSQL) - preencha os valores abaixo ----
DB_HOST=localhost
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=
# Montada a partir das variáveis acima (Prisma CLI e src/config/env.js expandem \${VAR})
DATABASE_URL="postgresql://\${DB_USER}:\${DB_PASSWORD}@\${DB_HOST}:\${DB_PORT}/\${DB_NAME}?schema=public"

DATE_FORMAT="DD/MM/YYYY HH:mm:ss"
LOGS_PATH=logs/app.log

CORS_ORIGIN_ALLOWED=http://localhost:4200
`;

const files = {
    'package.json': JSON.stringify(packageJson, null, 2) + '\n',
    '.env': envBody,
    '.env.example': envBody,
    '.gitignore': `node_modules
# Keep environment variables out of version control
.env

/generated/prisma
/coverage
/logs/*.log
/.vscode
`,
    '.dockerignore': `node_modules
coverage
logs/*.log
.env
`,
    'Dockerfile': `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
`,
    'babel.config.cjs': `// babel.config.cjs
module.exports = {
    presets: [
        ['@babel/preset-env', {
            targets: { node: 'current' },
        }]
    ]
};
`,
    'jest.config.mjs': `// jest.config.mjs
export default {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  transform: {
    // Garante que arquivos .js sejam processados pelo babel-jest
    '^.+\\\\.js$': 'babel-jest',
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
};
`,
    'prisma/schema.prisma': `generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Adicione seus models abaixo e rode: npm run prisma:migrate -- --name <nome>
`,
    'logs/.gitkeep': '',
    'src/config/env.js': `import dotenv from 'dotenv';

// Carrega o .env e expande referências \${VAR} (ex.: DATABASE_URL montada a partir de DB_*),
// no mesmo formato que o Prisma CLI entende.
dotenv.config({ quiet: true });

for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value.includes('\${')) {
        process.env[key] = value.replace(/\\$\\{(\\w+)\\}/g, (_, name) => process.env[name] ?? '');
    }
}
`,
    'src/app.js': `import './config/env.js';
import express from "express";
import routes from "./routes/index.js";
import cors from "cors";
import httpStatus from "http-status";
import cookieParser from "cookie-parser";

const app = express();

const corsOptions = {
    origin: process.env.CORS_ORIGIN_ALLOWED,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
app.use('/', routes);

app.use((err, req, res, next) => {
    res.status(err.status || httpStatus.INTERNAL_SERVER_ERROR).json({
        status: err.status || httpStatus.INTERNAL_SERVER_ERROR,
        error: err.message || "Algo deu errado em sua solicitação.",
    });
});

export default app;
`,
    'src/server.js': `import app from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(\`Server is running on http://localhost:\${port}\`);
});
`,
    'src/routes/index.js': `import { Router } from 'express';
import statusRoute from './status.route.js';

const router = Router();
const baseRoute = '/api/v1';

router.use(\`\${baseRoute}/status\`, statusRoute);
// router.use(\`\${baseRoute}/<recurso>\`, <recurso>Route);

export default router;
`,
    'src/routes/status.route.js': `import express from "express";
import httpStatus from "http-status";
import StatusService from '../services/status.service.js';

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            res.status(httpStatus.OK).json(await new StatusService().execute());
        } catch (error) {
            next(error);
        }
    });

export default router;
`,
    'src/services/prisma.service.js': `import { PrismaClient } from '@prisma/client';

// Instância única do PrismaClient compartilhada pelos repositories.
const prisma = new PrismaClient();

export default prisma;
`,
    'src/services/status.service.js': `import packageJson from '../../package.json' with { type: 'json' };
import prisma from './prisma.service.js';

class StatusService {
    async execute() {
        return {
            projectName: packageJson.name,
            projectVersion: packageJson.version,
            environment: process.env.ENVIRONMENT,
            nodeVersion: process.version,
            isDatabaseAlive: await this.isDatabaseAlive(),
        };
    }

    async isDatabaseAlive() {
        try {
            await prisma.$queryRaw\`SELECT 1\`;
            return true;
        } catch {
            return false;
        }
    }
}

export default StatusService;
`,
    'src/services/logger.service.js': `import { createLogger, format, transports } from 'winston';

export default class Logger {
    constructor({ dateFormat = 'YYYY-MM-DD HH:mm:ss', logsPath = 'logs/app.log', level = 'info' } = {}) {
        this.logger = createLogger({
            level,
            format: format.combine(
                format.timestamp({ format: dateFormat }),
                format.printf(info => \`[\${info.timestamp}] \${info.level.toUpperCase()}: \${info.message}\`)
            ),
            transports: [
                new transports.Console(),
                new transports.File({ filename: logsPath })
            ]
        });
    }

    info(message) {
        this.logger.info(message);
    }

    error(message) {
        this.logger.error(message);
    }

    warn(message) {
        this.logger.warn(message);
    }

    debug(message) {
        this.logger.debug(message);
    }
}
`,
    'src/middlewares/validate.middleware.js': `import { validationResult } from "express-validator";
import httpStatus from "http-status";

const validate = (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const errors = err.errors.map(error => error.msg);
        return res.status(httpStatus.BAD_REQUEST).json({ errors });
    }
    next();
};

export default validate;
`,
    'src/utils/constants.util.js': `export const Constants = {
    MESSAGES: {
        SUCCESS: {},
        ERROR: {
            DEFAULT: "Algo deu errado em sua solicitação.",
        }
    }
};
`,
    'src/repositories/.gitkeep': '',
    'src/validators/.gitkeep': '',
    '__mocks__/.gitkeep': '',
    'test/unit/status.service.test.js': `import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/services/prisma.service.js', () => ({
    default: { $queryRaw: jest.fn().mockRejectedValue(new Error('offline')) },
}));

const { default: StatusService } = await import('../../src/services/status.service.js');

describe('# StatusService', () => {
    it('should return project info', async () => {
        const status = await new StatusService().execute();
        expect(status.projectName).toBeDefined();
        expect(status.nodeVersion).toBe(process.version);
        expect(status.isDatabaseAlive).toBe(false);
    });
});
`,
};

for (const [rel, content] of Object.entries(files)) {
    const full = path.join(targetDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (rel === '.env' && fs.existsSync(full)) {
        console.log(`  skip ${rel} (já existe)`);
        continue;
    }
    fs.writeFileSync(full, content);
    console.log(`  + ${rel}`);
}

console.log(`\n[new-backend-project] Projeto "${projectName}" gerado em ${targetDir}`);

if (!flag('--skip-install')) {
    // npm install dispara o postinstall -> prisma generate
    execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
}

console.log(`
Próximos passos:
  1. Preencha DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME no .env
  2. Adicione models em prisma/schema.prisma e rode: npm run prisma:migrate -- --name init
  3. npm run start:dev  ->  GET http://localhost:3000/api/v1/status
`);
