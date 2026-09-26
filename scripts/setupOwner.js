const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

try {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
} catch {
    console.error('Não foi possível ler o arquivo .env do projeto.');
    process.exitCode = 1;
}

async function main() {
    const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
    if (!email || email === 'email_real_da_marcelly') {
        throw new Error('OWNER_EMAIL não foi configurado no arquivo .env.');
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'studio_marcelly',
    });

    try {
        const [clients] = await connection.execute('SELECT id,name,email FROM clients WHERE LOWER(email)=? LIMIT 1', [email]);
        if (!clients[0]) {
            throw new Error(`Nenhuma conta cadastrada foi encontrada para OWNER_EMAIL (${email}).`);
        }

        await connection.execute("UPDATE clients SET role='master', is_owner=1 WHERE id=?", [clients[0].id]);
        console.log(`Proprietária configurada com sucesso: ${clients[0].name} (${clients[0].email}) — role=master, is_owner=true.`);
    } finally {
        await connection.end();
    }
}

if (!process.exitCode) {
    main().catch((error) => {
        console.error(`Erro ao configurar proprietária: ${error.message}`);
        process.exitCode = 1;
    });
}
