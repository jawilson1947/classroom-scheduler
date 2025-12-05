'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

interface User {
    id: number;
    tenant_id: number;
    email: string;
    role: string;
    created_at: string;
    tenant_name?: string;
}

interface Tenant {
    id: number;
    name: string;
    slug: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UsersPage() {
    const { data: session } = useSession();
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [selectedTenantFilter, setSelectedTenantFilter] = useState<number | null>(null);

    const user = session?.user as any;
    const userRole = user?.role;
    const userTenantId = user?.tenant_id;
    const isSystemAdmin = userRole === 'SYSTEM_ADMIN';

    // Fetch tenants for SYSTEM_ADMIN, or current tenant for ORG_ADMIN
    const { data: tenants } = useSWR<Tenant[] | Tenant>(
        isSystemAdmin ? '/api/tenants' : (userTenantId ? `/api/tenants?id=${userTenantId}` : null),
        fetcher
    );

    // Normalize tenants data
    const tenantList = Array.isArray(tenants) ? tenants : (tenants ? [tenants] : []);

    // Determine which tenant to show users for
    const displayTenantId = isSystemAdmin
        ? (selectedTenantFilter || (tenantList?.[0]?.id))
        : userTenantId;

    const { data: users, mutate } = useSWR<User[]>(
        displayTenantId ? `/api/users?tenant_id=${displayTenantId}` : null,
        fetcher
    );

    const [userForm, setUserForm] = useState({
        tenant_id: '',
        email: '',
        password: '',
        role: 'VIEWER'
    });

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setUserForm({
                tenant_id: user.tenant_id.toString(),
                email: user.email,
                password: '',
                role: user.role
            });
        } else {
            setEditingUser(null);
            setUserForm({
                tenant_id: isSystemAdmin ? '' : displayTenantId?.toString() || '',
                email: '',
                password: '',
                role: 'VIEWER'
            });
        }
        setShowModal(true);
        setError('');
        setMessage('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            const method = editingUser ? 'PUT' : 'POST';
            const body = editingUser
                ? { id: editingUser.id, ...userForm }
                : { ...userForm };

            const res = await fetch('/api/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || `Failed to ${editingUser ? 'update' : 'create'} user`);
                return;
            }

            mutate();
            setShowModal(false);
            setMessage(`User ${editingUser ? 'updated' : 'created'} successfully`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('An error occurred');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to delete user');
                return;
            }

            mutate();
            setMessage('User deleted successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('An error occurred');
        }
    };

    const currentTenantName = isSystemAdmin && displayTenantId
        ? tenantList?.find(t => t.id === displayTenantId)?.name
        : (tenantList?.[0]?.name);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Link href="/dashboard" className="text-slate-400 hover:text-white mb-2 inline-block">
                            ← Back to Dashboard
                        </Link>
                        <h1 className="text-4xl font-bold text-white">User Management</h1>
                        {currentTenantName && (
                            <p className="text-slate-400 mt-1">Managing users for: {currentTenantName}</p>
                        )}
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                    >
                        + Add User
                    </button>
                </div>

                {/* Tenant Filter for SYSTEM_ADMIN */}
                {isSystemAdmin && tenants && (
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-2">Filter by Tenant:</label>
                        <select
                            value={selectedTenantFilter || ''}
                            onChange={(e) => setSelectedTenantFilter(e.target.value ? Number(e.target.value) : null)}
                            className="px-4 py-2 border border-slate-600 bg-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Tenants</option>
                            {tenantList.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Messages */}
                {message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* User Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Role</th>
                                {isSystemAdmin && <th className="text-left p-4 font-semibold text-slate-700">Tenant</th>}
                                <th className="text-left p-4 font-semibold text-slate-700">Created</th>
                                <th className="text-right p-4 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users?.map((user) => (
                                <tr key={user.id} className="border-b hover:bg-slate-50">
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    {isSystemAdmin && (
                                        <td className="p-4 text-slate-600">
                                            {tenantList?.find(t => t.id === user.tenant_id)?.name || `ID: ${user.tenant_id}`}
                                        </td>
                                    )}
                                    <td className="p-4 text-slate-600">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleOpenModal(user)}
                                            className="text-blue-600 hover:text-blue-800 mr-4"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!users || users.length === 0) && (
                                <tr>
                                    <td colSpan={isSystemAdmin ? 5 : 4} className="p-8 text-center text-slate-500">
                                        No users found. Add your first user to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 w-full max-w-md">
                            <h2 className="text-2xl font-bold mb-6">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Tenant Selector - only for SYSTEM_ADMIN */}
                                {isSystemAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Tenant <span className="text-red-600">*</span>
                                        </label>
                                        <select
                                            value={userForm.tenant_id}
                                            onChange={(e) => setUserForm({ ...userForm, tenant_id: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Tenant...</option>
                                            {tenantList?.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Users will only see data for their assigned tenant
                                        </p>
                                    </div>
                                )}

                                {/* Tenant Display - for ORG_ADMIN (read-only) */}
                                {!isSystemAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Tenant
                                        </label>
                                        <input
                                            type="text"
                                            value={tenantList?.find(t => t.id === userTenantId)?.name || 'Loading...'}
                                            disabled
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={userForm.email}
                                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Password {editingUser && '(leave blank to keep current)'}
                                    </label>
                                    <input
                                        type="password"
                                        value={userForm.password}
                                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                        required={!editingUser}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="••••••••"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={userForm.role}
                                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="VIEWER">Viewer</option>
                                        <option value="SCHEDULER">Scheduler</option>
                                        <option value="ORG_ADMIN">Org Admin</option>
                                        {isSystemAdmin && <option value="SYSTEM_ADMIN">System Admin</option>}
                                    </select>
                                </div>

                                {error && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                                    >
                                        {editingUser ? 'Update' : 'Create'} User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-12 border-t border-slate-600 pt-6 pb-4">
                <div className="text-center text-sm text-slate-400">
                    <p className="mb-1">© {new Date().getFullYear()} Digital Support Systems of Alabama, LLC. All rights reserved.</p>
                    <p className="text-xs text-slate-500">System developed by Digital Support Systems of Alabama, LLC</p>
                </div>
            </footer>
        </div>
    );
}
