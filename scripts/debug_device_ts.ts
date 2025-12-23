import pool from '../src/lib/db';
import { RowDataPacket } from 'mysql2';

async function checkDevice() {
    try {
        console.log('--- Checking Device 25 ---');
        // We need to cast the result to any or RowDataPacket[] because the pool types might be slightly different in raw script
        const [devices] = await pool.query<RowDataPacket[]>('SELECT * FROM devices WHERE id = ?', [25]);

        if (devices.length === 0) {
            console.log('Device 25 not found');
            return;
        }

        const device = devices[0];
        console.log('Device found:', JSON.stringify(device, null, 2));

        if (!device.room_id) {
            console.log('Device 25 has no room_id associated');
            return;
        }

        const roomId = device.room_id;
        console.log(`--- Checking Events for Room ${roomId} on 2025-12-22 ---`);

        // Query for events
        const [events] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM events WHERE room_id = ?`,
            [roomId]
        );

        console.log(`Total events for room ${roomId}: ${events.length}`);

        // Filter in JS to be sure about date matches
        const today = '2025-12-22';
        const targetDate = new Date(today);
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
        console.log(`Target Date: ${today}, Day: ${dayName}`);

        const todaysEvents = events.filter(e => {
            if (e.recurrence_days) {
                return e.recurrence_days.includes(dayName);
            } else {
                // One-off event
                const start = new Date(e.start_time).toISOString().split('T')[0];
                return start === today;
            }
        });

        console.log(`Events matching ${today} (${dayName}):`, todaysEvents.length);
        todaysEvents.forEach(e => {
            console.log(`- [${e.id}] ${e.title} (${e.recurrence_days ? 'Recurring: ' + e.recurrence_days : 'One-time'})`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        // pool.end() might not be available or needed depending on lib/db implementation
        process.exit(0);
    }
}

checkDevice();
