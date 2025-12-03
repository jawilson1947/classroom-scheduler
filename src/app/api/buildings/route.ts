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
            'SELECT * FROM buildings WHERE tenant_id = ? ORDER BY name',
            [tenantId]
        );
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching buildings:', error);
        return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenant_id, name, time_zone } = body;

        if (!tenant_id || !name) {
            return NextResponse.json({ error: 'Tenant ID and Name are required' }, { status: 400 });
        }

        const [result] = await pool.query(
            'INSERT INTO buildings (tenant_id, name, time_zone) VALUES (?, ?, ?)',
            [tenant_id, name, time_zone || 'America/Chicago']
        );

        return NextResponse.json({
            success: true,
            id: (result as any).insertId
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating building:', error);
        return NextResponse.json({ error: 'Failed to create building' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, time_zone } = body;

        if (!id || !name) {
            return NextResponse.json({
                error: 'ID and Name are required'
            }, { status: 400 });
        }

        await pool.query(
            'UPDATE buildings SET name = ?, time_zone = ? WHERE id = ?',
            [name, time_zone || 'America/Chicago', id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating building:', error);
        return NextResponse.json({ error: 'Failed to update building' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
        }

        // Check for dependent rooms
        const [rooms] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM rooms WHERE building_id = ?',
            [id]
        );

        const roomCount = rooms[0].count;

        if (roomCount > 0) {
            return NextResponse.json({
                error: 'Cannot delete building with dependencies',
                dependencies: `${roomCount} room(s)`
            }, { status: 409 });
        }

        await pool.query('DELETE FROM buildings WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting building:', error);
        return NextResponse.json({ error: 'Failed to delete building' }, { status: 500 });
    }
}
