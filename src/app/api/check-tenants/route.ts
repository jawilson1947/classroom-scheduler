
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT u.tenant_id, t.name as tenant_name 
             FROM users u 
             JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.email = ?`,
            [email]
        );

        return NextResponse.json({ tenants: rows });
    } catch (error) {
        console.error('Error checking tenants:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
