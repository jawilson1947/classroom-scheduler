'use client';

import { useState, useEffect, Suspense } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
    device_id: number | null;
    pairing_code: string | null;
}

interface Event {
    id: number;
    room_id: number;
    title: string;
    facilitator_name: string;
    start_time: string;
    end_time: string;
    description: string;
    event_type: string;
    recurrence_days?: string;
    daily_start_time?: string;
    daily_end_time?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function AdminPageContent() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const view = searchParams.get('view');

    // State
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [pairingUrl, setPairingUrl] = useState<string | null>(null);
    const [generatingToken, setGeneratingToken] = useState(false);

    const user = session?.user as any;
    const isOrgAdmin = user?.role === 'ORG_ADMIN';
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

    // Auto-select tenant for ORG_ADMIN and fetch tenant details
    useEffect(() => {
        console.log('User role:', user?.role, 'Tenant ID:', user?.tenant_id);
        if ((isOrgAdmin || user?.role === 'SCHEDULER' || user?.role === 'VIEWER') && user?.tenant_id) {
            setSelectedTenantId(user.tenant_id);
            // Fetch the tenant details
            fetch(`/api/tenants`)
                .then(res => res.json())
                .then(data => {
                    console.log('Fetched tenants:', data);
                    if (Array.isArray(data)) {
                        const tenant = data.find((t: Tenant) => t.id === Number(user.tenant_id));
                        console.log('Found tenant:', tenant);
                        if (tenant) {
                            setCurrentTenant(tenant);
                        }
                    }
                })
                .catch(err => console.error('Error fetching tenant:', err));
        }
    }, [isOrgAdmin, user]);

