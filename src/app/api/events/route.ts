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

        // Helper to formatting ISO string to MySQL DATETIME
        const formatToMySQL = (iso: string) => iso.slice(0, 19).replace('T', ' ');
        const start_time_db = formatToMySQL(start_time);
        const end_time_db = formatToMySQL(end_time);

        // Ensure undefined optional fields are null
        const recurrence_days = body.recurrence_days || null;
        const daily_start_time = body.daily_start_time || null;
        const daily_end_time = body.daily_end_time || null;

        // Check for conflicts - need to handle both recurring and non-recurring events
        // For recurring events, check if they occur on the same days of the week with overlapping times
        // For non-recurring events, check if they overlap on any specific day

        const [existingEvents] = await pool.query<RowDataPacket[]>(
            `SELECT id, title, start_time, end_time, recurrence_days, daily_start_time, daily_end_time 
             FROM events 
             WHERE tenant_id = ? AND room_id = ?`,
            [tenant_id, room_id]
        );

        const conflicts: any[] = [];
        const isNewRecurring = body.recurrence_days && body.daily_start_time && body.daily_end_time;

        for (const existing of existingEvents) {
            const isExistingRecurring = existing.recurrence_days && existing.daily_start_time && existing.daily_end_time;

            if (isNewRecurring && isExistingRecurring) {
                // Both are recurring - check if they share any days of the week
                const newDays = body.recurrence_days.split(',');
                const existingDays = existing.recurrence_days.split(',');
                const sharedDays = newDays.filter((day: string) => existingDays.includes(day));

                if (sharedDays.length > 0) {
                    // They occur on the same day(s), check if times overlap
                    const newStart = body.daily_start_time;
                    const newEnd = body.daily_end_time;
                    const existingStart = existing.daily_start_time;
                    const existingEnd = existing.daily_end_time;

                    // Check for time overlap: (start1 < end2) AND (end1 > start2)
                    if (newStart < existingEnd && newEnd > existingStart) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            recurrence_days: existing.recurrence_days,
                            daily_start_time: existing.daily_start_time,
                            daily_end_time: existing.daily_end_time,
                            shared_days: sharedDays
                        });
                    }
                }
            } else if (isNewRecurring && !isExistingRecurring) {
                // New is recurring, existing is one-time
                // Check if the one-time event falls on a day when the recurring event occurs
                const existingDate = new Date(existing.start_time);
                const dayOfWeek = existingDate.toLocaleDateString('en-US', { weekday: 'short' });

                if (body.recurrence_days.includes(dayOfWeek)) {
                    // Extract time from existing event
                    const existingStartTime = existing.start_time.split('T')[1] || existing.start_time.substring(11, 19);
                    const existingEndTime = existing.end_time.split('T')[1] || existing.end_time.substring(11, 19);

                    // Check if times overlap
                    if (body.daily_start_time < existingEndTime && body.daily_end_time > existingStartTime) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            start_time: existing.start_time,
                            end_time: existing.end_time
                        });
                    }
                }
            } else if (!isNewRecurring && isExistingRecurring) {
                // New is one-time, existing is recurring
                const newDate = new Date(start_time);
                const dayOfWeek = newDate.toLocaleDateString('en-US', { weekday: 'short' });

                if (existing.recurrence_days.includes(dayOfWeek)) {
                    // Extract time from new event
                    const newStartTime = start_time.split('T')[1] || start_time.substring(11, 19);
                    const newEndTime = end_time.split('T')[1] || end_time.substring(11, 19);

                    // Check if times overlap
                    if (newStartTime < existing.daily_end_time && newEndTime > existing.daily_start_time) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            recurrence_days: existing.recurrence_days,
                            daily_start_time: existing.daily_start_time,
                            daily_end_time: existing.daily_end_time
                        });
                    }
                }
            } else {
                // Both are one-time events
                // Check if they occur on the same day
                const newDate = new Date(start_time);
                const existingDate = new Date(existing.start_time);

                // Compare dates (ignore time)
                const newDay = newDate.toISOString().split('T')[0];
                const existingDay = existingDate.toISOString().split('T')[0];

                if (newDay === existingDay) {
                    // Same day, check if times overlap
                    if (start_time < existing.end_time && end_time > existing.start_time) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            start_time: existing.start_time,
                            end_time: existing.end_time
                        });
                    }
                }
            }
        }

        // If conflicts exist and not forced, return conflict details
        if (conflicts.length > 0 && !force) {
            return NextResponse.json({
                error: 'Time conflict detected',
                conflicts
            }, { status: 409 });
        }

        const [result] = await pool.query(
            `INSERT INTO events (tenant_id, room_id, title, facilitator_name, start_time, end_time, description, event_type, recurrence_days, daily_start_time, daily_end_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenant_id, room_id, title, facilitator_name, start_time_db, end_time_db, description, event_type, recurrence_days, daily_start_time, daily_end_time]
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

        // Helper to formatting ISO string to MySQL DATETIME
        const formatToMySQL = (iso: string) => iso.slice(0, 19).replace('T', ' ');
        const start_time_db = formatToMySQL(start_time);
        const end_time_db = formatToMySQL(end_time);

        // Ensure undefined optional fields are null
        const recurrence_days = body.recurrence_days || null;
        const daily_start_time = body.daily_start_time || null;
        const daily_end_time = body.daily_end_time || null;

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // Check for conflicts (excluding current event)
        const [existingEvents] = await pool.query<RowDataPacket[]>(
            `SELECT id, title, start_time, end_time, recurrence_days, daily_start_time, daily_end_time 
             FROM events 
             WHERE tenant_id = ? AND room_id = ? AND id != ?`,
            [tenant_id, room_id, id]
        );

        const conflicts: any[] = [];
        const isNewRecurring = body.recurrence_days && body.daily_start_time && body.daily_end_time;

        for (const existing of existingEvents) {
            const isExistingRecurring = existing.recurrence_days && existing.daily_start_time && existing.daily_end_time;

            if (isNewRecurring && isExistingRecurring) {
                const newDays = body.recurrence_days.split(',');
                const existingDays = existing.recurrence_days.split(',');
                const sharedDays = newDays.filter((day: string) => existingDays.includes(day));

                if (sharedDays.length > 0) {
                    const newStart = body.daily_start_time;
                    const newEnd = body.daily_end_time;
                    const existingStart = existing.daily_start_time;
                    const existingEnd = existing.daily_end_time;

                    if (newStart < existingEnd && newEnd > existingStart) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            recurrence_days: existing.recurrence_days,
                            daily_start_time: existing.daily_start_time,
                            daily_end_time: existing.daily_end_time,
                            shared_days: sharedDays
                        });
                    }
                }
            } else if (isNewRecurring && !isExistingRecurring) {
                const existingDate = new Date(existing.start_time);
                const dayOfWeek = existingDate.toLocaleDateString('en-US', { weekday: 'short' });

                if (body.recurrence_days.includes(dayOfWeek)) {
                    const existingStartTime = existing.start_time.split('T')[1] || existing.start_time.substring(11, 19);
                    const existingEndTime = existing.end_time.split('T')[1] || existing.end_time.substring(11, 19);

                    if (body.daily_start_time < existingEndTime && body.daily_end_time > existingStartTime) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            start_time: existing.start_time,
                            end_time: existing.end_time
                        });
                    }
                }
            } else if (!isNewRecurring && isExistingRecurring) {
                const newDate = new Date(start_time);
                const dayOfWeek = newDate.toLocaleDateString('en-US', { weekday: 'short' });

                if (existing.recurrence_days.includes(dayOfWeek)) {
                    const newStartTime = start_time.split('T')[1] || start_time.substring(11, 19);
                    const newEndTime = end_time.split('T')[1] || end_time.substring(11, 19);

                    if (newStartTime < existing.daily_end_time && newEndTime > existing.daily_start_time) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            recurrence_days: existing.recurrence_days,
                            daily_start_time: existing.daily_start_time,
                            daily_end_time: existing.daily_end_time
                        });
                    }
                }
            } else {
                const newDate = new Date(start_time);
                const existingDate = new Date(existing.start_time);

                const newDay = newDate.toISOString().split('T')[0];
                const existingDay = existingDate.toISOString().split('T')[0];

                if (newDay === existingDay) {
                    if (start_time < existing.end_time && end_time > existing.start_time) {
                        conflicts.push({
                            id: existing.id,
                            title: existing.title,
                            start_time: existing.start_time,
                            end_time: existing.end_time
                        });
                    }
                }
            }
        }

        // If conflicts exist and not forced, return conflict details
        if (conflicts.length > 0 && !force) {
            return NextResponse.json({
                error: 'Time conflict detected',
                conflicts
            }, { status: 409 });
        }

        await pool.query(
            `UPDATE events 
       SET title = ?, facilitator_name = ?, start_time = ?, end_time = ?, description = ?, event_type = ?, room_id = ?, recurrence_days = ?, daily_start_time = ?, daily_end_time = ?
       WHERE id = ? AND tenant_id = ?`,
            [title, facilitator_name, start_time_db, end_time_db, description, event_type, room_id, recurrence_days, daily_start_time, daily_end_time, id, tenant_id]
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
