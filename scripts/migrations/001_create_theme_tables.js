/**
 * Migration 001 — Display Theme Engine schema (P0).
 *
 * Additive & idempotent. Creates the `themes` table and adds the two nullable
 * assignment columns (`tenants.default_theme_id`, `rooms.theme_id`). Safe to
 * re-run: existing objects are detected and skipped.
 *
 * Run from the project root:  node scripts/migrations/001_create_theme_tables.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        timezone: 'Z',
    });

    const addColumn = async (table, ddl, label) => {
        try {
            await connection.query(ddl);
            console.log(`Added ${table}.${label}`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_FK_DUP_NAME') {
                console.log(`${table}.${label} already exists — skipping`);
            } else {
                throw e;
            }
        }
    };

    try {
        console.log('Migration 001: creating themes table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS themes (
                id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                tenant_id      BIGINT UNSIGNED NULL,
                key_name       VARCHAR(64)  NOT NULL,
                name           VARCHAR(255) NOT NULL,
                description    TEXT NULL,
                definition     JSON NOT NULL,
                thumbnail_url  VARCHAR(512) NULL,
                is_system      TINYINT(1) NOT NULL DEFAULT 0,
                schema_version INT NOT NULL DEFAULT 1,
                status         ENUM('active','archived') NOT NULL DEFAULT 'active',
                created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                CONSTRAINT fk_themes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                UNIQUE KEY uq_themes_scope_key (tenant_id, key_name),
                INDEX idx_themes_tenant (tenant_id)
            ) ENGINE = InnoDB;
        `);
        console.log('themes table ready');

        console.log('Adding tenants.default_theme_id...');
        await addColumn('tenants',
            'ALTER TABLE tenants ADD COLUMN default_theme_id BIGINT UNSIGNED NULL', 'default_theme_id');
        await addColumn('tenants',
            'ALTER TABLE tenants ADD CONSTRAINT fk_tenants_theme FOREIGN KEY (default_theme_id) REFERENCES themes(id) ON DELETE SET NULL',
            'fk_tenants_theme');

        console.log('Adding rooms.theme_id...');
        await addColumn('rooms',
            'ALTER TABLE rooms ADD COLUMN theme_id BIGINT UNSIGNED NULL', 'theme_id');
        await addColumn('rooms',
            'ALTER TABLE rooms ADD CONSTRAINT fk_rooms_theme FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE SET NULL',
            'fk_rooms_theme');

        console.log('Migration 001 complete.');
    } catch (err) {
        console.error('Migration 001 failed:', err);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
}

run();
