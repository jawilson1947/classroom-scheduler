/**
 * Migration 002 — seed the global themes (P0).
 *
 * Upserts the two global (tenant_id = NULL) themes from their canonical JSON
 * definitions in docs/themes/. Idempotent: re-running updates the definition,
 * name, description and schema_version in place (matched on tenant_id IS NULL
 * + key_name) without creating duplicates.
 *
 *   - system_default  (is_system = 1)  — exact current look; cannot be deleted.
 *   - vcu_light                         — "What's Happening Today" example.
 *
 * Run after 001, from the project root:
 *   node scripts/migrations/002_seed_themes.js
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

const THEME_DIR = path.resolve(__dirname, '..', '..', 'docs', 'themes');

const THEMES = [
    {
        key_name: 'system_default',
        name: 'System Default',
        description: 'The standard dark agenda board. Used everywhere unless a tenant default or room override is set.',
        file: 'system_default.json',
        is_system: 1,
    },
    {
        key_name: 'vcu_light',
        name: "What's Happening Today",
        description: 'Light board with gold accents, large centered date, and a bottom ticker. Hides past events and facilitators.',
        file: 'vcu_light.json',
        is_system: 0,
    },
];

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        timezone: 'Z',
    });

    try {
        for (const t of THEMES) {
            const raw = fs.readFileSync(path.join(THEME_DIR, t.file), 'utf8');
            const def = JSON.parse(raw); // parse to validate it is well-formed JSON
            const schemaVersion = def.schemaVersion || 1;
            const definitionJson = JSON.stringify(def);

            const [existing] = await connection.query(
                'SELECT id FROM themes WHERE tenant_id IS NULL AND key_name = ?',
                [t.key_name]
            );

            if (existing.length > 0) {
                await connection.query(
                    `UPDATE themes
                        SET name = ?, description = ?, definition = ?, is_system = ?,
                            schema_version = ?, status = 'active'
                      WHERE id = ?`,
                    [t.name, t.description, definitionJson, t.is_system, schemaVersion, existing[0].id]
                );
                console.log(`Updated theme '${t.key_name}' (id ${existing[0].id})`);
            } else {
                const [res] = await connection.query(
                    `INSERT INTO themes (tenant_id, key_name, name, description, definition, is_system, schema_version, status)
                     VALUES (NULL, ?, ?, ?, ?, ?, ?, 'active')`,
                    [t.key_name, t.name, t.description, definitionJson, t.is_system, schemaVersion]
                );
                console.log(`Inserted theme '${t.key_name}' (id ${res.insertId})`);
            }
        }
        console.log('Migration 002 complete.');
    } catch (err) {
        console.error('Migration 002 failed:', err);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
}

run();
