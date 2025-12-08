import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const deviceId = searchParams.get('device_id');

        if (!deviceId) {
            return NextResponse.json({ error: 'device_id required' }, { status: 400 });
        }

        const [devices] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM devices WHERE id = ?',
            [deviceId]
        );

        // DEBUG: Also fetch rooms for this tenant to see why it's not linking
        const tenantId = devices[0]?.tenant_id;
        let roomsData: any[] = [];
        if (tenantId) {
            const [rooms] = await pool.query<RowDataPacket[]>(`
                SELECT r.id, r.tenant_id, r.building_id, r.name, 
                       d.id as actual_device_id, d.last_seen_at
                FROM rooms r
                LEFT JOIN devices d ON r.id = d.room_id
                WHERE r.tenant_id = ?
             `, [tenantId]);
            roomsData = rooms;
        }

        return NextResponse.json({
            device: devices[0] || null,
            rooms_debug: roomsData
        });
    } catch (error) {
        console.error('Error fetching device:', error);
        return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 });
    }
}
