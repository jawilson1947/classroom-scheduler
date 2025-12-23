const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function alterFacilitatorsTable() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
        console.log('Connected to database.');
        console.log('Altering facilitators table columns to LONGTEXT...');

        // Alter picture_url directly
        await connection.query('ALTER TABLE facilitators MODIFY picture_url LONGTEXT');
        console.log('Modified picture_url to LONGTEXT.');

        // Alter icon_url directly
        await connection.query('ALTER TABLE facilitators MODIFY icon_url LONGTEXT');
        console.log('Modified icon_url to LONGTEXT.');

        console.log('Table altered successfully.');

    } catch (error) {
        console.error('Error altering table:', error);
    } finally {
        await connection.end();
        console.log('Connection closed.');
    }
}

alterFacilitatorsTable();
