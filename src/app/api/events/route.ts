import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/auth';
import broadcaster from '@/lib/eventBroadcaster';

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
            // Check for overlap: event starts before query ends AND event ends after query starts
            query += ' AND start_time < ? AND end_time > ?';
            params.push(endDate, startDate);
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
        const { tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type, force } = body;

        // Check for conflicts
        const [conflicts] = await pool.query<RowDataPacket[]>(
            `SELECT id, title, start_time, end_time FROM events 
       WHERE tenant_id = ? AND room_id = ? 
       AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))`,
            [tenant_id, room_id, end_time, start_time, end_time, start_time]
        );

        // If conflicts exist and not forced, return conflict details
        if (conflicts.length > 0 && !force) {
            return NextResponse.json({
                error: 'Time conflict detected',
                conflicts: conflicts.map(c => ({
                    id: c.id,
                    title: c.title,
                    start_time: c.start_time,
                    end_time: c.end_time
                }))
            }, { status: 409 });
        }

        const [result] = await pool.query(
            `INSERT INTO events (tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type, recurrence_days, daily_start_time, daily_end_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type, body.recurrence_days, body.daily_start_time, body.daily_end_time]
        );

        // Broadcast the event creation to all connected clients
        broadcaster.broadcast('event_created', {
            id: (result as any).insertId,
            room_id,
            tenant_id
        });

        return NextResponse.json({ success: true, id: (result as any).insertId }, { status: 201 });
    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type, force } = body;

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // Check for conflicts (excluding current event)
        const [conflicts] = await pool.query<RowDataPacket[]>(
            `SELECT id, title, start_time, end_time FROM events 
       WHERE tenant_id = ? AND room_id = ? AND id != ?
       AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))`,
            [tenant_id, room_id, id, end_time, start_time, end_time, start_time]
        );

        // If conflicts exist and not forced, return conflict details
        if (conflicts.length > 0 && !force) {
            return NextResponse.json({
                error: 'Time conflict detected',
                conflicts: conflicts.map(c => ({
                    id: c.id,
                    title: c.title,
                    start_time: c.start_time,
                    end_time: c.end_time
                }))
            }, { status: 409 });
        }

        await pool.query(
            `UPDATE events 
       SET title = ?, facilitator_name = ?, start_time = ?, end_time = ?, description = ?, event_type = ?, room_id = ?, recurrence_days = ?, daily_start_time = ?, daily_end_time = ?
       WHERE id = ? AND tenant_id = ?`,
            [title, facilitator_name, start_time, end_time, description, event_type, room_id, body.recurrence_days, body.daily_start_time, body.daily_end_time, id, tenant_id]
        );

        // Broadcast the event update to all connected clients
        broadcaster.broadcast('event_updated', {
            id,
            room_id,
            tenant_id
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        await pool.query('DELETE FROM events WHERE id = ?', [id]);

        // Broadcast the event deletion to all connected clients
        broadcaster.broadcast('event_deleted', {
            id: parseInt(id)
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
