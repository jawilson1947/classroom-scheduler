import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

function generatePairingCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenant_id, room_id, pairing_code } = body;

        if (pairing_code) {
            // Device is submitting a pairing code to pair itself
            const [devices] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM devices WHERE pairing_code = ?',
                [pairing_code]
            );

            if (devices.length === 0) {
                return NextResponse.json({ error: 'Invalid pairing code' }, { status: 404 });
            }

            const device = devices[0];
            return NextResponse.json({
                success: true,
                device_id: device.id,
                room_id: device.room_id,
                tenant_id: device.tenant_id
            });
        } else {
            // Admin is generating a new pairing code
            const code = generatePairingCode();

            const [result] = await pool.query(
                'INSERT INTO devices (tenant_id, room_id, pairing_code) VALUES (?, ?, ?)',
                [tenant_id, room_id, code]
            );

            return NextResponse.json({
                success: true,
                pairing_code: code,
                device_id: (result as any).insertId
            }, { status: 201 });
        }
    } catch (error) {
        console.error('Error in device pairing:', error);
        return NextResponse.json({ error: 'Device pairing failed' }, { status: 500 });
    }
}
