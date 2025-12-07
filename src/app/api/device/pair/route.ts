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



export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const device_id = searchParams.get('device_id');
        const room_id = searchParams.get('room_id');

        if (!device_id && !room_id) {
            return NextResponse.json({ error: 'device_id or room_id is required' }, { status: 400 });
        }

        let query = '';
        let params: any[] = [];

        if (device_id) {
            query = 'DELETE FROM devices WHERE id = ?';
            params = [device_id];
        } else {
            query = 'DELETE FROM devices WHERE room_id = ?';
            params = [room_id];
        }

        // Also nullify device_id in rooms table if it exists there
        if (room_id) {
            await pool.query('UPDATE rooms SET device_id = NULL WHERE id = ?', [room_id]);
        } else if (device_id) {
            // If we only have device_id, we should find the room first to clear it, or assume constraint handles it
            // For safety/simplicity, let's just delete the device. 
            // If the FK is ON DELETE SET NULL, it's automatic. If not, we might need manual update.
            // Given the previous code didn't show the schema, I'll assume manual update is safer.
            await pool.query('UPDATE rooms SET device_id = NULL WHERE device_id = ?', [device_id]);
        }

        await pool.query(query, params);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error unpairing device:', error);
        return NextResponse.json({ error: 'Failed to unpair device' }, { status: 500 });
    }
}
