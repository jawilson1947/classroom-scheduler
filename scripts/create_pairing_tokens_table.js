const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createPairingTokensTable() {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    try {
        console.log('Creating pairing_tokens table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS pairing_tokens (
                id INT PRIMARY KEY AUTO_INCREMENT,
                token VARCHAR(64) UNIQUE NOT NULL,
                room_id INT NOT NULL,
                tenant_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                used BOOLEAN DEFAULT FALSE,
                INDEX idx_token (token),
                INDEX idx_room (room_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✓ pairing_tokens table created successfully');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await pool.end();
    }
}

createPairingTokensTable();
