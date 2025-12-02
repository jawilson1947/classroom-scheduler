import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tenantId = searchParams.get('tenant_id') || '1';
        const buildingId = searchParams.get('building_id');

        let query = `
      SELECT r.*, b.name as building_name, 
             d.id as device_id, d.pairing_code, d.last_seen_at
      FROM rooms r
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN devices d ON r.id = d.room_id
      WHERE r.tenant_id = ?
    `;
        const params: any[] = [tenantId];

        if (buildingId) {
            query += ' AND r.building_id = ?';
            params.push(buildingId);
        }

        query += ' ORDER BY b.name, r.name';

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}
