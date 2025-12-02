'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface Tenant {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    time_zone: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
    const [formData, setFormData] = useState({
        uuid: '',
        name: '',
        slug: '',
        time_zone: 'America/Chicago'
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { data: tenants, mutate } = useSWR<Tenant[]>('/api/tenants', fetcher);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Tenant created successfully!');
                setFormData({
                    uuid: '',
                    name: '',
                    slug: '',
                    time_zone: 'America/Chicago'
                });
                mutate(); // Refresh the list
            } else {
                setError(data.error || 'Failed to create tenant');
            }
        } catch (err) {
            setError('Failed to create tenant');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-slate-900 mb-8">Tenant Management</h1>

                {/* Create Tenant Form */}
                <div className="bg-white rounded-xl shadow p-6 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Create New Tenant</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                UUID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.uuid}
                                onChange={(e) => setFormData({ ...formData, uuid: e.target.value })}
                                placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Organization Name"
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Slug <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="organization-slug"
                                required
                                pattern="[a-z0-9-]+"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Lowercase letters, numbers, and hyphens only
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Time Zone <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.time_zone}
                                onChange={(e) => setFormData({ ...formData, time_zone: e.target.value })}
                                placeholder="America/Chicago"
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                        >
                            Create Tenant
                        </button>
                    </form>
                </div>

                {/* Tenant List */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Existing Tenants</h2>

                    <div className="space-y-3">
                        {Array.isArray(tenants) && tenants.length > 0 ? (
                            tenants.map((tenant) => (
                                <div key={tenant.id} className="border border-slate-200 rounded-lg p-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-slate-500 uppercase">Name</span>
                                            <p className="font-semibold text-slate-900">{tenant.name}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 uppercase">Slug</span>
                                            <p className="text-slate-700">{tenant.slug}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-xs text-slate-500 uppercase">UUID</span>
                                            <p className="font-mono text-sm text-slate-700">{tenant.uuid}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 uppercase">Time Zone</span>
                                            <p className="text-slate-700">{tenant.time_zone}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-center py-8">No tenants yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
