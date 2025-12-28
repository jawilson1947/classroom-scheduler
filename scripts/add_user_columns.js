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
        console.log('Adding columns to users table...');

        const queries = [
            "ALTER TABLE users ADD COLUMN firstname VARCHAR(255) NULL AFTER role",
            "ALTER TABLE users ADD COLUMN lastname VARCHAR(255) NULL AFTER firstname",
            "ALTER TABLE users ADD COLUMN telephone VARCHAR(50) NULL AFTER lastname"
        ];

        for (const query of queries) {
            try {
                await connection.query(query);
                console.log(`Executed: ${query}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists, skipping: ${query}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

main();
