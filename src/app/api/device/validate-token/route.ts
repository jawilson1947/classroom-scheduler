import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({
                error: 'Token is required'
            }, { status: 400 });
        }

        // Find the token in the database
        const [tokens] = await pool.query<RowDataPacket[]>(
            `SELECT id, room_id, tenant_id, expires_at, used 
             FROM pairing_tokens 
             WHERE token = ?`,
            [token]
        );

        if (tokens.length === 0) {
            return NextResponse.json({
                error: 'Invalid pairing token'
            }, { status: 404 });
        }

        const tokenData = tokens[0];

        // Check if token has already been used
        if (tokenData.used) {
            return NextResponse.json({
                error: 'This pairing token has already been used'
            }, { status: 400 });
        }

        // Check if token has expired
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({
                error: 'This pairing token has expired'
            }, { status: 400 });
        }

        // Mark token as used
        await pool.query(
            'UPDATE pairing_tokens SET used = TRUE WHERE id = ?',
            [tokenData.id]
        );

        // Create a device record (similar to pairing code method)
        // Generate a unique pairing code for this device
        const pairingCode = `URL-${token.substring(0, 6)}`;

        await pool.query(
            'INSERT INTO devices (tenant_id, room_id, pairing_code) VALUES (?, ?, ?)',
            [tokenData.tenant_id, tokenData.room_id, pairingCode]
        );

        // Return room and tenant information
        return NextResponse.json({
            success: true,
            room_id: tokenData.room_id,
            tenant_id: tokenData.tenant_id
        });

    } catch (error) {
        console.error('Error validating pairing token:', error);
        return NextResponse.json({
            error: 'Failed to validate pairing token'
        }, { status: 500 });
    }
}
