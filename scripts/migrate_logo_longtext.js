const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            ssl: { rejectUnauthorized: false }
        });

        console.log('Altering tenants table to support Base64 images...');

        // Change logo_url to LONGTEXT to support Base64 strings (up to 4GB, though we only need ~50-200KB)
        await connection.query('ALTER TABLE tenants MODIFY COLUMN logo_url LONGTEXT');

        console.log('Success: logo_url is now LONGTEXT.');

        await connection.end();
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

main();
