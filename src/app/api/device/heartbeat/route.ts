import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { device_id } = body;

        if (!device_id) {
            return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
        }

        await pool.query(
            'UPDATE devices SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?',
            [device_id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating device heartbeat:', error);
        return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }
}
