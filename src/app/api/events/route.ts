import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const roomId = searchParams.get('room_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const tenantId = searchParams.get('tenant_id') || '1'; // Default to tenant 1 for now

        let query = 'SELECT * FROM events WHERE tenant_id = ?';
        const params: any[] = [tenantId];

        if (roomId) {
            query += ' AND room_id = ?';
            params.push(roomId);
        }

        if (startDate && endDate) {
            query += ' AND start_time >= ? AND end_time <= ?';
            params.push(startDate, endDate);
        }

        query += ' ORDER BY start_time ASC';

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type } = body;

        // Check for conflicts
        const [conflicts] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM events 
       WHERE tenant_id = ? AND room_id = ? 
       AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))`,
            [tenant_id, room_id, end_time, start_time, end_time, start_time]
        );

        if (conflicts.length > 0) {
            return NextResponse.json({ error: 'Time conflict detected' }, { status: 409 });
        }

        const [result] = await pool.query(
            `INSERT INTO events (tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type]
        );

        return NextResponse.json({ success: true, id: (result as any).insertId }, { status: 201 });
    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
