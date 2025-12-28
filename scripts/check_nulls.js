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
        const [rows] = await connection.query(
            "SELECT COUNT(*) as count FROM users WHERE firstname IS NULL OR lastname IS NULL OR telephone IS NULL"
        );
        console.log(`Users with missing fields: ${rows[0].count}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

main();
