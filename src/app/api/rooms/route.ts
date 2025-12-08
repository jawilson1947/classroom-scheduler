import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tenantId = searchParams.get('tenant_id') || '1';
        const buildingId = searchParams.get('building_id');

        let query = `
      SELECT r.id, r.tenant_id, r.building_id, r.name, r.capacity,
             b.name as building_name, 
             d.id as device_id, d.pairing_code, d.last_seen_at
      FROM rooms r
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN devices d ON r.id = d.room_id AND d.tenant_id = r.tenant_id
      WHERE r.tenant_id = ?
    `;
        const params: any[] = [tenantId];

        if (buildingId) {
            query += ' AND r.building_id = ?';
            params.push(buildingId);
        }

        query += ' ORDER BY b.name, r.name';

        const [rows] = await pool.query<RowDataPacket[]>(query, params);

        console.log('Rooms query result for tenant', tenantId, ':', JSON.stringify(rows, null, 2));

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenant_id, building_id, name, capacity, room_number } = body;

        if (!tenant_id || !building_id || !name) {
            return NextResponse.json({ error: 'Tenant ID, Building ID and Name are required' }, { status: 400 });
        }

        const [result] = await pool.query(
            'INSERT INTO rooms (tenant_id, building_id, name, capacity) VALUES (?, ?, ?, ?)',
            [tenant_id, building_id, name, capacity || 0]
        );

        return NextResponse.json({
            success: true,
            id: (result as any).insertId
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, building_id, capacity } = body;

        if (!id || !name || !building_id) {
            return NextResponse.json({
                error: 'ID, Name, and Building ID are required'
            }, { status: 400 });
        }

        await pool.query(
            'UPDATE rooms SET name = ?, building_id = ?, capacity = ? WHERE id = ?',
            [name, building_id, capacity || 0, id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating room:', error);
        return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
        }

        // Check for dependent devices and events
        const [devices] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM devices WHERE room_id = ?',
            [id]
        );
        const [events] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM events WHERE room_id = ?',
            [id]
        );

        const deviceCount = devices[0].count;
        const eventCount = events[0].count;

        if (deviceCount > 0 || eventCount > 0) {
            const dependencies = [];
            if (deviceCount > 0) dependencies.push(`${deviceCount} device(s)`);
            if (eventCount > 0) dependencies.push(`${eventCount} event(s)`);

            return NextResponse.json({
                error: 'Cannot delete room with dependencies',
                dependencies: dependencies.join(', ')
            }, { status: 409 });
        }

        await pool.query('DELETE FROM rooms WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }
}
