const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkDeviceEvents() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- Checking Device 25 ---');
        const [devices] = await pool.query('SELECT * FROM devices WHERE id = ?', [25]);
        if (devices.length === 0) {
            console.log('Device 25 not found');
            return;
        }
        const device = devices[0];
        console.log('Device:', device);

        if (!device.room_id) {
            console.log('Device 25 has no room_id associated');
            return;
        }

        console.log(`--- Checking Events for Room ${device.room_id} on 2025-12-22 ---`);
        // Check for specific date events
        const [events] = await pool.query(
            `SELECT * FROM events 
             WHERE room_id = ? 
             AND (
                -- Non-recurring events overlapping today
                (recurrence_days IS NULL AND start_time <= '2025-12-22 23:59:59' AND end_time >= '2025-12-22 00:00:00')
                OR
                -- Recurring events (simplified check for existence)
                (recurrence_days IS NOT NULL)
             )`,
            [device.room_id]
        );

        console.log(`Found ${events.length} potential events (both recurring and non-recurring):`);
        events.forEach(e => {
            console.log(`ID: ${e.id}, Title: ${e.title}, Type: ${e.recurrence_days ? 'Recurring (' + e.recurrence_days + ')' : 'Single'}, Start: ${e.start_time}, End: ${e.end_time}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkDeviceEvents();
