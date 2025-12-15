'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FilterSortCard, TimeFilter, TypeFilter, SortBy, SortOrder } from '@/components/FilterSortCard';

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

export default function EventsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [dateRangeDefaults, setDateRangeDefaults] = useState({
        start_date: '',
        end_date: ''
    });
    const [eventForm, setEventForm] = useState({
        room_id: '',
        title: '',
        facilitator_name: '',
        description: '',
        event_type: 'class',
        recurrence_days: [] as string[],
        daily_start_time: '',
        daily_end_time: ''
    });

    // Filter & Sort State
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [conflictData, setConflictData] = useState<any[]>([]);
    const [message, setMessage] = useState('');

    const [error, setError] = useState('');
    const [searchParams, setSearchParams] = useState<{ start_date: string, end_date: string, building_id?: string, room_id?: string } | null>(null);

    const user = session?.user as any;
    const isOrgAdmin = user?.role === 'ORG_ADMIN';
    const isScheduler = user?.role === 'SCHEDULER';
    const isViewer = user?.role === 'VIEWER';
    const canEdit = isOrgAdmin || isScheduler; // Only ORG_ADMIN and SCHEDULER can edit

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

    const { data: rooms } = useSWR<Room[]>(
        selectedTenantId ? `/api/rooms?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    const { data: events, mutate: mutateEvents } = useSWR<Event[]>(
        () => {
            if (!selectedTenantId) return null;
            let url = `/api/events?tenant_id=${selectedTenantId}`;
            if (searchParams) {
                if (searchParams.start_date && searchParams.end_date) {
                    url += `&start_date=${searchParams.start_date}&end_date=${searchParams.end_date}`;
                }
                if (searchParams.building_id) {
                    url += `&building_id=${searchParams.building_id}`;
                }
                if (searchParams.room_id) {
                    url += `&room_id=${searchParams.room_id}`;
                }
            }
            return url;
        },
        fetcher
    );

    // Helper to get room name
    const getRoomName = (id: number) => {
        const room = rooms?.find(r => r.id === id);
        return room ? `${room.building_name}: ${room.name}` : 'Unknown Room';
    };

    // Handlers
    const handleCreateEvent = async (e: React.FormEvent, forceCreate = false) => {
        e.preventDefault();
        if (!selectedTenantId) return;

        // Build start_time and end_time from date range + daily times
        const isRecurring = dateRangeDefaults.start_date !== dateRangeDefaults.end_date;

        // Construct Date objects in Local Time
        const startDateObj = new Date(`${dateRangeDefaults.start_date}T${eventForm.daily_start_time}`);
        const endDateObj = new Date(`${dateRangeDefaults.end_date}T${eventForm.daily_end_time}`);

        // Send as UTC ISO strings
        const start_time = startDateObj.toISOString();
        const end_time = endDateObj.toISOString();

        const url = editingEventId ? '/api/events' : '/api/events';
        const method = editingEventId ? 'PUT' : 'POST';
        const body = {
            ...eventForm,
            start_time,
            end_time,
            recurrence_days: isRecurring ? eventForm.recurrence_days.join(',') : null,
            daily_start_time: isRecurring ? eventForm.daily_start_time : null,
            daily_end_time: isRecurring ? eventForm.daily_end_time : null,
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
                    setTimeout(() => setError(''), 3000);
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
            // Clear form but keep date range defaults
            setEventForm({
                room_id: '',
                title: '',
                facilitator_name: '',
                description: '',
                event_type: 'class',
                recurrence_days: [],
                daily_start_time: '',
                daily_end_time: ''
            });
            setEditingEventId(null);
            setMessage(`Event ${editingEventId ? 'updated' : 'created'} successfully`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(`Error ${editingEventId ? 'updating' : 'creating'} event`);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleEditEvent = (event: Event) => {
        setEditingEventId(event.id);

        // Helper to get local date string YYYY-MM-DD
        const toLocalYMD = (dateStr: string) => {
            const date = new Date(dateStr);
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 10);
        };

        // Helper to get local time string HH:mm
        const toLocalHM = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        };

        // Populate date range from event's start/end times using Local Time
        const startDate = toLocalYMD(event.start_time);
        const endDate = toLocalYMD(event.end_time);

        setDateRangeDefaults({
            start_date: startDate,
            end_date: endDate
        });

        setEventForm({
            room_id: event.room_id.toString(),
            title: event.title,
            facilitator_name: event.facilitator_name || '',
            description: event.description || '',
            event_type: event.event_type || 'class',
            recurrence_days: event.recurrence_days ? event.recurrence_days.split(',') : [],
            daily_start_time: event.daily_start_time || toLocalHM(event.start_time),
            daily_end_time: event.daily_end_time || toLocalHM(event.end_time)
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
            description: '',
            event_type: 'class',
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
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError('Error deleting event');
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

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            ← Back
                        </a>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {currentTenant?.name || 'Events & Schedule Management'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm">{message}</div>}
                        {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{error}</div>}
                    </div>
                </header>

                {/* Events Section */}
                {selectedTenantId ? (
                    <section className="bg-white rounded-xl shadow p-5">
                        <h2 className="text-lg font-bold mb-3">Events & Schedule</h2>

                        {/* Date Range Defaults Block */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-bold text-blue-900 mb-3">📅 Event Period & Filtering</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Building</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        id="search-building-select"
                                        onChange={(e) => {
                                            // Optional: Clear room selection if building changes?
                                            // For now just let it update state
                                            const roomSelect = document.getElementById('search-room-select') as HTMLSelectElement;
                                            if (roomSelect) roomSelect.value = '';
                                        }}
                                    >
                                        <option value="">All Buildings</option>
                                        {buildings?.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        id="search-room-select"
                                    >
                                        <option value="">All Rooms</option>
                                        {rooms?.map(r => {
                                            // Simple client-side filter if needed, but for now showing all or filtered by building if we want to get fancy.
                                            // Let's filter by the selected building in the DOM if possible, or just show all and let the user pick.
                                            // Better UX: Filter list based on selected building.
                                            // Since we are using uncontrolled inputs for the search form (reading values on click), 
                                            // we might need to change this component to use state for the search inputs if we want dynamic filtering.
                                            // However, for simplicity, we can just list all rooms or use a simple logic.
                                            // Let's try to grab the value from the building select if possible, but react state is cleaner.
                                            // We'll stick to listing all rooms for now to keep it simple as requested, 
                                            // but adding building name to the option text helps.
                                            return (
                                                <option key={r.id} value={r.id} data-building={r.building_id}>
                                                    {r.name} ({r.building_name})
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full border p-2 rounded"
                                        value={dateRangeDefaults.start_date}
                                        onChange={e => setDateRangeDefaults({ ...dateRangeDefaults, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="w-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full border p-2 rounded"
                                            value={dateRangeDefaults.end_date}
                                            onChange={e => setDateRangeDefaults({ ...dateRangeDefaults, end_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const buildingSelect = document.getElementById('search-building-select') as HTMLSelectElement;
                                            const roomSelect = document.getElementById('search-room-select') as HTMLSelectElement;
                                            setSearchParams({
                                                start_date: dateRangeDefaults.start_date,
                                                end_date: dateRangeDefaults.end_date,
                                                building_id: buildingSelect?.value || undefined,
                                                room_id: roomSelect?.value || undefined
                                            });
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition-colors mb-[1px]"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Only show form for users who can edit */}
                        {canEdit && (
                            <form id="event-form" onSubmit={handleCreateEvent} noValidate className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-6 rounded-lg ${editingEventId ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50'}`}>
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

                                {/* Show days of week if start_date !== end_date (recurring) */}
                                {dateRangeDefaults.start_date && dateRangeDefaults.end_date && dateRangeDefaults.start_date !== dateRangeDefaults.end_date && (
                                    <div className="col-span-2">
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
                                )}

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Daily Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full border p-2 rounded"
                                        value={eventForm.daily_start_time}
                                        onChange={e => setEventForm({ ...eventForm, daily_start_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Daily End Time</label>
                                    <input
                                        type="time"
                                        className="w-full border p-2 rounded"
                                        value={eventForm.daily_end_time}
                                        onChange={e => setEventForm({ ...eventForm, daily_end_time: e.target.value })}
                                        required
                                    />
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
                        )}

                        <FilterSortCard
                            timeFilter={timeFilter}
                            onTimeFilterChange={setTimeFilter}
                            typeFilter={typeFilter}
                            onTypeFilterChange={setTypeFilter}
                            sortBy={sortBy}
                            onSortByChange={setSortBy}
                            sortOrder={sortOrder}
                            onSortOrderChange={setSortOrder}
                        />

                        <div className="space-y-4">

                            {events?.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No events scheduled.</p>
                            ) : (
                                <div className="space-y-3">
                                    {events?.filter(event => {
                                        // Time Filter
                                        if (timeFilter === 'current') {
                                            const now = new Date();
                                            const start = new Date(event.start_time);
                                            const end = new Date(event.end_time);
                                            // Check if "now" is between start and end
                                            if (now < start || now > end) return false;
                                        }

                                        // Type Filter
                                        if (typeFilter !== 'All') {
                                            // Case-insensitive check just in case
                                            if (event.event_type.toLowerCase() !== typeFilter.toLowerCase()) return false;
                                        }

                                        return true;
                                    })
                                        .sort((a, b) => {
                                            if (sortBy === 'name') {
                                                return sortOrder === 'asc'
                                                    ? a.title.localeCompare(b.title)
                                                    : b.title.localeCompare(a.title);
                                            } else {
                                                // Sort by date
                                                const dateA = new Date(a.start_time).getTime();
                                                const dateB = new Date(b.start_time).getTime();
                                                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                                            }
                                        })
                                        .map(event => (
                                            <div key={event.id} className="flex items-center justify-between border p-3 rounded-lg bg-white hover:bg-slate-50">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-base text-slate-900">{event.title}</span>
                                                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full uppercase tracking-wide text-slate-600">{event.event_type}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 space-y-0.5">
                                                        <p>📍 {getRoomName(event.room_id)}</p>
                                                        <p>👤 {event.facilitator_name || 'No facilitator'}</p>
                                                        {event.recurrence_days ? (
                                                            <>
                                                                <p>📅 {event.recurrence_days.split(',').map(d => d.trim()).join(', ')}</p>
                                                                <p>🕒 {event.daily_start_time} - {event.daily_end_time} ({new Date(event.start_time).toLocaleDateString()} - {new Date(event.end_time).toLocaleDateString()})</p>
                                                            </>
                                                        ) : (
                                                            <p>🕒 {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(event.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <div className="flex items-center scale-90 origin-right">
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
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <div className="h-full flex items-center justify-center bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 p-12">
                        Loading...
                    </div>
                )}
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

            {/* Footer */}
            <footer className="mt-12 border-t border-slate-200 pt-6 pb-4">
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
        </div >
    );
}
