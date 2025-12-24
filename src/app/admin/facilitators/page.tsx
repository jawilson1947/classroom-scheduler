'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import 'quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');
    return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
}, { ssr: false });

interface Facilitator {
    id: number;
    tenant_id: number;
    first_name: string;
    last_name: string;
    name_on_door: string;
    bio: string;
    picture_url: string | null;
    icon_url: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FacilitatorsPage() {
    interface Tenant {
        id: number;
        UUID: string;
        name: string;
        // other fields optional as we only need UUID
    }

    const { data: session } = useSession();
    const user = session?.user as any;
    const isOrgAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SYSTEM_ADMIN';
    const tenantId = user?.tenant_id;

    // State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        name_on_door: '',
        bio: '',
        picture_url: '',
        icon_url: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

    // Data Fetching
    const { data: facilitators, mutate } = useSWR<Facilitator[]>(
        tenantId ? `/api/facilitators?tenant_id=${tenantId}` : null,
        fetcher
    );

    const { data: tenant } = useSWR<Tenant>(
        tenantId ? `/api/tenants?id=${tenantId}` : null,
        fetcher
    );

    // Handlers
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
                    const MAX_WIDTH = 600;
                    const MAX_HEIGHT = 600;
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
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'picture_url' | 'icon_url') => {
        let file = e.target.files?.[0];
        if (!file) return;
        if (!tenant) {
            setError('Tenant information not loaded. Please try again.');
            return;
        }

        setUploading(prev => ({ ...prev, [field]: true }));
        try {
            // Always resize to ensure consistent size and performance
            // Reduce max dimensions to 600px for even smaller payloads
            file = await resizeImage(file);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('tenantUuid', tenant.UUID);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                if (res.status === 413) {
                    throw new Error('File validation failed: Image is too large');
                }
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Upload failed (${res.status})`);
            }

            const data = await res.json();
            if (data.logo_url) {
                setForm(prev => ({ ...prev, [field]: data.logo_url }));
                setMessage('Image uploaded successfully');
            } else {
                throw new Error('Invalid server response');
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload image. Please try a smaller file.');
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
            // Reset input value to allow re-uploading same file if needed
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!tenantId) return;

        try {
            const url = '/api/facilitators';
            const method = editingId ? 'PUT' : 'POST';
            const body = {
                ...form,
                tenant_id: tenantId,
                id: editingId
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed to ${editingId ? 'update' : 'create'} facilitator (${res.status})`);
            }

