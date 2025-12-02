import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM tenants ORDER BY name');
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uuid, name, slug, time_zone } = body;

        if (!uuid || !name || !slug || !time_zone) {
            return NextResponse.json({
                error: 'All fields are required (uuid, name, slug, time_zone)'
            }, { status: 400 });
        }

        const [result] = await pool.query(
            'INSERT INTO tenants (uuid, name, slug, time_zone) VALUES (?, ?, ?, ?)',
            [uuid, name, slug, time_zone]
        );

        return NextResponse.json({
            success: true,
            id: (result as any).insertId,
            uuid,
            name,
            slug
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating tenant:', error);

        // Handle duplicate UUID or slug
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({
                error: 'UUID or slug already exists'
            }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }
}
