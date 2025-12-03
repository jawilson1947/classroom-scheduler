const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkEvents() {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    try {
        const [events] = await pool.query(`
            SELECT * FROM events WHERE title LIKE '%English%'
        `);

        console.log(JSON.stringify(events, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkEvents();
