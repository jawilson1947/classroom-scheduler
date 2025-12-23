const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createFacilitatorsTable() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
        console.log('Connected to database.');

        const query = `
            CREATE TABLE IF NOT EXISTS facilitators (
                id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                tenant_id    BIGINT UNSIGNED NOT NULL,
                first_name   VARCHAR(255) NOT NULL,
                last_name    VARCHAR(255) NOT NULL,
                name_on_door VARCHAR(255) NOT NULL,
                bio          TEXT,
                picture_url  TEXT,
                icon_url     TEXT,
                created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

                CONSTRAINT fk_facilitators_tenant
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
                    ON DELETE CASCADE,

                INDEX idx_facilitators_tenant (tenant_id)
            ) ENGINE=InnoDB;
        `;

        console.log('Creating facilitators table...');
        await connection.query(query);
        console.log('Facilitators table created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await connection.end();
        console.log('Connection closed.');
    }
}

createFacilitatorsTable();
