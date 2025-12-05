'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Tenant {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    time_zone: string;
}

interface Building {
    id: number;
    name: string;
    time_zone: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BuildingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [buildingForm, setBuildingForm] = useState({ name: '', time_zone: 'America/Chicago' });
    const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const user = session?.user as any;
    const isOrgAdmin = user?.role === 'ORG_ADMIN';
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

    // Auto-select tenant for ORG_ADMIN and fetch tenant details
    useEffect(() => {
        if ((isOrgAdmin || user?.role === 'SCHEDULER' || user?.role === 'VIEWER') && user?.tenant_id) {
            setSelectedTenantId(user.tenant_id);
            fetch(`/api/tenants`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const tenant = data.find((t: Tenant) => t.id === Number(user.tenant_id));
                        if (tenant) {
                            setCurrentTenant(tenant);
                        }
                    }
                })
                .catch(err => console.error('Error fetching tenant:', err));
        }
    }, [isOrgAdmin, user]);

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Data Fetching
    const { data: tenants } = useSWR<Tenant[]>(isSystemAdmin ? '/api/tenants' : null, fetcher);
    const { data: buildings, mutate: mutateBuildings } = useSWR<Building[]>(
        selectedTenantId ? `/api/buildings?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    // Handlers
    const handleCreateBuilding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenantId) return;
        const method = editingBuildingId ? 'PUT' : 'POST';
        const body = editingBuildingId
            ? { ...buildingForm, id: editingBuildingId }
            : { ...buildingForm, tenant_id: selectedTenantId };

        try {
            const res = await fetch('/api/buildings', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`Failed to ${editingBuildingId ? 'update' : 'create'} building`);
            mutateBuildings();
            setBuildingForm({ name: '', time_zone: 'America/Chicago' });
            setEditingBuildingId(null);
            setMessage(`Building ${editingBuildingId ? 'updated' : 'created'} successfully`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(`Error ${editingBuildingId ? 'updating' : 'creating'} building`);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleEditBuilding = (building: Building) => {
        setEditingBuildingId(building.id);
        setBuildingForm({
            name: building.name,
            time_zone: building.time_zone
        });
    };

    const handleCancelEditBuilding = () => {
        setEditingBuildingId(null);
        setBuildingForm({ name: '', time_zone: 'America/Chicago' });
    };

    const handleDeleteBuilding = async (id: number) => {
        if (!confirm('Are you sure you want to delete this building?')) return;
        try {
            const res = await fetch(`/api/buildings?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.status === 409) {
                setError(`Cannot delete: ${data.dependencies}`);
                setTimeout(() => setError(''), 5000);
                return;
            }
            if (!res.ok) throw new Error('Failed to delete building');
            mutateBuildings();
            setMessage('Building deleted successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('Error deleting building');
            setTimeout(() => setError(''), 3000);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const tenantName = currentTenant ? currentTenant.name : (Array.isArray(tenants) && selectedTenantId ? tenants.find(t => t.id === selectedTenantId)?.name : null);

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            ← Back
                        </a>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {tenantName || 'Buildings Management'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm">{message}</div>}
                        {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{error}</div>}
                    </div>
                </header>

                {/* Tenant Selection for SYSTEM_ADMIN */}
                {isSystemAdmin && (
                    <section className="bg-white rounded-xl shadow p-5">
                        <h2 className="text-lg font-bold mb-3">Select Organization</h2>
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            onChange={(e) => {
                                const tenantId = Number(e.target.value);
                                setSelectedTenantId(tenantId);
                                const tenant = tenants?.find(t => t.id === tenantId);
                                if (tenant) {
                                    setCurrentTenant(tenant);
                                }
                            }}
                            value={selectedTenantId || ''}
                        >
                            <option value="">Select an organization...</option>
                            {Array.isArray(tenants) && tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                            ))}
                        </select>
                    </section>
                )}

                {/* Building Management */}
                {selectedTenantId ? (
                    <section className="bg-white rounded-xl shadow p-5">
                        <h2 className="text-lg font-bold mb-3">Buildings</h2>
                        <form onSubmit={handleCreateBuilding} className={`space-y-3 mb-6 p-4 rounded ${editingBuildingId ? 'bg-orange-50 border-2 border-orange-200' : ''}`}>
                            {editingBuildingId && (
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-orange-800">Editing Building</h3>
                                    <button type="button" onClick={handleCancelEditBuilding} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                                </div>
                            )}
                            <input
                                type="text"
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                placeholder="Building Name"
                                value={buildingForm.name}
                                onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })}
                                required
                            />
                            <button type="submit" className={`text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center ${editingBuildingId ? 'bg-yellow-400 hover:bg-yellow-500 focus:ring-yellow-300' : 'bg-green-700 hover:bg-green-800 focus:ring-green-300'}`}>
                                {editingBuildingId ? '✓ Update Building' : '+ Add Building'}
                            </button>
                        </form>
                        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {buildings?.map(b => (
                                <li key={b.id} className="group p-4 border-2 border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-blue-300 flex justify-between items-center transition-all duration-200 shadow-sm hover:shadow-md">
                                    <span className="font-medium text-slate-700 group-hover:text-slate-900">{b.name}</span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEditBuilding(b)}
                                            className="px-3 py-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200 font-medium"
                                            title="Edit"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteBuilding(b.id)}
                                            className="px-3 py-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 font-medium"
                                            title="Delete"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {buildings?.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🏢</div>
                                    <p className="text-slate-500 text-lg">No buildings found</p>
                                    <p className="text-slate-400 text-sm mt-2">Add your first building to get started</p>
                                </div>
                            )}
                        </ul>
                    </section>
                ) : (
                    <div className="h-full flex items-center justify-center bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 p-12">
                        {isSystemAdmin ? 'Select an organization to manage buildings' : 'Loading...'}
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-12 border-t border-slate-200 pt-6 pb-4">
                <div className="text-center text-sm text-slate-600">
                    <p className="mb-1">© {new Date().getFullYear()} Digital Support Systems of Alabama, LLC. All rights reserved.</p>
                    <p className="text-xs text-slate-500">System developed by Digital Support Systems of Alabama, LLC</p>
                </div>
            </footer>
        </div>
    );
}
