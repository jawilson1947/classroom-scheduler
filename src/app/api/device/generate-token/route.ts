import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;

        // Only ORG_ADMIN and SYSTEM_ADMIN can generate pairing tokens
        if (userRole !== 'ORG_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        let { room_id, tenant_id } = body;

        // Non-SYSTEM_ADMIN users can only generate tokens for their own tenant
        if (userRole !== 'SYSTEM_ADMIN') {
            tenant_id = userTenantId;
        }

        if (!room_id || !tenant_id) {
            return NextResponse.json({
                error: 'room_id and tenant_id are required'
            }, { status: 400 });
        }

        // Verify room exists and belongs to tenant
        const [rooms] = await pool.query(
            'SELECT id FROM rooms WHERE id = ? AND tenant_id = ?',
            [room_id, tenant_id]
        );

        if ((rooms as any[]).length === 0) {
            return NextResponse.json({
                error: 'Room not found or does not belong to tenant'
            }, { status: 404 });
        }

        // Generate a unique token (8 characters, URL-safe)
        const token = crypto.randomBytes(4).toString('hex').toUpperCase();

        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Insert token into database
        await pool.query(
            `INSERT INTO pairing_tokens (token, room_id, tenant_id, expires_at) 
             VALUES (?, ?, ?, ?)`,
            [token, room_id, tenant_id, expiresAt]
        );

        // Generate pairing URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const pairingUrl = `${baseUrl}/display/pair/${token}`;

        return NextResponse.json({
            success: true,
            token,
            pairingUrl,
            expiresAt: expiresAt.toISOString()
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error generating pairing token:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            // Retry with a new token
            return NextResponse.json({
                error: 'Token collision, please try again'
            }, { status: 500 });
        }

        return NextResponse.json({
            error: 'Failed to generate pairing token'
        }, { status: 500 });
    }
}
