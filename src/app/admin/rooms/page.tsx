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

interface Room {
    id: number;
    building_id: number;
    name: string;
    capacity: number;
    building_name: string;
    linked_device_id: number | null;
    pairing_code: string | null;
    last_seen_at: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RoomsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [roomForm, setRoomForm] = useState({ building_id: '', name: '', capacity: '' });
    const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [pairingUrl, setPairingUrl] = useState<string | null>(null);
    const [generatingToken, setGeneratingToken] = useState(false);

    const user = session?.user as any;
    const isOrgAdmin = user?.role === 'ORG_ADMIN';

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
    const { data: buildings } = useSWR<Building[]>(
        selectedTenantId ? `/api/buildings?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    const { data: rooms, mutate: mutateRooms } = useSWR<Room[]>(
        selectedTenantId ? `/api/rooms?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    // Handlers
    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenantId) return;
        const method = editingRoomId ? 'PUT' : 'POST';
        const body = editingRoomId
            ? { ...roomForm, id: editingRoomId }
            : { ...roomForm, tenant_id: selectedTenantId };

        try {
            const res = await fetch('/api/rooms', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`Failed to ${editingRoomId ? 'update' : 'create'} room`);
            mutateRooms();
            setRoomForm({ building_id: '', name: '', capacity: '' });
            setEditingRoomId(null);
            setMessage(`Room ${editingRoomId ? 'updated' : 'created'} successfully`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(`Error ${editingRoomId ? 'updating' : 'creating'} room`);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleEditRoom = (room: Room) => {
        setEditingRoomId(room.id);
        setRoomForm({
            building_id: room.building_id?.toString() || '',
            name: room.name,
            capacity: room.capacity?.toString() || ''
        });
    };

    const handleCancelEditRoom = () => {
        setEditingRoomId(null);
        setRoomForm({ building_id: '', name: '', capacity: '' });
    };

    const handleDeleteRoom = async (id: number) => {
        if (!confirm('Are you sure you want to delete this room?')) return;
        try {
            const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.status === 409) {
                setError(`Cannot delete: ${data.dependencies}`);
                setTimeout(() => setError(''), 5000);
                return;
            }
            if (!res.ok) throw new Error('Failed to delete room');
            mutateRooms();
            setMessage('Room deleted successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('Error deleting room');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handlePairDevice = async (roomId: number) => {
        if (!selectedTenantId) return;
        try {
            const res = await fetch('/api/device/pair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: selectedTenantId, room_id: roomId })
            });
            const data = await res.json();
            if (data.success) {
                setPairingCode(data.pairing_code);
                mutateRooms();
            } else {
                setError('Failed to generate pairing code');
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            setError('Error generating pairing code');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleGeneratePairingUrl = async (roomId: number) => {
        if (!selectedTenantId) return;
        setGeneratingToken(true);
        try {
            const res = await fetch('/api/device/generate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: selectedTenantId, room_id: roomId })
            });
            const data = await res.json();
            if (data.success) {
                setPairingUrl(data.pairingUrl);
            } else {
                setError('Failed to generate pairing URL');
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            setError('Error generating pairing URL');
            setTimeout(() => setError(''), 3000);
        } finally {
            setGeneratingToken(false);
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

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            ← Back
                        </a>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {currentTenant?.name || 'Rooms & Devices Management'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm">{message}</div>}
                        {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{error}</div>}
                    </div>
                </header>

                {/* Pairing Modal - Consolidated */}
                {pairingUrl && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full">
                            <h3 className="text-2xl font-bold mb-4">Pair New Device</h3>

                            <div className="mb-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200 text-center">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">iOS App Pairing Token</h4>
                                <div className="text-5xl font-mono font-bold text-blue-600 tracking-widest mb-2 selection:bg-blue-100">
                                    {pairingUrl.split('/').pop()}
                                </div>
                                <p className="text-sm text-slate-400">Enter this code in the iPad App</p>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Web Browser Auto-Pairing</h4>
                                <div className="bg-slate-100 p-3 rounded-lg font-mono text-sm break-all border border-slate-300 flex justify-between items-center gap-2">
                                    <span className="truncate">{pairingUrl}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pairingUrl);
                                            setMessage('URL copied!');
                                            setTimeout(() => setMessage(''), 2000);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-bold px-2"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setPairingUrl(null)}
                                    className="bg-slate-200 hover:bg-slate-300 px-6 py-3 rounded-lg font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-4 text-center">
                                Token expires in 7 days. Single use only.
                            </p>
                        </div>
                    </div>
                )}

                {/* Rooms Section */}
                {selectedTenantId ? (
                    <section className="bg-white rounded-xl shadow p-5">
                        <h2 className="text-lg font-bold mb-3">Rooms & Devices</h2>

                        <form onSubmit={handleCreateRoom} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 p-4 rounded-lg ${editingRoomId ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50'}`}>
                            {editingRoomId && (
                                <div className="col-span-full flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-orange-800">Editing Room</h3>
                                    <button type="button" onClick={handleCancelEditRoom} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                                </div>
                            )}
                            <select
                                className="border p-2 rounded"
                                value={roomForm.building_id}
                                onChange={e => setRoomForm({ ...roomForm, building_id: e.target.value })}
                                required
                            >
                                <option value="">Select Building...</option>
                                {buildings?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <input
                                className="border p-2 rounded"
                                placeholder="Room Name"
                                value={roomForm.name}
                                onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                                required
                            />
                            <button className={`text-white py-2 rounded ${editingRoomId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                {editingRoomId ? 'Update Room' : 'Add Room'}
                            </button>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rooms?.map(room => (
                                <div key={room.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg">{room.name}</h3>
                                            <p className="text-sm text-slate-500">{room.building_name}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {room.linked_device_id && (
                                                <>
                                                    {(() => {
                                                        const isOnline = room.last_seen_at &&
                                                            (new Date().getTime() - new Date(room.last_seen_at).getTime()) < 120000;

                                                        return (
                                                            <div className={`px-2 py-1 rounded text-xs font-bold ${isOnline ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {isOnline ? '● ONLINE' : '○ OFFLINE'}
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${room.linked_device_id ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                                                {room.linked_device_id ? 'PAIRED' : 'NO DEVICE'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={() => handleEditRoom(room)}
                                            className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                                            title="Edit Room"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteRoom(room.id)}
                                            className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 text-sm flex items-center justify-center gap-1"
                                            title="Delete Room"
                                        >
                                            🗑️ Delete
                                        </button>

                                        {/* Bottom Row: Connect or Unpair (Full Width) */}
                                        {room.linked_device_id ? (
                                            <div className="col-span-2 flex flex-col gap-2">
                                                <div className="text-xs text-slate-500 text-center bg-slate-50 py-1 rounded border border-slate-100">
                                                    Device ID: {room.linked_device_id}
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Are you sure you want to unpair this device?')) return;
                                                        try {
                                                            const res = await fetch(`/api/device/pair?room_id=${room.id}`, { method: 'DELETE' });
                                                            if (!res.ok) throw new Error('Failed to unpair');
                                                            mutateRooms();
                                                            setMessage('Device unpaired successfully');
                                                        } catch (err) { setError('Error unpairing device'); }
                                                    }}
                                                    className="w-full bg-red-100 text-red-700 py-1 px-3 rounded text-sm hover:bg-red-200 flex items-center justify-center gap-1 font-semibold border border-red-200"
                                                >
                                                    <span>🚫</span> Unpair
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleGeneratePairingUrl(room.id)}
                                                disabled={generatingToken}
                                                className="col-span-2 bg-blue-700 text-white py-1 px-3 rounded text-sm hover:bg-blue-800 flex items-center justify-center gap-1 disabled:opacity-50 font-semibold"
                                            >
                                                <span>📱</span> Connect Device
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {rooms?.length === 0 && (
                                <p className="text-slate-500 col-span-full text-center py-8">No rooms found. Add a building and then create a room.</p>
                            )}
                        </div>
                    </section>
                ) : (
                    <div className="h-full flex items-center justify-center bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 p-12">
                        Loading...
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