    // Scroll to section based on view param
    useEffect(() => {
        if (view && selectedTenantId) {
            const element = document.getElementById(view);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [view, selectedTenantId]);

    // Forms State
    const [tenantForm, setTenantForm] = useState({ uuid: '', name: '', slug: '', time_zone: 'America/Chicago' });
    const [buildingForm, setBuildingForm] = useState({ name: '', time_zone: 'America/Chicago' });
    const [roomForm, setRoomForm] = useState({ building_id: '', name: '', capacity: '' });
    const [eventForm, setEventForm] = useState({
        room_id: '',
        title: '',
        facilitator_name: '',
        start_time: '',
        end_time: '',
        description: '',
        event_type: 'class',
        is_recurring: false,
        recurrence_days: [] as string[],
        daily_start_time: '',
        daily_end_time: ''
    });
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [conflictData, setConflictData] = useState<any[]>([]);
    const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
    const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
    const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

    // UI State
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Data Fetching
    const { data: tenants, mutate: mutateTenants } = useSWR<Tenant[]>('/api/tenants', fetcher);

    const { data: buildings, mutate: mutateBuildings } = useSWR<Building[]>(
        selectedTenantId ? `/api/buildings?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    const { data: rooms, mutate: mutateRooms } = useSWR<Room[]>(
        selectedTenantId ? `/api/rooms?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    const { data: events, mutate: mutateEvents } = useSWR<Event[]>(
        selectedTenantId ? `/api/events?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    // Handlers
    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingTenantId ? 'PUT' : 'POST';
        const body = editingTenantId ? { ...tenantForm, id: editingTenantId } : tenantForm;

        try {
            const res = await fetch('/api/tenants', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`Failed to ${editingTenantId ? 'update' : 'create'} tenant`);
            mutateTenants();
            setTenantForm({ uuid: '', name: '', slug: '', time_zone: 'America/Chicago' });
            setEditingTenantId(null);
            setMessage(`Tenant ${editingTenantId ? 'updated' : 'created'} successfully`);
        } catch (err) { setError(`Error ${editingTenantId ? 'updating' : 'creating'} tenant`); }
    };

    const handleEditTenant = (tenant: Tenant) => {
        setEditingTenantId(tenant.id);
        setTenantForm({
            uuid: tenant.uuid,
            name: tenant.name,
            slug: tenant.slug,
            time_zone: tenant.time_zone
        });
    };

    const handleCancelEditTenant = () => {
        setEditingTenantId(null);
        setTenantForm({ uuid: '', name: '', slug: '', time_zone: 'America/Chicago' });
    };

    const handleDeleteTenant = async (id: number) => {
        if (!confirm('Are you sure you want to delete this tenant?')) return;
        try {
            const res = await fetch(`/api/tenants?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.status === 409) {
                setError(`Cannot delete: ${data.dependencies}`);
                return;
            }
            if (!res.ok) throw new Error('Failed to delete tenant');
            mutateTenants();
            if (selectedTenantId === id) setSelectedTenantId(null);
            setMessage('Tenant deleted successfully');
        } catch (err) { setError('Error deleting tenant'); }
    };

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
        } catch (err) { setError(`Error ${editingBuildingId ? 'updating' : 'creating'} building`); }
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
                return;
            }
            if (!res.ok) throw new Error('Failed to delete building');
            mutateBuildings();
            setMessage('Building deleted successfully');
        } catch (err) { setError('Error deleting building'); }
    };

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
        } catch (err) { setError(`Error ${editingRoomId ? 'updating' : 'creating'} room`); }
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
                return;
            }
            if (!res.ok) throw new Error('Failed to delete room');
            mutateRooms();
            setMessage('Room deleted successfully');
        } catch (err) { setError('Error deleting room'); }
    };

    const handleCreateEvent = async (e: React.FormEvent, forceCreate = false) => {
        e.preventDefault();
        if (!selectedTenantId) return;

        const url = editingEventId ? '/api/events' : '/api/events';
        const method = editingEventId ? 'PUT' : 'POST';
        const body = {
            ...eventForm,
            recurrence_days: eventForm.is_recurring ? eventForm.recurrence_days.join(',') : null,
            daily_start_time: eventForm.is_recurring ? eventForm.daily_start_time : null,
            daily_end_time: eventForm.is_recurring ? eventForm.daily_end_time : null,
            tenant_id: selectedTenantId,
            id: editingEventId,
            force: forceCreate
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.status === 409) {
                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error('Failed to parse JSON:', e);
                    setError('Server returned invalid conflict data');
                    return;
                }

                if (data.conflicts && data.conflicts.length > 0) {
                    setConflictData(data.conflicts);
                    setConflictModalOpen(true);
                }
                return;
            }

            if (!res.ok) throw new Error(`Failed to ${editingEventId ? 'update' : 'create'} event`);

            mutateEvents();
            setEventForm({
                room_id: '',
                title: '',
                facilitator_name: '',
                start_time: '',
                end_time: '',
                description: '',
                event_type: 'class',
                is_recurring: false,
                recurrence_days: [],
                daily_start_time: '',
                daily_end_time: ''
            });
            setEditingEventId(null);
            setMessage(`Event ${editingEventId ? 'updated' : 'created'} successfully`);
        } catch (err) { setError(`Error ${editingEventId ? 'updating' : 'creating'} event`); }
    };

    const handleEditEvent = (event: Event) => {
        setEditingEventId(event.id);
        setEventForm({
            room_id: event.room_id.toString(),
            title: event.title,
            facilitator_name: event.facilitator_name || '',
            start_time: new Date(event.start_time).toISOString().slice(0, 16),
            end_time: new Date(event.end_time).toISOString().slice(0, 16),
            description: event.description || '',
            event_type: event.event_type || 'class',
            is_recurring: !!event.recurrence_days,
            recurrence_days: event.recurrence_days ? event.recurrence_days.split(',') : [],
            daily_start_time: event.daily_start_time || '',
            daily_end_time: event.daily_end_time || ''
        });
        // Scroll to form
        const form = document.getElementById('event-form');
        form?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingEventId(null);
        setEventForm({
            room_id: '',
            title: '',
            facilitator_name: '',
            start_time: '',
            end_time: '',
            description: '',
            event_type: 'class',
            is_recurring: false,
            recurrence_days: [],
            daily_start_time: '',
            daily_end_time: ''
        });
    };

    const handleDeleteEvent = async (id: number) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete event');
            mutateEvents();
            setMessage('Event deleted successfully');
        } catch (err) { setError('Error deleting event'); }
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
            }
        } catch (err) { setError('Error generating pairing code'); }
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
            }
        } catch (err) {
            setError('Error generating pairing URL');
        } finally {
            setGeneratingToken(false);
        }
    };

    // Helper to get room name
    const getRoomName = (id: number) => rooms?.find(r => r.id === id)?.name || 'Unknown Room';

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            ← Back
                        </a>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {(() => {
                                const tenantName = currentTenant ? currentTenant.name : (Array.isArray(tenants) && selectedTenantId ? tenants.find(t => t.id === selectedTenantId)?.name : null);
                                return tenantName ? tenantName : 'Admin Dashboard';
                            })()}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm">{message}</div>}
                        {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{error}</div>}
                    </div>
                </header>

                {/* Pairing Code Modal */}
                {pairingCode && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md w-full">
                            <h3 className="text-2xl font-bold mb-4">Device Pairing Code</h3>
                            <div className="text-6xl font-mono font-bold text-blue-600 tracking-widest mb-6">
                                {pairingCode}
                            </div>
                            <p className="text-slate-600 mb-6">
                                Enter this code on the iPad at <strong>/display/setup</strong>
                            </p>
                            <button
                                onClick={() => setPairingCode(null)}
                                className="bg-slate-200 hover:bg-slate-300 px-6 py-2 rounded-lg font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Pairing URL Modal */}
                {pairingUrl && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full">
                            <h3 className="text-2xl font-bold mb-4">Auto-Pairing URL</h3>
                            <p className="text-slate-600 mb-4">
                                Navigate the iPad to this URL to automatically pair it with the room:
                            </p>
                            <div className="bg-slate-100 p-4 rounded-lg mb-4 font-mono text-sm break-all border-2 border-slate-300">
                                {pairingUrl}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(pairingUrl);
                                        setMessage('URL copied to clipboard!');
                                        setTimeout(() => setMessage(''), 2000);
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                                >
                                    📋 Copy URL
                                </button>
                                <button
                                    onClick={() => setPairingUrl(null)}
                                    className="flex-1 bg-slate-200 hover:bg-slate-300 px-6 py-3 rounded-lg font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-4">
                                💡 Tip: This URL will automatically configure the iPad and redirect it to the display page. The token expires in 7 days and can only be used once.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Tenants & Buildings */}
                    <div className="space-y-6">
                        {/* Tenant Management - Only for SYSTEM_ADMIN */}
                        {!isOrgAdmin && (
                            <section className="bg-white rounded-xl shadow p-5">
                                <h2 className="text-lg font-bold mb-3">1. Organizations</h2>
                                <form onSubmit={handleCreateTenant} className={`space-y-2 mb-4 p-3 rounded ${editingTenantId ? 'bg-orange-50 border-2 border-orange-200' : ''}`}>
                                    {editingTenantId && (
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-orange-800">Editing Organization</h3>
                                            <button type="button" onClick={handleCancelEditTenant} className="text-sm text-slate-500 hover:text-slate-800">Cancel Edit</button>
                                        </div>
                                    )}
                                    <input
                                        className="w-full border p-2 rounded"
                                        placeholder="UUID (max 36 chars)"
                                        value={tenantForm.uuid}
                                        onChange={e => setTenantForm({ ...tenantForm, uuid: e.target.value })}
                                        required maxLength={36}
                                        readOnly={!!editingTenantId}
                                        title={editingTenantId ? 'UUID cannot be changed' : ''}
                                    />
                                    <input
                                        className="w-full border p-2 rounded"
                                        placeholder="Name"
                                        value={tenantForm.name}
                                        onChange={e => setTenantForm({ ...tenantForm, name: e.target.value })}
                                        required
                                    />
                                    <input
                                        className="w-full border p-2 rounded"
                                        placeholder="Slug"
                                        value={tenantForm.slug}
                                        onChange={e => setTenantForm({ ...tenantForm, slug: e.target.value })}
                                        required
                                    />
                                    <button className={`w-full text-white py-2 rounded ${editingTenantId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        {editingTenantId ? 'Update Organization' : 'Add Organization'}
                                    </button>
                                </form>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600">Select Organization to Manage:</label>
                                    <select
                                        className="w-full border p-2 rounded bg-slate-50"
                                        size={5}
                                        onChange={(e) => setSelectedTenantId(Number(e.target.value))}
                                        value={selectedTenantId || ''}
                                    >
                                        {Array.isArray(tenants) && tenants.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                                        ))}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {Array.isArray(tenants) && tenants.find(t => t.id === selectedTenantId) && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditTenant(tenants.find(t => t.id === selectedTenantId)!)}
                                                    className="bg-slate-600 text-white py-1 px-2 rounded hover:bg-slate-700 text-sm"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => selectedTenantId && handleDeleteTenant(selectedTenantId)}
                                                    className="bg-red-600 text-white py-1 px-2 rounded hover:bg-red-700 text-sm"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Building Management */}
                        {selectedTenantId && (
                            <section id="buildings" className="bg-white rounded-xl shadow p-5">
                                <h2 className="text-lg font-bold mb-3">2. Buildings</h2>
                                <form onSubmit={handleCreateBuilding} className={`space-y-3 mb-6 p-4 rounded ${editingBuildingId ? 'bg-orange-50 border-2 border-orange-200' : ''}`}>
                                    {editingBuildingId && (
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-orange-800">Editing Building</h3>
                                            <button type="button" onClick={handleCancelEditBuilding} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                                        </div>
                                    )}
                                    <input
                                        className="w-full border p-2 rounded"
                                        placeholder="Building Name"
                                        value={buildingForm.name}
                                        onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })}
                                        required
                                    />
                                    <button className={`w-full text-white py-2 rounded ${editingBuildingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                        {editingBuildingId ? 'Update Building' : 'Add Building'}
                                    </button>
                                </form>
                                <ul className="space-y-2 max-h-60 overflow-y-auto">
                                    {buildings?.map(b => (
                                        <li key={b.id} className="p-2 border rounded bg-slate-50 flex justify-between items-center">
                                            <span>{b.name}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditBuilding(b)}
                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBuilding(b.id)}
                                                    className="text-red-600 hover:text-red-800 p-1"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Right Column: Rooms & Devices & Events */}
                    <div className="lg:col-span-2 space-y-8">
                        {selectedTenantId ? (
                            <>
                                {/* Rooms Section */}
                                <section id="rooms" className="bg-white rounded-xl shadow p-5">
                                    <h2 className="text-lg font-bold mb-3">3. Rooms & Devices</h2>

                                    <form onSubmit={handleCreateRoom} className={`grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 p-4 rounded-lg ${editingRoomId ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50'}`}>
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {rooms?.map(room => (
                                            <div key={room.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h3 className="font-bold text-lg">{room.name}</h3>
                                                        <p className="text-sm text-slate-500">{room.building_name}</p>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded text-xs font-bold ${room.device_id ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                                        {room.device_id ? 'PAIRED' : 'NO DEVICE'}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditRoom(room)}
                                                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 text-sm"
                                                        title="Edit Room"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteRoom(room.id)}
                                                        className="flex-1 bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 text-sm"
                                                        title="Delete Room"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>

                                                {room.device_id ? (
                                                    <div className="text-xs text-slate-500 mt-2">
                                                        Device ID: {room.device_id}
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => handlePairDevice(room.id)}
                                                            className="flex-1 bg-slate-800 text-white py-2 rounded text-sm hover:bg-slate-700 flex items-center justify-center gap-2"
                                                        >
                                                            <span>📱</span> Pairing Code
                                                        </button>
                                                        <button
                                                            onClick={() => handleGeneratePairingUrl(room.id)}
                                                            disabled={generatingToken}
                                                            className="flex-1 bg-blue-700 text-white py-2 rounded text-sm hover:bg-blue-800 flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            <span>🔗</span> Pairing URL
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {rooms?.length === 0 && (
                                            <p className="text-slate-500 col-span-2 text-center py-8">No rooms found. Add a building and then create a room.</p>
                                        )}
                                    </div>
                                </section>

                                {/* Events Section */}
                                <section id="events" className="bg-white rounded-xl shadow p-5">
                                    <h2 className="text-lg font-bold mb-3">4. Events & Schedule</h2>

                                    <form id="event-form" onSubmit={handleCreateEvent} noValidate className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-6 rounded-lg ${editingEventId ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50'}`}>
                                        {editingEventId && (
                                            <div className="col-span-2 flex justify-between items-center mb-2">
                                                <h3 className="font-bold text-orange-800">Editing Event</h3>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                                            <select
                                                className="w-full border p-2 rounded"
                                                value={eventForm.room_id}
                                                onChange={e => setEventForm({ ...eventForm, room_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Room...</option>
                                                {rooms?.map(r => <option key={r.id} value={r.id}>{r.name} ({r.building_name})</option>)}
                                            </select>
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                                            <select
                                                className="w-full border p-2 rounded"
                                                value={eventForm.event_type}
                                                onChange={e => setEventForm({ ...eventForm, event_type: e.target.value })}
                                            >
                                                <option value="class">Class</option>
                                                <option value="meeting">Meeting</option>
                                                <option value="event">Event</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                            <input
                                                className="w-full border p-2 rounded"
                                                placeholder="e.g., Intro to Computer Science"
                                                value={eventForm.title}
                                                onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date/Time</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full border p-2 rounded"
                                                value={eventForm.start_time}
                                                onChange={e => setEventForm({ ...eventForm, start_time: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">End Date/Time</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full border p-2 rounded"
                                                value={eventForm.end_time}
                                                onChange={e => setEventForm({ ...eventForm, end_time: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={eventForm.is_recurring}
                                                    onChange={e => setEventForm({ ...eventForm, is_recurring: e.target.checked })}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                Recurring Event
                                            </label>

                                            {eventForm.is_recurring && (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Repeat On</label>
                                                        <div className="flex flex-wrap gap-4">
                                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                                <label key={day} className="flex items-center gap-2 text-sm text-slate-600">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={eventForm.recurrence_days.includes(day)}
                                                                        onChange={e => {
                                                                            const days = e.target.checked
                                                                                ? [...eventForm.recurrence_days, day]
                                                                                : eventForm.recurrence_days.filter(d => d !== day);
                                                                            setEventForm({ ...eventForm, recurrence_days: days });
                                                                        }}
                                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                    />
                                                                    {day}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Daily Start Time</label>
                                                            <input
                                                                type="time"
                                                                className="w-full border p-2 rounded"
                                                                value={eventForm.daily_start_time}
                                                                onChange={e => setEventForm({ ...eventForm, daily_start_time: e.target.value })}
                                                                required={eventForm.is_recurring}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Daily End Time</label>
                                                            <input
                                                                type="time"
                                                                className="w-full border p-2 rounded"
                                                                value={eventForm.daily_end_time}
                                                                onChange={e => setEventForm({ ...eventForm, daily_end_time: e.target.value })}
                                                                required={eventForm.is_recurring}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Facilitator (Optional)</label>
                                            <input
                                                className="w-full border p-2 rounded"
                                                placeholder="e.g., Dr. Smith"
                                                value={eventForm.facilitator_name}
                                                onChange={e => setEventForm({ ...eventForm, facilitator_name: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <button type="submit" className={`w-full text-white py-3 rounded font-semibold ${editingEventId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                                {editingEventId ? 'Update Event' : 'Schedule Event'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-slate-700 border-b pb-2">Upcoming Events</h3>
                                        {events?.length === 0 ? (
                                            <p className="text-slate-500 text-center py-8">No events scheduled.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {events?.map(event => (
                                                    <div key={event.id} className="flex items-center justify-between border p-4 rounded-lg bg-white hover:bg-slate-50">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-lg text-slate-900">{event.title}</span>
                                                                <span className="text-xs px-2 py-1 bg-slate-100 rounded-full uppercase tracking-wide text-slate-600">{event.event_type}</span>
                                                            </div>
                                                            <div className="text-sm text-slate-600 space-y-1">
                                                                <p>📍 {getRoomName(event.room_id)}</p>
                                                                <p>👤 {event.facilitator_name || 'No facilitator'}</p>
                                                                <p>🕒 {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleTimeString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <button
                                                                onClick={() => handleEditEvent(event)}
                                                                className="text-blue-600 hover:text-blue-800 p-2"
                                                                title="Edit Event"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEvent(event.id)}
                                                                className="text-red-600 hover:text-red-800 p-2"
                                                                title="Delete Event"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 p-12">
                                Select an organization to manage buildings, rooms, and events
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Conflict Resolution Modal */}
            {
                conflictModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                                ⚠️ Schedule Conflict Detected
                            </h3>
                            <p className="text-slate-600 mb-4">
                                The following event(s) are already scheduled for this room at this time:
                            </p>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
                                <ul className="space-y-2">
                                    {conflictData.map((c, i) => {
                                        let timeString = '';
                                        if (c.recurrence_days) {
                                            timeString = `${c.recurrence_days} ${c.daily_start_time} - ${c.daily_end_time}`;
                                        } else {
                                            const start = new Date(c.start_time).toLocaleString();
                                            const end = new Date(c.end_time).toLocaleTimeString();
                                            timeString = `${start} - ${end}`;
                                        }
                                        return (
                                            <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                                                <span>•</span>
                                                <span><strong>{c.title}</strong><br /><span className="text-xs opacity-75">{timeString}</span></span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <p className="text-slate-600 mb-6 font-medium">
                                Do you want to schedule this event anyway?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setConflictModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setConflictModalOpen(false);
                                        const mockEvent = { preventDefault: () => { } } as React.FormEvent;
                                        await handleCreateEvent(mockEvent, true);
                                    }}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Schedule Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center"><div className="text-slate-600">Loading...</div></div>}>
            <AdminPageContent />
        </Suspense>
    );
}
