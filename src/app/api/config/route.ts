import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tenantId = searchParams.get('tenant_id') || '1';

        const [tenants] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM tenants WHERE id = ?',
            [tenantId]
        );

        if (tenants.length === 0) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const tenant = tenants[0];

        return NextResponse.json({
            tenant_name: tenant.name,
            time_zone: tenant.time_zone,
            refresh_interval: 30000, // 30 seconds
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}
