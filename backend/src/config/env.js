import dotenv from 'dotenv';

// Carrega o .env e expande referências ${VAR} (ex.: DATABASE_URL montada a partir de DB_*),
// no mesmo formato que o Prisma CLI entende.
dotenv.config({ quiet: true });

for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value.includes('${')) {
        process.env[key] = value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? '');
    }
}
