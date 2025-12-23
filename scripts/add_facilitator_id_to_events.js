const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addFacilitatorIdToEvents() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
        console.log('Connected to database.');
        console.log('Adding facilitator_id column to events table...');

        const query = `
            ALTER TABLE events
            ADD COLUMN facilitator_id BIGINT UNSIGNED DEFAULT NULL AFTER room_id,
            ADD CONSTRAINT fk_events_facilitator
                FOREIGN KEY (facilitator_id) REFERENCES facilitators(id)
                ON DELETE SET NULL;
        `;

        await connection.query(query);
        console.log('Column facilitator_id added successfully.');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column facilitator_id already exists.');
        } else {
            console.error('Error altering table:', error);
        }
    } finally {
        await connection.end();
        console.log('Connection closed.');
    }
}

addFacilitatorIdToEvents();
