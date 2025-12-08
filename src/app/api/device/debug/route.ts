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

        return NextResponse.json(devices[0] || null);
    } catch (error) {
        console.error('Error fetching device:', error);
        return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 });
    }
}
