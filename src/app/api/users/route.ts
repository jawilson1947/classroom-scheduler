import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;

        // Only ORG_ADMIN and SYSTEM_ADMIN can view users
        if (userRole !== 'ORG_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        let tenantId = searchParams.get('tenant_id');

        // Non-SYSTEM_ADMIN users can only see their own tenant
        if (userRole !== 'SYSTEM_ADMIN') {
            tenantId = userTenantId.toString();
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, tenant_id, email, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;

        if (userRole !== 'ORG_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        let { tenant_id, email, password, role } = body;

        // Non-SYSTEM_ADMIN users can only create users in their own tenant
        if (userRole !== 'SYSTEM_ADMIN') {
            tenant_id = userTenantId;
            // Prevent creating SYSTEM_ADMIN
            if (role === 'SYSTEM_ADMIN') {
                return NextResponse.json({ error: 'Forbidden: Cannot create System Admin' }, { status: 403 });
            }
        }

        if (!tenant_id || !email || !password || !role) {
            return NextResponse.json({
                error: 'All fields are required (tenant_id, email, password, role)'
            }, { status: 400 });
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json({
                error: 'Password must be at least 8 characters'
            }, { status: 400 });
        }

        // Validate role
        const validRoles = ['SYSTEM_ADMIN', 'ORG_ADMIN', 'SCHEDULER', 'VIEWER'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO users (tenant_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [tenant_id, email, password_hash, role]
        );

        return NextResponse.json({
            success: true,
            id: (result as any).insertId
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating user:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({
                error: 'Email already exists for this tenant'
            }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;

        if (userRole !== 'ORG_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id, email, password, role, tenant_id } = body;

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Verify the user belongs to allowed tenant
        if (userRole !== 'SYSTEM_ADMIN') {
            const [userCheck] = await pool.query<RowDataPacket[]>(
                'SELECT tenant_id FROM users WHERE id = ?',
                [id]
            );
            if (userCheck.length === 0 || userCheck[0].tenant_id !== userTenantId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];

        if (email) {
            updates.push('email = ?');
            values.push(email);
        }

        if (role) {
            const validRoles = ['SYSTEM_ADMIN', 'ORG_ADMIN', 'SCHEDULER', 'VIEWER'];
            if (!validRoles.includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }

            // Prevent non-SYSTEM_ADMIN from promoting to SYSTEM_ADMIN
            if (role === 'SYSTEM_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
                return NextResponse.json({ error: 'Forbidden: Cannot assign System Admin role' }, { status: 403 });
            }

            updates.push('role = ?');
            values.push(role);
        }

        // Allow tenant_id update only for SYSTEM_ADMIN
        if (tenant_id && userRole === 'SYSTEM_ADMIN') {
            updates.push('tenant_id = ?');
            values.push(tenant_id);
        }

        if (password) {
            if (password.length < 8) {
                return NextResponse.json({
                    error: 'Password must be at least 8 characters'
                }, { status: 400 });
            }
            const password_hash = await bcrypt.hash(password, 10);
            updates.push('password_hash = ?');
            values.push(password_hash);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating user:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({
                error: 'Email already exists for this tenant'
            }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;
        const currentUserId = (session.user as any).id;

        if (userRole !== 'ORG_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Prevent deleting yourself
        if (id === currentUserId) {
            return NextResponse.json({
                error: 'Cannot delete your own account'
            }, { status: 400 });
        }

        // Verify the user belongs to allowed tenant
        if (userRole !== 'SYSTEM_ADMIN') {
            const [userCheck] = await pool.query<RowDataPacket[]>(
                'SELECT tenant_id FROM users WHERE id = ?',
                [id]
            );
            if (userCheck.length === 0 || userCheck[0].tenant_id !== userTenantId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
