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
        console.log('Modifying user columns to NOT NULL...');

        const queries = [
            "ALTER TABLE users MODIFY COLUMN firstname VARCHAR(255) NOT NULL",
            "ALTER TABLE users MODIFY COLUMN lastname VARCHAR(255) NOT NULL",
            "ALTER TABLE users MODIFY COLUMN telephone VARCHAR(50) NOT NULL"
        ];

        for (const query of queries) {
            try {
                await connection.query(query);
                console.log(`Executed: ${query}`);
            } catch (err) {
                console.error(`Failed to execute: ${query}`, err);
                throw err;
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

main();