            await mutate();
            handleCancel();
            setMessage(`Facilitator ${editingId ? 'updated' : 'created'} successfully`);
        } catch (err: any) {
            console.error('Submit error:', err);
            setError(err.message || `Error ${editingId ? 'updating' : 'creating'} facilitator`);
        }
    };

    const handleEdit = (facilitator: Facilitator) => {
        setEditingId(facilitator.id);
        setError('');
        setMessage('');
        setUploading({}); // Clear any pending upload states

        // Explicitly clear file inputs to ensure no stale files are selected
        const picInput = document.getElementById('picture_upload') as HTMLInputElement;
        const iconInput = document.getElementById('icon_upload') as HTMLInputElement;
        if (picInput) picInput.value = '';
        if (iconInput) iconInput.value = '';

        setForm({
            first_name: facilitator.first_name,
            last_name: facilitator.last_name,
            name_on_door: facilitator.name_on_door,
            bio: facilitator.bio || '',
            picture_url: facilitator.picture_url || '',
            icon_url: facilitator.icon_url || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this facilitator?')) return;
        try {
            const res = await fetch(`/api/facilitators?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            mutate();
            setMessage('Facilitator deleted successfully');
        } catch (err) {
            setError('Error deleting facilitator');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setError('');
        setMessage('');
        setUploading({});

        // Explicitly clear file inputs
        const picInput = document.getElementById('picture_upload') as HTMLInputElement;
        const iconInput = document.getElementById('icon_upload') as HTMLInputElement;
        if (picInput) picInput.value = '';
        if (iconInput) iconInput.value = '';

        setForm({
            first_name: '',
            last_name: '',
            name_on_door: '',
            bio: '',
            picture_url: '',
            icon_url: ''
        });
    };

    if (!isOrgAdmin) {
        return <div className="p-8 text-center text-red-600">Access Denied. ORG_ADMIN role required.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            ← Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900">Manage Facilitators</h1>
                    </div>
                </header>

                <div className="flex items-center gap-3">
                    {message && <div className="flex-1 bg-green-100 text-green-800 px-4 py-3 rounded-lg text-sm font-medium border border-green-200">{message}</div>}
                    {error && <div className="flex-1 bg-red-100 text-red-800 px-4 py-3 rounded-lg text-sm font-medium border border-red-200">{error}</div>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Section */}
                    <div className="lg:col-span-2">
                        <section className={`rounded-xl shadow-sm p-6 sticky top-6 transition-colors duration-500 ${editingId ? 'bg-orange-50 border border-orange-100' : 'bg-white'}`}>
                            <h2 className="text-lg font-bold mb-4 pb-2 border-b">{editingId ? 'Edit Facilitator' : 'Add New Facilitator'}</h2>
                            <form key={editingId || 'new'} onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name *</label>
                                        <input
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={form.first_name}
                                            onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name *</label>
                                        <input
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={form.last_name}
                                            onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Name On Door *</label>
                                    <input
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.name_on_door}
                                        onChange={e => setForm(prev => ({ ...prev, name_on_door: e.target.value }))}
                                        required
                                        placeholder="e.g. Dr. Wilson"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bio (Rich Text)</label>
                                    <div className="h-64 mb-12">
                                        <ReactQuill
                                            theme="snow"
                                            value={form.bio}
                                            onChange={(val: string) => setForm(prev => ({ ...prev, bio: val }))}
                                            style={{ height: '200px' }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Picture</label>
                                            <div
                                                className="w-32 h-32 border-2 border-solid border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden bg-slate-50"
                                                onClick={() => document.getElementById('picture_upload')?.click()}
                                            >
                                                {form.picture_url ? (
                                                    <img
                                                        key={form.picture_url} // Force re-render on change
                                                        src={form.picture_url}
                                                        alt="Picture"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="text-2xl mb-1">📷</div>
                                                        <span className="text-[10px] text-slate-400">Upload</span>
                                                    </div>
                                                )}
                                                {uploading.picture_url && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-xs text-blue-600 font-bold">
                                                        Uploading...
                                                    </div>
                                                )}
                                                <input
                                                    id="picture_upload"
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/jpeg,image/png"
                                                    onChange={e => handleImageUpload(e, 'picture_url')}
                                                    disabled={uploading.picture_url}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase">Icon</label>
                                                <button
                                                    type="button"
                                                    onClick={handleCancel}
                                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border transition-colors"
                                                    title="Clear form to create new facilitator"
                                                >
                                                    New
                                                </button>
                                            </div>
                                            <div
                                                className="w-16 h-16 border-2 border-solid border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden bg-slate-50"
                                                onClick={() => document.getElementById('icon_upload')?.click()}
                                            >
                                                {form.icon_url ? (
                                                    <img
                                                        key={form.icon_url} // Force re-render on change
                                                        src={form.icon_url}
                                                        alt="Icon"
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="text-xl">🖼️</div>
                                                    </div>
                                                )}
                                                {uploading.icon_url && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                                        ...
                                                    </div>
                                                )}
                                                <input
                                                    id="icon_upload"
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/jpeg,image/png"
                                                    onChange={e => handleImageUpload(e, 'icon_url')}
                                                    disabled={uploading.icon_url}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={Object.values(uploading).some(Boolean)}
                                        className={`flex-1 text-white py-2.5 rounded-lg font-semibold shadow-sm transition-all flex justify-center items-center gap-2 ${Object.values(uploading).some(Boolean)
                                            ? 'bg-slate-400 cursor-not-allowed'
                                            : editingId
                                                ? 'bg-orange-600 hover:bg-orange-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        {Object.values(uploading).some(Boolean) ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            editingId ? 'Update Facilitator' : 'Add Facilitator'
                                        )}
                                    </button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-1">
                        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Select Facilitator</h3>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                {facilitators && facilitators.length > 0 ? (
                                    facilitators.map(f => (
                                        <div
                                            key={f.id}
                                            onClick={() => handleEdit(f)}
                                            className={`p-3 cursor-pointer transition-colors flex justify-between items-center group ${editingId === f.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                                        >
                                            <span className="font-medium text-slate-700">{f.name_on_door}</span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-slate-500 text-sm">No facilitators found</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
