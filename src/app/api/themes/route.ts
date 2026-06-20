import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/auth';
import { validateThemeDefinition } from '@/lib/themeValidation';

/**
 * Themes API (P4 — assignment/preview support).
 *
 * GET /api/themes?tenant_id=…   → active themes visible to the tenant
 *                                 (global `tenant_id IS NULL` + that tenant's own),
 *                                 each with its full `definition` so the web
 *                                 ThemePreview can render without N+1 detail calls.
 * GET /api/themes?id=…          → a single theme.
 *
 * Read access: any authenticated admin user. Non-SYSTEM_ADMIN roles are scoped to
 * their own tenant regardless of the tenant_id query param. Authoring (POST/PUT/
 * DELETE, SYSTEM_ADMIN-only) is a planned fast-follow and intentionally absent here.
 */

interface ThemeRow extends RowDataPacket {
    id: number;
    tenant_id: number | null;
    key_name: string;
    name: string;
    description: string | null;
    definition: unknown;
    thumbnail_url: string | null;
    is_system: number;
    schema_version: number;
    status: string;
}

function normalize(row: ThemeRow) {
    const definition =
        typeof row.definition === 'string' ? JSON.parse(row.definition) : row.definition;
    return {
        id: row.id,
        tenant_id: row.tenant_id,
        key_name: row.key_name,
        name: row.name,
        description: row.description,
        definition,
        thumbnail_url: row.thumbnail_url,
        is_system: row.is_system === 1,
        schema_version: row.schema_version,
    };
}

const SELECT =
    `SELECT id, tenant_id, key_name, name, description, definition, thumbnail_url, is_system, schema_version, status
       FROM themes`;

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenant_id;
        const isScopedRole = ['ORG_ADMIN', 'SCHEDULER', 'VIEWER'].includes(userRole);

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const requestedTenantId = searchParams.get('tenant_id');

        try {
            if (id) {
                const [rows] = await pool.query<ThemeRow[]>(
                    `${SELECT} WHERE id = ? AND status = 'active' LIMIT 1`,
                    [id]
                );
                if (rows.length === 0) {
                    return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
                }
                const theme = normalize(rows[0]);
                // Scoped roles may only see global or own-tenant themes.
                if (isScopedRole && theme.tenant_id != null && theme.tenant_id !== Number(userTenantId)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                return NextResponse.json(theme);
            }

            // List: global themes plus those of the effective tenant.
            const effectiveTenantId = isScopedRole ? userTenantId : requestedTenantId;
            let rows: ThemeRow[];
            if (effectiveTenantId) {
                [rows] = await pool.query<ThemeRow[]>(
                    `${SELECT}
                      WHERE status = 'active' AND (tenant_id IS NULL OR tenant_id = ?)
                      ORDER BY is_system DESC, name`,
                    [effectiveTenantId]
                );
            } else {
                // SYSTEM_ADMIN with no tenant context → global themes only.
                [rows] = await pool.query<ThemeRow[]>(
                    `${SELECT}
                      WHERE status = 'active' AND tenant_id IS NULL
                      ORDER BY is_system DESC, name`
                );
            }
            return NextResponse.json(rows.map(normalize));
        } catch (err: unknown) {
            // Pre-migration safety: themes table may not exist yet.
            if ((err as { code?: string })?.code === 'ER_NO_SUCH_TABLE') {
                return NextResponse.json([]);
            }
            throw err;
        }
    } catch (error) {
        console.error('Error fetching themes:', error);
        return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
    }
}

// ---- Authoring (create / edit / archive) -------------------------------------
//
// SYSTEM_ADMIN may manage global themes (tenant_id null) and any tenant's themes.
// ORG_ADMIN may manage only themes scoped to its own tenant (never global, never
// is_system). All definitions are validated against the v1 JSON Schema.

interface AuthCtx { role: string; tenantId: number | null; }

