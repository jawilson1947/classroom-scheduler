'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';

interface Tenant {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    time_zone: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const BLANK_TENANT = { uuid: '', name: '', slug: '', time_zone: 'America/Chicago' };

export default function OrganizationsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tenantForm, setTenantForm] = useState({ ...BLANK_TENANT });
    const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const user = session?.user as any;
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

    // Tenant (organization) management is SYSTEM_ADMIN only.
    useEffect(() => {
        if (status === 'authenticated' && user?.role && !isSystemAdmin) {
            router.push('/admin');
        }
    }, [status, user, isSystemAdmin, router]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const { data: tenants, mutate: mutateTenants } = useSWR<Tenant[]>(
        isSystemAdmin ? '/api/tenants' : null,
        fetcher
    );

    const flash = (msg: string, isError = false) => {
        if (isError) { setError(msg); setTimeout(() => setError(''), 5000); }
        else { setMessage(msg); setTimeout(() => setMessage(''), 3000); }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingTenantId ? 'PUT' : 'POST';
        const body = editingTenantId ? { ...tenantForm, id: editingTenantId } : tenantForm;
        try {
            const res = await fetch('/api/tenants', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`Failed to ${editingTenantId ? 'update' : 'create'} organization`);
            mutateTenants();
            setTenantForm({ ...BLANK_TENANT });
            setEditingTenantId(null);
            flash(`Organization ${editingTenantId ? 'updated' : 'created'} successfully`);
        } catch (err: any) {
            flash(err.message || `Error ${editingTenantId ? 'updating' : 'creating'} organization`, true);
        }
    };

    const handleEditTenant = (t: Tenant) => {
        setEditingTenantId(t.id);
        setTenantForm({ uuid: t.uuid, name: t.name, slug: t.slug, time_zone: t.time_zone });
    };

    const handleCancelEdit = () => {
        setEditingTenantId(null);
        setTenantForm({ ...BLANK_TENANT });
    };

    const handleDeleteTenant = async (id: number) => {
        if (!confirm('Are you sure you want to delete this organization?')) return;
        try {
            const res = await fetch(`/api/tenants?id=${id}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (res.status === 409) {
                flash(`Cannot delete: ${data.dependencies}`, true);
                return;
            }
            if (!res.ok) throw new Error('Failed to delete organization');
            mutateTenants();
            flash('Organization deleted successfully');
        } catch (err) {
            flash('Error deleting organization', true);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }
    if (!session || !isSystemAdmin) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <a href="/admin" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            ← Back to Settings
                        </a>
                        <h1 className="text-3xl font-bold text-slate-900">Organizations</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm">{message}</div>}
                        {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{error}</div>}
                    </div>
                </header>

                <section className="bg-white rounded-xl shadow p-5">
                    <h2 className="text-lg font-bold mb-3">{editingTenantId ? 'Edit Organization' : 'Add Organization'}</h2>
                    <form onSubmit={handleCreateTenant} className={`space-y-2 mb-2 p-3 rounded ${editingTenantId ? 'bg-orange-50 border-2 border-orange-200' : ''}`}>
                        {editingTenantId && (
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-orange-800">Editing Organization</h3>
                                <button type="button" onClick={handleCancelEdit} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                            </div>
                        )}
                        <input
                            className="w-full border p-2 rounded disabled:bg-slate-100"
                            placeholder="UUID (max 36 chars)"
                            value={tenantForm.uuid}
                            onChange={(e) => setTenantForm({ ...tenantForm, uuid: e.target.value })}
                            required maxLength={36}
                            readOnly={!!editingTenantId}
                            title={editingTenantId ? 'UUID cannot be changed' : ''}
                        />
                        <input className="w-full border p-2 rounded" placeholder="Name" value={tenantForm.name}
                            onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} required />
                        <input className="w-full border p-2 rounded" placeholder="Slug" value={tenantForm.slug}
                            onChange={(e) => setTenantForm({ ...tenantForm, slug: e.target.value })} required />
                        <button className={`w-full text-white py-2 rounded ${editingTenantId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {editingTenantId ? 'Update Organization' : '+ Add Organization'}
                        </button>
                    </form>
                </section>

                <section className="bg-white rounded-xl shadow p-5">
                    <h2 className="text-lg font-bold mb-3">All Organizations</h2>
                    <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                        {Array.isArray(tenants) && tenants.map((t) => (
                            <li key={t.id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center">
                                <div>
                                    <div className="font-semibold text-slate-800">{t.name}</div>
                                    <div className="text-xs text-slate-500">{t.slug} · {t.time_zone}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handleEditTenant(t)}
                                        className="bg-slate-600 text-white py-1 px-3 rounded hover:bg-slate-700 text-sm">✏️ Edit</button>
                                    <button type="button" onClick={() => handleDeleteTenant(t.id)}
                                        className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 text-sm">🗑️ Delete</button>
                                </div>
                            </li>
                        ))}
                        {(!tenants || tenants.length === 0) && (
                            <li className="text-center text-slate-500 text-sm py-6">No organizations found</li>
                        )}
                    </ul>
                </section>
            </div>
            <Footer />
        </div>
    );
}
