import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tenantId = searchParams.get('tenant_id');

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM facilitators WHERE tenant_id = ? ORDER BY last_name, first_name',
            [tenantId]
        );

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching facilitators:', error);
        return NextResponse.json({ error: 'Failed to fetch facilitators' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenant_id, first_name, last_name, name_on_door, bio, picture_url, icon_url } = body;

        // Basic validation
        if (!tenant_id || !first_name || !last_name || !name_on_door) {
            return NextResponse.json({ error: 'Missing mandatory fields' }, { status: 400 });
        }

        const [result] = await pool.query(
            `INSERT INTO facilitators (tenant_id, first_name, last_name, name_on_door, bio, picture_url, icon_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tenant_id, first_name, last_name, name_on_door, bio || null, picture_url || null, icon_url || null]
        );

        return NextResponse.json({ success: true, id: (result as any).insertId }, { status: 201 });
    } catch (error) {
        console.error('Error creating facilitator:', error);
        return NextResponse.json({ error: 'Failed to create facilitator' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, params } = body;

        // Handle both direct body update and nested params structure if necessary, 
        // but standardizing on flat body is better.
        // Let's assume standard flat body with ID
        const { tenant_id, first_name, last_name, name_on_door, bio, picture_url, icon_url } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await pool.query(
            `UPDATE facilitators 
             SET first_name = ?, last_name = ?, name_on_door = ?, bio = ?, picture_url = ?, icon_url = ?
             WHERE id = ? AND tenant_id = ?`,
            [first_name, last_name, name_on_door, bio || null, picture_url || null, icon_url || null, id, tenant_id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating facilitator:', error);
        return NextResponse.json({ error: 'Failed to update facilitator' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await pool.query('DELETE FROM facilitators WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting facilitator:', error);
        return NextResponse.json({ error: 'Failed to delete facilitator' }, { status: 500 });
    }
}
