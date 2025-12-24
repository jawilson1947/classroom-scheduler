
'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // For logo display
import Footer from '@/components/Footer';
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

    // Helper to resize image
    const resizeImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Canvas is empty'));
                            return;
                        }
                        const resizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(resizedFile);
                    }, 'image/jpeg', 0.8); // 0.8 quality JPEG
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !tenant) return;

        let file = e.target.files[0];

        try {
            // Resize if > 500KB or simply always resize large images
            if (file.size > 500 * 1024) {
                file = await resizeImage(file);
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('tenantUuid', tenant.UUID);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (!res.ok) {
                console.error('Upload failed with data:', data);
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
                                className="w-32 h-32 border-2 border-solid border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden bg-white"
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

                            <div className="col-span-1 md:col-span-2">
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

                <Footer />
            </div>
        </div>
    );
}
