import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }

        // 1. Verify token
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT email, expires_at FROM password_reset_tokens WHERE token = ?',
            [token]
        );

        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        const resetRequest = rows[0];
        const now = new Date();
        const expiresAt = new Date(resetRequest.expires_at);

        if (now > expiresAt) {
            // Clean up expired token
            await pool.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        // 2. Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Update User Password
        await pool.query(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hashedPassword, resetRequest.email]
        );

        // 4. Delete used token (and potentially all other tokens for this user)
        await pool.query(
            'DELETE FROM password_reset_tokens WHERE email = ?',
            [resetRequest.email]
        );

        return NextResponse.json({ success: true, message: 'Password has been reset successfully' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
