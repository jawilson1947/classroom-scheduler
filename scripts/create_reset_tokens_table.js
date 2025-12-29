const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306')
    });

    try {
        console.log('Creating password_reset_tokens table...');

        const query = `
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
              email        VARCHAR(255) NOT NULL,
              token        VARCHAR(255) NOT NULL UNIQUE,
              expires_at   DATETIME(3) NOT NULL,
              created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            
              INDEX idx_tokens_email (email),
              INDEX idx_tokens_token (token)
            ) ENGINE=InnoDB;
        `;

        await connection.query(query);
        console.log('Table created successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

main();
