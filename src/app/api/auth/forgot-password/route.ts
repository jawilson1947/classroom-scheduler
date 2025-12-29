import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { RowDataPacket } from 'mysql2';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Check if user exists
        const [users] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);

        // Security: Always return success even if user not found to prevent user enumeration
        if (!users || users.length === 0) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return NextResponse.json({ success: true, message: 'If an account exists with this email, you will receive a reset link.' });
        }

        // 2. Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration

        // 3. Save to DB
        await pool.query(
            'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
            [email, token, expiresAt]
        );

        // 4. Send Email
        // Construct Reset URL
        // Use Host header to determine domain dynamically
        const host = req.headers.get('host');
        const protocol = host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https';
        const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;

        await sendEmail({
            to: email,
            subject: 'Reset Your Password - Classroom Scheduler',
            text: `You requested a password reset. Click the following link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.`,
            html: `
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your Classroom Scheduler account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p>${resetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request this password reset, please ignore this email.</p>
            `
        });

        return NextResponse.json({ success: true, message: 'If an account exists with this email, you will receive a reset link.' });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        return NextResponse.json({ error: 'Internal User error' }, { status: 500 });
    }
}
