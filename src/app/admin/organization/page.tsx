
'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Tenant {
    id: number;
    UUID: string;
    name: string;
    slug: string;
    time_zone: string;
    full_address: string | null;
    website: string | null;
    logo_url: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OrganizationPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const user = session?.user as any;
    const isOrgAdmin = user?.role === 'ORG_ADMIN';

    // Redirect if not authorized
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && !isOrgAdmin) {
            router.push('/dashboard');
        }
    }, [status, isOrgAdmin, router]);

    const { data: tenant, mutate } = useSWR<Tenant>(
        user?.tenant_id ? `/api/tenants?id=${user.tenant_id}` : null,
        fetcher
    );

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        time_zone: '',
        full_address: '',
        website: '',
        logo_url: ''
    });

    useEffect(() => {
        if (tenant) {
            setFormData({
                name: tenant.name,
                slug: tenant.slug,
                time_zone: tenant.time_zone,
                full_address: tenant.full_address || '',
                website: tenant.website || '',
                logo_url: tenant.logo_url || ''
            });
        }
    }, [tenant]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !tenant) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tenantUuid', tenant.UUID);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (!res.ok) {
                console.error('Upload failed with data:', data);
                // Construct a verbose error message for debugging
                const errorMessage = data.details
                    ? `Error: ${data.error} \nDetails: ${data.details} \nPath: ${data.path}`
                    : (data.error || 'Upload failed');
                throw new Error(errorMessage);
            }

            setFormData(prev => ({ ...prev, logo_url: data.logo_url }));
            setMessage('Logo uploaded successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            console.error('Upload Error Caught:', err);
            setError(err.message);
            // Do NOT clear error automatically so user can read it
            // setTimeout(() => setError(''), 3000); 
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant) return;

        setIsSaving(true);
        try {
            const res = await fetch('/api/tenants', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: tenant.id,
                    ...formData
                })
            });

            if (!res.ok) throw new Error('Failed to update organization');

            mutate();
            setMessage('Organization updated successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('Error updating organization');
            setTimeout(() => setError(''), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    if (status === 'loading' || !tenant) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-xl mx-auto space-y-4">
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <a href="/dashboard" className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                            ← Back
                        </a>
                        <h1 className="text-2xl font-bold text-slate-900">Manage Organization</h1>
                    </div>
                </header>

                {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm">{message}</div>}
                {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm">{error}</div>}

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Logo Upload Section */}
                        <div className="flex flex-col items-center justify-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="block text-xs font-bold text-slate-700 mb-2">Organization Logo</label>

                            <div
                                className="w-32 h-32 border-4 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden bg-white"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ width: '1.4in', height: '1.4in' }} // approx 30% reduction from 2in
                            >
                                {formData.logo_url ? (
                                    <img
                                        src={formData.logo_url}
                                        alt="Organization Logo"
                                        className="w-full h-full object-contain p-1.5"
                                    />
                                ) : (
                                    <div className="text-center p-2">
                                        <div className="text-2xl mb-1">📷</div>
                                        <span className="text-xs text-slate-400 font-medium">Click to upload</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/jpeg,image/png"
                                    onChange={handleImageUpload}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Recommended: Square JPEG or PNG</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-sans text-slate-600 mb-1">URL Slug</label>
                                <div className="flex">
                                    <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg px-2 py-1.5 text-slate-500 text-xs flex items-center">/</span>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-slate-300 rounded-r-lg p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-sans text-slate-600 mb-1">Time Zone</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                                    value={formData.time_zone}
                                    onChange={e => setFormData({ ...formData, time_zone: e.target.value })}
                                >
                                    <option value="America/Chicago">Central Time (US & Canada)</option>
                                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                                    <option value="America/Denver">Mountain Time (US & Canada)</option>
                                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                                    <option value="UTC">UTC</option>
                                </select>
                            </div>

                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label>
                                <input
                                    type="url"
                                    placeholder="https://example.com"
                                    className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                />
                            </div>

                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1 text-center">Full Address</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-32 resize-none text-center"
                                    placeholder="123 Main St&#10;City, State, ZIP"
                                    value={formData.full_address}
                                    onChange={e => setFormData({ ...formData, full_address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-200">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <footer className="mt-8 border-t border-slate-200 pt-6 pb-4">
                    <div className="text-center text-sm text-slate-600">
                        <p className="mb-2">© {new Date().getFullYear()} Digital Support Systems of Alabama, LLC. All rights reserved.</p>
                        <div className="flex justify-center gap-4 mb-2">
                            <a href="/privacy" className="text-slate-600 hover:text-slate-800 font-medium">Privacy Policy</a>
                            <span className="text-slate-400">•</span>
                            <a href="/about" className="text-slate-600 hover:text-slate-800 font-medium">About Us</a>
                            <span className="text-slate-400">•</span>
                            <a href="/support" className="text-slate-600 hover:text-slate-800 font-medium">Support</a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
