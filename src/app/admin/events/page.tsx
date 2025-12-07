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
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [conflictData, setConflictData] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

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
    const { data: rooms } = useSWR<Room[]>(
        selectedTenantId ? `/api/rooms?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    const { data: events, mutate: mutateEvents } = useSWR<Event[]>(
        selectedTenantId ? `/api/events?tenant_id=${selectedTenantId}` : null,
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
                            <h3 className="text-sm font-bold text-blue-900 mb-3">📅 Event Period (Default for All Events)</h3>
                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full border p-2 rounded"
                                        value={dateRangeDefaults.end_date}
                                        onChange={e => setDateRangeDefaults({ ...dateRangeDefaults, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            {dateRangeDefaults.start_date && dateRangeDefaults.end_date && dateRangeDefaults.start_date !== dateRangeDefaults.end_date && (
                                <p className="text-xs text-blue-700 mt-2">📌 Recurring event mode: Select days of week below</p>
                            )}
                            {dateRangeDefaults.start_date && dateRangeDefaults.end_date && dateRangeDefaults.start_date === dateRangeDefaults.end_date && (
                                <p className="text-xs text-green-700 mt-2">✓ One-time event mode</p>
                            )}
                        </div>

                        {/* Only show form for users who can edit */}
                        {canEdit && (
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
                    <p className="mb-1">© {new Date().getFullYear()} Digital Support Systems of Alabama, LLC. All rights reserved.</p>
                    <p className="text-xs text-slate-500">System developed by Digital Support Systems of Alabama, LLC</p>
                </div>
            </footer>
        </div>
    );
}
