import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { resolveThemesForRooms } from '@/lib/themes';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tenantId = searchParams.get('tenant_id');
        const buildingId = searchParams.get('building_id');
        const id = searchParams.get('id');

        let query = `
          SELECT r.id, r.tenant_id, r.building_id, r.name, r.capacity, r.theme_id,
             b.name as building_name,
             t.name as tenant_name, t.full_address as tenant_address, t.logo_url as tenant_logo_url,
             t.default_theme_id as tenant_default_theme_id,
             d.id as linked_device_id, d.pairing_code, d.last_seen_at
      FROM rooms r
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN devices d ON r.id = d.room_id AND d.tenant_id = r.tenant_id
    `;
        const params: any[] = [];

        if (id) {
            query += ' WHERE r.id = ?';
            params.push(id);
        } else if (tenantId) {
            query += ' WHERE r.tenant_id = ?';
            params.push(tenantId);

            if (buildingId) {
                query += ' AND r.building_id = ?';
                params.push(buildingId);
            }
        } else {
            // Fallback or Error? If no ID and no TenantID, maybe return empty or limit?
            // For now, let's require at least one, or default to tenant 1 if implied?
            // The original code fell back to '1'.
            query += ' WHERE r.tenant_id = ?';
            params.push('1');
        }

        query += ' ORDER BY b.name, r.name';

        const [rows] = await pool.query<RowDataPacket[]>(query, params);

        // Attach the server-resolved display theme (room > tenant default > system).
        // Additive: `resolved_theme` is null if nothing resolves; clients fall back
        // to their built-in system_default and older shipped apps ignore the field.
        let withThemes: RowDataPacket[] = rows;
        try {
            const resolved = await resolveThemesForRooms(
                rows.map((r) => ({
                    tenant_id: r.tenant_id ?? null,
                    theme_id: r.theme_id ?? null,
                    tenant_default_theme_id: r.tenant_default_theme_id ?? null,
                }))
            );
            withThemes = rows.map((r, i) => ({ ...r, resolved_theme: resolved[i] }));
        } catch (themeErr) {
            console.error('Theme resolution failed; serving rooms without resolved_theme:', themeErr);
            withThemes = rows.map((r) => ({ ...r, resolved_theme: null }));
        }

        return NextResponse.json(withThemes);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenant_id, building_id, name, capacity, room_number } = body;

        if (!tenant_id || !building_id || !name) {
            return NextResponse.json({ error: 'Tenant ID, Building ID and Name are required' }, { status: 400 });
        }

        // Check for duplicates
        const [existing] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM rooms WHERE building_id = ? AND name = ?',
            [building_id, name]
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: 'A room with this name already exists in this building.' }, { status: 409 });
        }

        const [result] = await pool.query(
            'INSERT INTO rooms (tenant_id, building_id, name, capacity) VALUES (?, ?, ?, ?)',
            [tenant_id, building_id, name, capacity || 0]
        );

        return NextResponse.json({
            success: true,
            id: (result as any).insertId
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, building_id, capacity } = body;

        if (!id || !name || !building_id) {
            return NextResponse.json({
                error: 'ID, Name, and Building ID are required'
            }, { status: 400 });
        }

        // Check for duplicates (excluding current room)
        const [existing] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM rooms WHERE building_id = ? AND name = ? AND id != ?',
            [building_id, name, id]
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: 'A room with this name already exists in this building.' }, { status: 409 });
        }

        await pool.query(
            'UPDATE rooms SET name = ?, building_id = ?, capacity = ? WHERE id = ?',
            [name, building_id, capacity || 0, id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating room:', error);
        return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
        }

        // Check for dependent devices and events
        const [devices] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM devices WHERE room_id = ?',
            [id]
        );
        const [events] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM events WHERE room_id = ?',
            [id]
        );

        const deviceCount = devices[0].count;
        const eventCount = events[0].count;

        if (deviceCount > 0 || eventCount > 0) {
            const dependencies = [];
            if (deviceCount > 0) dependencies.push(`${deviceCount} device(s)`);
            if (eventCount > 0) dependencies.push(`${eventCount} event(s)`);

            return NextResponse.json({
                error: 'Cannot delete room with dependencies',
                dependencies: dependencies.join(', ')
            }, { status: 409 });
        }

        await pool.query('DELETE FROM rooms WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }
}

/**
 * PATCH /api/rooms — assign or clear a room's display theme override.
 * Body: { id, theme_id }  (theme_id: number to assign, null to clear → falls back
 * to the tenant default, then system_default via server-side resolution).
 *
 * Restricted to SYSTEM_ADMIN and ORG_ADMIN. ORG_ADMIN is scoped to its own tenant,
 * and an assigned theme must be visible to that tenant (global or same-tenant).
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;
        if (!['SYSTEM_ADMIN', 'ORG_ADMIN'].includes(userRole)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id } = body;
        const themeId: number | null = body.theme_id ?? null;

        if (!id) {
            return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
        }

        // Load the room's tenant for scoping checks.
        const [roomRows] = await pool.query<RowDataPacket[]>(
            'SELECT tenant_id FROM rooms WHERE id = ?',
            [id]
        );
        if (roomRows.length === 0) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        const roomTenantId = roomRows[0].tenant_id as number | null;

        if (userRole === 'ORG_ADMIN' && roomTenantId !== Number(userTenantId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Validate the theme exists, is active, and is visible to the room's tenant.
        if (themeId != null) {
            const [themeRows] = await pool.query<RowDataPacket[]>(
                `SELECT id, tenant_id FROM themes WHERE id = ? AND status = 'active'`,
                [themeId]
            );
            if (themeRows.length === 0) {
                return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
            }
            const themeTenantId = themeRows[0].tenant_id as number | null;
            if (themeTenantId != null && themeTenantId !== roomTenantId) {
                return NextResponse.json({ error: 'Theme not available to this room\'s tenant' }, { status: 403 });
            }
        }

        await pool.query('UPDATE rooms SET theme_id = ? WHERE id = ?', [themeId, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error assigning room theme:', error);
        return NextResponse.json({ error: 'Failed to assign theme' }, { status: 500 });
    }
}
