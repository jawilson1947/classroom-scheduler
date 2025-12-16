
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function migrate() {
    console.log('Starting migration...');
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        timezone: 'Z'
    });

    try {
        console.log('Adding columns to tenants table...');

        // Add full_address
        try {
            await connection.query('ALTER TABLE tenants ADD COLUMN full_address TEXT');
            console.log('Added full_address');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('full_address already exists');
            else throw e;
        }

        // Add website
        try {
            await connection.query('ALTER TABLE tenants ADD COLUMN website VARCHAR(255)');
            console.log('Added website');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('website already exists');
            else throw e;
        }

        // Add logo_url
        try {
            await connection.query('ALTER TABLE tenants ADD COLUMN logo_url VARCHAR(255)');
            console.log('Added logo_url');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('logo_url already exists');
            else throw e;
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
