'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import ThemePreview, { ThemeDefinition } from '@/components/ThemePreview';
import ThemeEditor, { EditableTheme } from '@/components/ThemeEditor';

interface Theme {
    id: number;
    tenant_id: number | null;
    key_name: string;
    name: string;
    description: string | null;
    definition: ThemeDefinition;
    is_system: boolean;
}

interface Tenant {
    id: number;
    name: string;
    slug: string;
    default_theme_id: number | null;
}

interface Room {
    id: number;
    name: string;
    building_id: number;
    building_name: string;
    theme_id: number | null;
    resolved_theme: { id: number; key_name: string; name: string; definition: ThemeDefinition } | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ThemesPage() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const role = user?.role as string | undefined;
    const isScopedRole = role === 'ORG_ADMIN' || role === 'SCHEDULER' || role === 'VIEWER';
    const canEdit = role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN';

    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
    const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; initial: EditableTheme | null } | null>(null);

    // Auto-select tenant for scoped roles.
    useEffect(() => {
        if (isScopedRole && user?.tenant_id) {
            setSelectedTenantId(Number(user.tenant_id));
        }
    }, [isScopedRole, user]);

    const { data: tenants, mutate: mutateTenants } = useSWR<Tenant[]>('/api/tenants', fetcher);
    const { data: themes, mutate: mutateThemes } = useSWR<Theme[]>(
        selectedTenantId ? `/api/themes?tenant_id=${selectedTenantId}` : null,
        fetcher
    );
    const { data: rooms, mutate: mutateRooms } = useSWR<Room[]>(
        selectedTenantId ? `/api/rooms?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    const currentTenant = Array.isArray(tenants) ? tenants.find((t) => t.id === selectedTenantId) : undefined;
    const defaultThemeId = currentTenant?.default_theme_id ?? null;
    const themeList = Array.isArray(themes) ? themes : [];

    const flash = (msg: string, isError = false) => {
        if (isError) { setError(msg); setTimeout(() => setError(''), 5000); }
        else { setMessage(msg); setTimeout(() => setMessage(''), 3000); }
    };

    const handleSetDefault = async (value: string) => {
        if (!selectedTenantId) return;
        const default_theme_id = value === '' ? null : Number(value);
        try {
            const res = await fetch('/api/tenants', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedTenantId, default_theme_id }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to set default theme');
            await mutateTenants();
            await mutateRooms();
            flash('Tenant default theme updated');
        } catch (err: any) {
            flash(err.message || 'Error setting default theme', true);
        }
    };

    const handleAssignRoom = async (roomId: number, value: string) => {
        const theme_id = value === '' ? null : Number(value);
        try {
            const res = await fetch('/api/rooms', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: roomId, theme_id }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to assign theme');
            await mutateRooms();
            flash('Room theme updated');
        } catch (err: any) {
            flash(err.message || 'Error assigning theme', true);
        }
    };

    // The only theme that can never be edited or archived is the global System Default.
    // Every other theme (including seeded examples) is fair game, so any can be used as
    // an editable starting point.
    const isSystemDefault = (t: Theme) => t.key_name === 'system_default' && t.tenant_id == null;
    // Authoring permissions: SYSTEM_ADMIN manages any theme except the System Default.
    // ORG_ADMIN manages global themes (tenant_id null) and its own tenant's themes, but
    // not another tenant's branded theme. Nobody edits the System Default.
    const canAuthor = role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN';
    const canManageTheme = (t: Theme) =>
        canAuthor && !isSystemDefault(t) &&
        (role === 'SYSTEM_ADMIN' || t.tenant_id == null || t.tenant_id === selectedTenantId);

    const templates = themeList.map((t) => ({ name: t.name, definition: t.definition }));

    const refreshAll = async () => {
        await Promise.all([mutateThemes(), mutateTenants(), mutateRooms()]);
    };

    // Open the editor in "create" mode pre-filled from an existing theme. Works for any
    // theme (including the System Default and global themes) — copying never changes the
    // source. The copy gets a fresh name/key and is scoped per the editor's defaults.
    const deriveKey = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    const duplicateTheme = (t: Theme) => {
        setEditor({
            mode: 'create',
            initial: {
                id: 0,
                tenant_id: t.tenant_id,
                key_name: deriveKey(`${t.key_name}_copy`),
                name: `${t.name} (Copy)`,
                description: t.description,
                definition: t.definition,
                is_system: false,
            } as EditableTheme,
        });
    };

    const handleArchive = async (t: Theme) => {
        if (!confirm(`Archive "${t.name}"? Rooms using it will fall back to the organization default.`)) return;
        try {
            const res = await fetch(`/api/themes?id=${t.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to archive theme');
            await refreshAll();
            flash('Theme archived');
        } catch (err: any) {
            flash(err.message || 'Error archiving theme', true);
        }
    };

    // Group rooms by building for the assignment list.
    const roomsByBuilding: Record<string, Room[]> = {};
    for (const r of rooms ?? []) {
        const key = r.building_name || 'Unassigned building';
        (roomsByBuilding[key] ||= []).push(r);
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <a href="/admin" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            ← Back to Settings
                        </a>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Display Themes</h1>
                            <p className="text-sm text-slate-500">Preview themes and assign them per room or as the organization default.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm">{message}</div>}
                        {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{error}</div>}
                    </div>
                </header>

                {/* SYSTEM_ADMIN tenant picker */}
                {!isScopedRole && (
                    <section className="bg-white rounded-xl shadow p-5">
                        <label className="text-sm font-semibold text-slate-600 block mb-2">Organization</label>
                        <select
                            className="w-full md:w-96 border p-2 rounded bg-slate-50"
                            value={selectedTenantId ?? ''}
                            onChange={(e) => setSelectedTenantId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">Select an organization…</option>
                            {Array.isArray(tenants) && tenants.map((t) => (
                                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                            ))}
                        </select>
                    </section>
                )}

                {!selectedTenantId ? (
                    <div className="h-64 flex items-center justify-center bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 p-12">
                        Select an organization to manage display themes
                    </div>
                ) : (
                    <>
                        {!canEdit && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded text-sm">
                                You have read-only access. Theme assignment requires an Admin role.
                            </div>
                        )}

                        {/* Available themes */}
                        <section className="bg-white rounded-xl shadow p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">Available Themes</h2>
                                {canAuthor && (
                                    <button
                                        onClick={() => setEditor({ mode: 'create', initial: null })}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                                    >
                                        + New Theme
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {themeList.map((t) => (
                                    <div key={t.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewTheme(t)}
                                            className="block w-full bg-slate-900"
                                            title="Click to preview larger"
                                        >
                                            <ThemePreview definition={t.definition} width={360} />
                                        </button>
                                        <div className="p-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-900">{t.name}</span>
                                                {isSystemDefault(t) && <span className="text-[10px] uppercase tracking-wide bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">System</span>}
                                                {t.tenant_id != null && <span className="text-[10px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Branded</span>}
                                                {defaultThemeId === t.id && <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Org default</span>}
                                            </div>
                                            {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
                                            {canAuthor && (
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => duplicateTheme(t)}
                                                        className="flex-1 bg-slate-600 text-white py-1 px-3 rounded hover:bg-slate-700 text-sm"
                                                        title="Create a new theme starting from this one"
                                                    >
                                                        ⧉ Duplicate
                                                    </button>
                                                    {canManageTheme(t) && (
                                                        <button
                                                            onClick={() => setEditor({ mode: 'edit', initial: t as EditableTheme })}
                                                            className="flex-1 bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 text-sm"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                    )}
                                                    {canManageTheme(t) && (
                                                        <button
                                                            onClick={() => handleArchive(t)}
                                                            className="flex-1 bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 text-sm"
                                                        >
                                                            🗑️ Archive
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {themeList.length === 0 && (
                                    <p className="text-slate-500 col-span-full text-center py-8">
                                        No themes found. Run the theme seed migration, or add themes for this organization.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Tenant default */}
                        <section className="bg-white rounded-xl shadow p-5">
                            <h2 className="text-lg font-bold mb-1">Organization Default</h2>
                            <p className="text-sm text-slate-500 mb-3">Used by every room that has no theme of its own.</p>
                            <select
                                className="w-full md:w-96 border p-2 rounded bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                value={defaultThemeId ?? ''}
                                onChange={(e) => handleSetDefault(e.target.value)}
                                disabled={!canEdit}
                            >
                                <option value="">System default (fallback)</option>
                                {themeList.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </section>

                        {/* Per-room assignment */}
                        <section className="bg-white rounded-xl shadow p-5">
                            <h2 className="text-lg font-bold mb-4">Room Assignments</h2>
                            {Object.keys(roomsByBuilding).length === 0 && (
                                <p className="text-slate-500 text-center py-8">No rooms found for this organization.</p>
                            )}
                            <div className="space-y-6">
                                {Object.entries(roomsByBuilding).map(([building, buildingRooms]) => (
                                    <div key={building}>
                                        <h3 className="font-semibold text-slate-700 border-b pb-2 mb-3">{building}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {buildingRooms.map((room) => (
                                                <div key={room.id} className="border border-slate-200 rounded-lg p-3 flex gap-3">
                                                    <div className="shrink-0">
                                                        <ThemePreview definition={room.resolved_theme?.definition ?? null} width={160} roomName={room.name} buildingName={room.building_name} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-slate-900 truncate">{room.name}</div>
                                                        <div className="text-xs text-slate-500 mb-2">
                                                            {room.theme_id != null
                                                                ? `Theme: ${room.resolved_theme?.name ?? 'Assigned'}`
                                                                : `Using org default${room.resolved_theme ? ` (${room.resolved_theme.name})` : ''}`}
                                                        </div>
                                                        <select
                                                            className="w-full border p-2 rounded bg-white text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                            value={room.theme_id ?? ''}
                                                            onChange={(e) => handleAssignRoom(room.id, e.target.value)}
                                                            disabled={!canEdit}
                                                        >
                                                            <option value="">Use organization default</option>
                                                            {themeList.map((t) => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>

            {/* Preview modal */}
            {previewTheme && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreviewTheme(null)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{previewTheme.name}</h3>
                                {previewTheme.description && <p className="text-sm text-slate-500">{previewTheme.description}</p>}
                            </div>
                            <button onClick={() => setPreviewTheme(null)} className="bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-lg font-semibold text-sm">Close</button>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3 flex justify-center">
                            <ThemePreview definition={previewTheme.definition} width={900} />
                        </div>
                        <p className="text-xs text-slate-400 mt-3 text-center">
                            Approximate web preview. The live displays are rendered natively on iPad / Android.
                        </p>
                    </div>
                </div>
            )}

            {/* Authoring editor */}
            {editor && (
                <ThemeEditor
                    mode={editor.mode}
                    initial={editor.initial}
                    role={role ?? ''}
                    tenantId={selectedTenantId}
                    tenantName={currentTenant?.name}
                    templates={templates}
                    onClose={() => setEditor(null)}
                    onSaved={() => { void refreshAll(); flash(editor.mode === 'create' ? 'Theme created' : 'Theme updated'); }}
                />
            )}
        </div>
    );
}
