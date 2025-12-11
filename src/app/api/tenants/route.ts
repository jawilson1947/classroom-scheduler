import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        // ORG_ADMIN, SCHEDULER, VIEWER can only see their own tenant
        if (['ORG_ADMIN', 'SCHEDULER', 'VIEWER'].includes(userRole)) {
            const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM tenants WHERE id = ?', [userTenantId]);
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
            }

            // If ID is provided, return object (specific fetch)
            if (id) {
                if (id !== userTenantId.toString()) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                return NextResponse.json(rows[0]);
            }

            // If no ID provided (listing), return array of 1
            return NextResponse.json(rows);
        }

        if (id) {
            const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM tenants WHERE id = ?', [id]);
            if (rows.length === 0) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
            }
            return NextResponse.json(rows[0]);
        }

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
        const { uuid, name, slug, time_zone, website, full_address, logo_url } = body;

        if (!uuid || !name || !slug || !time_zone) {
            return NextResponse.json({
                error: 'All fields are required (uuid, name, slug, time_zone)'
            }, { status: 400 });
        }

        const [result] = await pool.query(
            'INSERT INTO tenants (uuid, name, slug, time_zone, website, full_address, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuid, name, slug, time_zone, website || null, full_address || null, logo_url || null]
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

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, slug, time_zone, website, full_address, logo_url } = body;

        if (!id || !name || !slug || !time_zone) {
            return NextResponse.json({
                error: 'All fields are required (id, name, slug, time_zone)'
            }, { status: 400 });
        }

        await pool.query(
            'UPDATE tenants SET name = ?, slug = ?, time_zone = ?, website = ?, full_address = ?, logo_url = ? WHERE id = ?',
            [name, slug, time_zone, website || null, full_address || null, logo_url || null, id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating tenant:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({
                error: 'Slug already exists'
            }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
        }

        // Check for dependencies
        const [buildings] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM buildings WHERE tenant_id = ?',
            [id]
        );
        const [rooms] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM rooms WHERE tenant_id = ?',
            [id]
        );
        const [devices] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM devices WHERE tenant_id = ?',
            [id]
        );
        const [events] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM events WHERE tenant_id = ?',
            [id]
        );
        const [users] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
            [id]
        );

        const buildingCount = buildings[0].count;
        const roomCount = rooms[0].count;
        const deviceCount = devices[0].count;
        const eventCount = events[0].count;
        const userCount = users[0].count;

        if (buildingCount > 0 || roomCount > 0 || deviceCount > 0 || eventCount > 0 || userCount > 0) {
            const dependencies = [];
            if (buildingCount > 0) dependencies.push(`${buildingCount} building(s)`);
            if (roomCount > 0) dependencies.push(`${roomCount} room(s)`);
            if (deviceCount > 0) dependencies.push(`${deviceCount} device(s)`);
            if (eventCount > 0) dependencies.push(`${eventCount} event(s)`);
            if (userCount > 0) dependencies.push(`${userCount} user(s)`);

            return NextResponse.json({
                error: 'Cannot delete tenant with dependencies',
                dependencies: dependencies.join(', ')
            }, { status: 409 });
        }

        await pool.query('DELETE FROM tenants WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting tenant:', error);
        return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
    }
}