async function requireAuthor(): Promise<AuthCtx | NextResponse> {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any).role;
    const tenantId = (session.user as any).tenant_id ?? null;
    if (!['SYSTEM_ADMIN', 'ORG_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return { role, tenantId: tenantId != null ? Number(tenantId) : null };
}

const KEY_RE = /^[a-z0-9_]{1,64}$/;

export async function POST(request: NextRequest) {
    try {
        const ctx = await requireAuthor();
        if (ctx instanceof NextResponse) return ctx;

        const body = await request.json();
        const { key_name, name, description, definition } = body;
        let tenantId: number | null = body.tenant_id ?? null;

        if (!key_name || !name) {
            return NextResponse.json({ error: 'key_name and name are required' }, { status: 400 });
        }
        if (!KEY_RE.test(String(key_name))) {
            return NextResponse.json({ error: 'key_name must be lowercase letters, numbers, or underscores (max 64)' }, { status: 400 });
        }

        // Scope: ORG_ADMIN is forced to its own tenant; SYSTEM_ADMIN may pick null (global) or any tenant.
        if (ctx.role === 'ORG_ADMIN') {
            if (ctx.tenantId == null) return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
            if (tenantId != null && tenantId !== ctx.tenantId) {
                return NextResponse.json({ error: 'You can only create themes for your own organization' }, { status: 403 });
            }
            tenantId = ctx.tenantId;
        }

        const result = validateThemeDefinition(definition);
        if (!result.valid) {
            return NextResponse.json({ error: 'Invalid theme definition', details: result.errors }, { status: 400 });
        }

        const schemaVersion = (definition as { schemaVersion?: number }).schemaVersion ?? 1;
        try {
            const [res] = await pool.query(
                `INSERT INTO themes (tenant_id, key_name, name, description, definition, is_system, schema_version, status)
                 VALUES (?, ?, ?, ?, CAST(? AS JSON), 0, ?, 'active')`,
                [tenantId, key_name, name, description ?? null, JSON.stringify(definition), schemaVersion]
            );
            return NextResponse.json({ success: true, id: (res as any).insertId }, { status: 201 });
        } catch (err: any) {
            if (err?.code === 'ER_DUP_ENTRY') {
                return NextResponse.json({ error: 'A theme with this key already exists in this scope' }, { status: 409 });
            }
            throw err;
        }
    } catch (error) {
        console.error('Error creating theme:', error);
        return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 });
    }
}

/** Load a theme's ownership fields and enforce that the author may manage it. */
async function loadManageable(id: number, ctx: AuthCtx): Promise<{ tenant_id: number | null } | NextResponse> {
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, tenant_id, is_system FROM themes WHERE id = ?',
        [id]
    );
    if (rows.length === 0) return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    const t = rows[0];
    if (t.is_system === 1) {
        return NextResponse.json({ error: 'The system theme cannot be modified' }, { status: 403 });
    }
    if (ctx.role === 'ORG_ADMIN' && (t.tenant_id == null || Number(t.tenant_id) !== ctx.tenantId)) {
        return NextResponse.json({ error: 'You can only manage your own organization\'s themes' }, { status: 403 });
    }
    return { tenant_id: t.tenant_id ?? null };
}

export async function PUT(request: NextRequest) {
    try {
        const ctx = await requireAuthor();
        if (ctx instanceof NextResponse) return ctx;

        const body = await request.json();
        const { id, name, description, definition } = body;
        if (!id || !name) {
            return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
        }

        const owned = await loadManageable(Number(id), ctx);
        if (owned instanceof NextResponse) return owned;

        const result = validateThemeDefinition(definition);
        if (!result.valid) {
            return NextResponse.json({ error: 'Invalid theme definition', details: result.errors }, { status: 400 });
        }
        const schemaVersion = (definition as { schemaVersion?: number }).schemaVersion ?? 1;

        await pool.query(
            `UPDATE themes SET name = ?, description = ?, definition = CAST(? AS JSON), schema_version = ? WHERE id = ?`,
            [name, description ?? null, JSON.stringify(definition), schemaVersion, id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating theme:', error);
        return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const ctx = await requireAuthor();
        if (ctx instanceof NextResponse) return ctx;

        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 });

        const owned = await loadManageable(Number(id), ctx);
        if (owned instanceof NextResponse) return owned;

        // Soft-delete: archive so any assigned rooms/tenants fall back via resolution
        // (which only considers status='active'); avoids breaking displays.
        await pool.query(`UPDATE themes SET status = 'archived' WHERE id = ?`, [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error archiving theme:', error);
        return NextResponse.json({ error: 'Failed to archive theme' }, { status: 500 });
    }
}
