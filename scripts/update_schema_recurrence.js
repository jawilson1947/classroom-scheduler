const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function updateSchema() {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    try {
        console.log('Adding recurrence columns to events table...');

        // Add recurrence_days
        try {
            await pool.query(`
                ALTER TABLE events 
                ADD COLUMN recurrence_days VARCHAR(255) NULL,
                ADD COLUMN daily_start_time TIME NULL,
                ADD COLUMN daily_end_time TIME NULL;
            `);
            console.log('Columns added successfully.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns already exist.');
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await pool.end();
    }
}

updateSchema();
