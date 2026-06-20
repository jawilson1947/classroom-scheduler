import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

/**
 * Display Theme resolution (P1).
 *
 * Precedence is resolved server-side so the native clients never implement it:
 *   1. rooms.theme_id        (the room's own override, if set & active)
 *   2. tenants.default_theme_id (the tenant default, if set & active)
 *   3. the is_system = 1 theme  (system_default — always present once seeded)
 *
 * The result is attached to /api/rooms rows as `resolved_theme`. It is additive:
 * if nothing resolves (e.g. migrations not yet run, or themes archived), the
 * value is `null` and clients fall back to their built-in system_default look.
 */

export interface ResolvedTheme {
    id: number;
    key_name: string;
    name: string;
    schema_version: number;
    /** The full theme spec; shape is documented by docs/theme.schema.v1.json. */
    definition: Record<string, unknown>;
}

interface ThemeRow extends RowDataPacket {
    id: number;
    key_name: string;
    name: string;
    schema_version: number;
    is_system: number;
    definition: unknown;
}

function toResolved(row: ThemeRow): ResolvedTheme {
    // mysql2 returns JSON columns already parsed; tolerate a string just in case.
    const definition =
        typeof row.definition === 'string'
            ? JSON.parse(row.definition)
            : (row.definition as Record<string, unknown>);
    return {
        id: row.id,
        key_name: row.key_name,
        name: row.name,
        schema_version: row.schema_version,
        definition,
    };
}

/**
 * Load all active themes that could be needed to resolve the given rooms, in a
 * single query: the rooms' own theme_ids, their tenants' defaults, plus the
 * system theme. Returns a map keyed by theme id and the system theme (if any).
 */
async function loadCandidateThemes(
    themeIds: number[],
    tenantIds: number[]
): Promise<{ byId: Map<number, ThemeRow>; system: ThemeRow | null }> {
    const byId = new Map<number, ThemeRow>();
    let system: ThemeRow | null = null;

    try {
        // Tenant defaults for the tenants in play.
        let tenantDefaultIds: number[] = [];
        if (tenantIds.length > 0) {
            const [tenantRows] = await pool.query<RowDataPacket[]>(
                `SELECT default_theme_id FROM tenants
                  WHERE id IN (${tenantIds.map(() => '?').join(',')})
                    AND default_theme_id IS NOT NULL`,
                tenantIds
            );
            tenantDefaultIds = tenantRows.map((r) => r.default_theme_id as number);
        }

        const wantedIds = Array.from(new Set([...themeIds, ...tenantDefaultIds])).filter(
            (v) => v != null
        );

        if (wantedIds.length > 0) {
            const [rows] = await pool.query<ThemeRow[]>(
                `SELECT id, key_name, name, schema_version, is_system, definition
                   FROM themes
                  WHERE status = 'active' AND id IN (${wantedIds.map(() => '?').join(',')})`,
                wantedIds
            );
            for (const r of rows) byId.set(r.id, r);
        }

        // System default (always fetched as the final fallback).
        const [sysRows] = await pool.query<ThemeRow[]>(
            `SELECT id, key_name, name, schema_version, is_system, definition
               FROM themes
              WHERE status = 'active' AND is_system = 1
              LIMIT 1`
        );
        system = sysRows[0] ?? null;
        if (system) byId.set(system.id, system);
    } catch (err: unknown) {
        // Pre-migration safety: themes table may not exist yet. Treat as "no themes".
        if ((err as { code?: string })?.code === 'ER_NO_SUCH_TABLE') {
            return { byId, system: null };
        }
        throw err;
    }

    return { byId, system };
}

/** A minimal description of a room needed to resolve its theme. */
export interface RoomThemeInputs {
    tenant_id: number | null;
    theme_id: number | null;
    /** The tenant's default_theme_id, if already known from the join. */
    tenant_default_theme_id?: number | null;
}

/**
 * Resolve themes for many rooms with a bounded number of queries (no N+1).
 * Returns an array of ResolvedTheme | null aligned to the input order.
 */
export async function resolveThemesForRooms(
    rooms: RoomThemeInputs[]
): Promise<(ResolvedTheme | null)[]> {
    if (rooms.length === 0) return [];

    const themeIds = rooms
        .map((r) => r.theme_id)
        .filter((v): v is number => v != null);
    const tenantIds = Array.from(
        new Set(rooms.map((r) => r.tenant_id).filter((v): v is number => v != null))
    );

    const { byId, system } = await loadCandidateThemes(themeIds, tenantIds);

    // Tenant id -> default theme id, derived from the candidate load.
    let tenantDefault = new Map<number, number>();
    if (tenantIds.length > 0) {
        try {
            const [tenantRows] = await pool.query<RowDataPacket[]>(
                `SELECT id, default_theme_id FROM tenants
                  WHERE id IN (${tenantIds.map(() => '?').join(',')})`,
                tenantIds
            );
            tenantDefault = new Map(
                tenantRows
                    .filter((r) => r.default_theme_id != null)
                    .map((r) => [r.id as number, r.default_theme_id as number])
            );
        } catch {
            // ignore; falls through to system default
        }
    }

    return rooms.map((room) => {
        // 1. room override
        if (room.theme_id != null && byId.has(room.theme_id)) {
            return toResolved(byId.get(room.theme_id)!);
        }
        // 2. tenant default (prefer the joined value if provided)
        const tdId =
            room.tenant_default_theme_id ??
            (room.tenant_id != null ? tenantDefault.get(room.tenant_id) : undefined);
        if (tdId != null && byId.has(tdId)) {
            return toResolved(byId.get(tdId)!);
        }
        // 3. system default
        return system ? toResolved(system) : null;
    });
}

/** Convenience: resolve the effective theme for a single room id. */
export async function resolveThemeForRoom(roomId: number): Promise<ResolvedTheme | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT r.tenant_id, r.theme_id, t.default_theme_id AS tenant_default_theme_id
           FROM rooms r
           LEFT JOIN tenants t ON r.tenant_id = t.id
          WHERE r.id = ?`,
        [roomId]
    );
    if (rows.length === 0) return null;
    const [resolved] = await resolveThemesForRooms([
        {
            tenant_id: rows[0].tenant_id,
            theme_id: rows[0].theme_id,
            tenant_default_theme_id: rows[0].tenant_default_theme_id,
        },
    ]);
    return resolved ?? null;
}
