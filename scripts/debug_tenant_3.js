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
            ssl: { rejectUnauthorized: false } // Often needed for remote DBs
        });

        const [rows] = await connection.execute('SELECT * FROM tenants WHERE id = ?', [3]);
        console.log('Tenant 3:', rows[0]);
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
