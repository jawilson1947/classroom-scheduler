import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Force dynamic to ensure we get fresh results
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const deviceId = 25;
        console.log(`--- Checking Device ${deviceId} via Debug API ---`);

        const [devices] = await pool.query<RowDataPacket[]>('SELECT * FROM devices WHERE id = ?', [deviceId]);

        if (devices.length === 0) {
            return NextResponse.json({ error: 'Device 25 not found' });
        }

        const device = devices[0];
        if (!device.room_id) {
            return NextResponse.json({ error: 'Device 25 has no room_id', device });
        }

        const roomId = device.room_id;

        // Query for events
        const [events] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM events WHERE room_id = ?`,
            [roomId]
        );

        const today = '2025-12-22';
        // Create date as local noon to avoid timezone rollover issues
        const targetDate = new Date(today + 'T12:00:00');
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

        const todaysEvents = events.filter(e => {
            if (e.recurrence_days) {
                return e.recurrence_days.includes(dayName);
            } else {
                const start = new Date(e.start_time).toISOString().split('T')[0];
                return start === today;
            }
        });

        // Also check if any raw SQL filter matches differently
        const [rawEvents] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM events 
             WHERE room_id = ? 
             AND (
                (recurrence_days IS NULL AND start_time <= ? AND end_time >= ?)
                OR
                (recurrence_days LIKE ?)
             )`,
            [roomId, `${today} 23:59:59`, `${today} 00:00:00`, `%${dayName}%`]
        );

        return NextResponse.json({
            device,
            roomId,
            today,
            dayName,
            totalEventsForRoom: events.length,
            filteredEventsCount: todaysEvents.length,
            filteredEvents: todaysEvents,
            rawSqlEventsCount: rawEvents.length,
            rawSqlEvents: rawEvents
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
