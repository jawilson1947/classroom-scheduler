'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FilterSortCard, TimeFilter, TypeFilter, SortBy, SortOrder } from '@/components/FilterSortCard';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
import Modal from '@/components/Modal';
import 'quill/dist/quill.snow.css'; // Import styles for viewing content

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

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
    narrative?: string;
    facilitator_id?: number | null;
    Facilitator_id?: number | null; // API returns uppercase F sometimes
}

interface Facilitator {
    id: number;
    name_on_door: string;
    first_name: string;
    last_name: string;
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
        facilitator_id: null as number | null,
        description: '',
        event_type: 'class',
        recurrence_days: [] as string[],
        daily_start_time: '',
        daily_end_time: '',
        narrative: ''
    });

    // Track initial form state for change detection
    const [initialEventForm, setInitialEventForm] = useState<typeof eventForm | null>(null);

    // Search Filter State (Controlled)
    const [searchBuildingId, setSearchBuildingId] = useState<string>('');

    // Filter & Sort State
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [narrativeModalOpen, setNarrativeModalOpen] = useState(false);
    const [viewNarrative, setViewNarrative] = useState<{ title: string; content: string } | null>(null);
    const [conflictData, setConflictData] = useState<any[]>([]);
    const [message, setMessage] = useState('');

    const [error, setError] = useState('');
    const [searchParams, setSearchParams] = useState<{ start_date: string, end_date: string, building_id?: string, room_id?: string } | null>(null);
    const [page, setPage] = useState(1);
    const LIMIT = 6;

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

    const { data: rooms, error: roomsError, isLoading: roomsLoading } = useSWR<Room[]>(
        selectedTenantId ? `/api/rooms?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    const { data: facilitators } = useSWR<Facilitator[]>(
        selectedTenantId ? `/api/facilitators?tenant_id=${selectedTenantId}` : null,
        fetcher
    );

    interface PaginatedEvents {
        data: Event[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }

    const { data: eventsData, mutate: mutateEvents } = useSWR<PaginatedEvents>(
        () => {
            if (!selectedTenantId) return null;
            let url = `/api/events?tenant_id=${selectedTenantId}&page=${page}&limit=${LIMIT}`;
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

    // For backward compatibility while deploying API, handle array response if any (though we updated API)
    const events = Array.isArray(eventsData) ? eventsData : (eventsData?.data || []);
    const pagination = Array.isArray(eventsData) ? null : eventsData?.pagination;

    // Helper to get room name
    const getRoomName = (id: number) => {
        const room = rooms?.find(r => r.id === id);
        if (room) return `${room.building_name}: ${room.name}`;

        let debug = `Unknown Room (ID: ${id}`;
        debug += `, Tenant: ${selectedTenantId}`;
        debug += `, Loaded: ${rooms?.length || 0}`;
        if (roomsLoading) debug += ", Loading...";
        if (roomsError) debug += `, Error: ${roomsError}`;
        debug += ")";
        return debug;
    };

    // Handlers
    const handleCreateEvent = async (e: React.FormEvent, forceCreate = false) => {
        e.preventDefault();
        if (!selectedTenantId) return;

        // Build start_time and end_time from date range + daily times
        const isRecurring = dateRangeDefaults.start_date !== dateRangeDefaults.end_date;

        // Validation
        const newErrors: string[] = [];
        if (!eventForm.room_id) newErrors.push('Room is required');
        if (!eventForm.title.trim()) newErrors.push('Title is required');
        if (!eventForm.daily_start_time) newErrors.push('Start time is required');
        if (!eventForm.daily_end_time) newErrors.push('End time is required');
        if (isRecurring && eventForm.recurrence_days.length === 0) newErrors.push('At least one recurrence day is required');

        if (newErrors.length > 0) {
            setError(newErrors.join(', '));
            setTimeout(() => setError(''), 5000);
            return;
        }

        // Construct Date objects in Local Time
        const startDateString = `${dateRangeDefaults.start_date}T${eventForm.daily_start_time}`;
        const endDateString = `${dateRangeDefaults.end_date}T${eventForm.daily_end_time}`;

        const startDateObj = new Date(startDateString);
        const endDateObj = new Date(endDateString);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            setError('Invalid date or time value. Please check your inputs.');
            setTimeout(() => setError(''), 3000);
            return;
        }

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
                daily_end_time: '',
                narrative: '',
                facilitator_id: null
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
            if (isNaN(date.getTime())) return '';
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        // Populate date range from event's start/end times using Local Time
        const startDate = toLocalYMD(event.start_time);
        const endDate = toLocalYMD(event.end_time);

        setDateRangeDefaults({
            start_date: startDate,
            end_date: endDate
        });

        const newFormState = {
            room_id: event.room_id.toString(),
            title: event.title,
            facilitator_name: event.facilitator_name || '',
            description: event.description || '',
            event_type: event.event_type || 'class',
            recurrence_days: event.recurrence_days ? event.recurrence_days.split(',') : [],
            daily_start_time: event.daily_start_time || toLocalHM(event.start_time),
            daily_end_time: event.daily_end_time || toLocalHM(event.end_time),
            narrative: event.narrative || '',
            facilitator_id: (event.facilitator_id || event.Facilitator_id) ? Number(event.facilitator_id || event.Facilitator_id) : null
        };
        setEventForm(newFormState);
        setInitialEventForm(newFormState);

        // Scroll to form
        const form = document.getElementById('event-form');
        form?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        // Check for unsaved changes
        if (initialEventForm && JSON.stringify(eventForm) !== JSON.stringify(initialEventForm)) {
            if (!confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                return;
            }
        }

        setEditingEventId(null);
        setInitialEventForm(null);
        setEventForm({
            room_id: '',
            title: '',
            facilitator_name: '',
            description: '',
            event_type: 'class',
            recurrence_days: [],
            daily_start_time: '',
            daily_end_time: '',
            narrative: '',
            facilitator_id: null
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
                    <div className="flex items-center gap-3 no-print">
                        {message && <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm">{message}</div>}
                        {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{error}</div>}
                    </div>
                </header>

                {/* Events Section */}
                {selectedTenantId ? (
                    <section className="bg-white rounded-xl shadow p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-bold">Events & Schedule</h2>
                            <button
                                onClick={() => window.print()}
                                className="no-print bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                                🖨️ Print List
                            </button>
                        </div>

                        {/* Date Range Defaults Block */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 no-print">
                            <h3 className="text-sm font-bold text-blue-900 mb-3">📅 Event Period & Filtering</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Building</label>
                                    <select
                                        className="w-full border p-2 rounded text-slate-900"
                                        value={searchBuildingId}
                                        onChange={(e) => {
                                            setSearchBuildingId(e.target.value);
                                            // Reset the data entry room selection when filter changes
                                            setEventForm(prev => ({ ...prev, room_id: '' }));
                                        }}
                                    >
                                        <option value="">All Buildings</option>
                                        {buildings?.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full border p-2 rounded text-slate-900 placeholder:text-slate-500"
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
                                            className="w-full border p-2 rounded text-slate-900 placeholder:text-slate-500"
                                            value={dateRangeDefaults.end_date}
                                            onChange={e => setDateRangeDefaults({ ...dateRangeDefaults, end_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchParams({
                                                start_date: dateRangeDefaults.start_date,
                                                end_date: dateRangeDefaults.end_date,
                                                building_id: searchBuildingId || undefined,
                                                // Use the data entry form's room selection for searching
                                                room_id: eventForm.room_id || undefined
                                            });
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition-colors mb-[1px]"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                            {(dateRangeDefaults.start_date && dateRangeDefaults.end_date && dateRangeDefaults.end_date < dateRangeDefaults.start_date) && (
                                <div className="mt-3 bg-red-50 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2 border border-red-200">
                                    ⚠️ <strong>Warning:</strong> The End Date cannot be earlier than the Start Date.
                                </div>
                            )}
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
                                {(eventForm.daily_start_time && eventForm.daily_end_time && eventForm.daily_end_time < eventForm.daily_start_time) && (
                                    <div className="col-span-2 bg-red-50 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2 border border-red-200 mb-2">
                                        ⚠️ <strong>Warning:</strong> The End Time cannot be earlier than the Start Time.
                                    </div>
                                )}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                                    <select
                                        className="w-full border p-2 rounded text-slate-900"
                                        value={eventForm.room_id}
                                        onChange={e => setEventForm({ ...eventForm, room_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Room...</option>
                                        {rooms
                                            ?.filter(r => !searchBuildingId || r.building_id.toString() === searchBuildingId)
                                            .map(r => <option key={r.id} value={r.id}>{r.name} ({r.building_name})</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                                    <div className="flex gap-4 items-center">
                                        <select
                                            className="w-full border p-2 rounded text-slate-900"
                                            value={eventForm.event_type}
                                            onChange={e => setEventForm({ ...eventForm, event_type: e.target.value })}
                                        >
                                            <option value="class">Class</option>
                                            <option value="meeting">Meeting</option>
                                            <option value="event">Event</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setNarrativeModalOpen(true)}
                                            disabled={!eventForm.room_id || !eventForm.event_type}
                                            className={`font-semibold underline whitespace-nowrap transition-colors ${(!eventForm.room_id || !eventForm.event_type)
                                                ? 'text-slate-400 cursor-not-allowed no-underline'
                                                : 'text-blue-600 hover:text-blue-800'
                                                }`}
                                            title={(!eventForm.room_id || !eventForm.event_type) ? "Please select a Room and Event Type first" : ""}
                                        >
                                            {eventForm.narrative ? 'Edit Narrative (Content Exists)' : 'Add Narrative'}
                                        </button>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <input
                                        className="w-full border p-2 rounded text-slate-900 placeholder:text-slate-500"
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
                                        className="w-full border p-2 rounded text-slate-900 placeholder:text-slate-500"
                                        value={eventForm.daily_start_time}
                                        onChange={e => setEventForm({ ...eventForm, daily_start_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Daily End Time</label>
                                    <input
                                        type="time"
                                        className="w-full border p-2 rounded text-slate-900 placeholder:text-slate-500"
                                        value={eventForm.daily_end_time}
                                        onChange={e => setEventForm({ ...eventForm, daily_end_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Facilitator (Optional)</label>
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <input
                                                className="w-full border p-2 rounded text-slate-900 placeholder:text-slate-500"
                                                placeholder="e.g., Dr. Smith"
                                                value={eventForm.facilitator_name}
                                                onChange={e => {
                                                    // When user types manually, clear the facilitator_id (or keep it if they are just correcting a typo? 
                                                    // Requirement says: if listbox is non-select mode, update should nullify.
                                                    // Let's assume typing manually decouples from the ID unless they pick from list again.
                                                    // OR we can keep the ID if they just edit the name. 
                                                    // But to be safe and avoid stale IDs for wrong names, let's clear ID on manual edit.
                                                    setEventForm({ ...eventForm, facilitator_name: e.target.value, facilitator_id: null });
                                                }}
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <select
                                                className="w-full border p-2 rounded text-slate-900"
                                                value={eventForm.facilitator_id || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val) {
                                                        const id = parseInt(val);
                                                        const facilitator = facilitators?.find(f => f.id === id);
                                                        if (facilitator) {
                                                            setEventForm({
                                                                ...eventForm,
                                                                facilitator_id: id,
                                                                facilitator_name: facilitator.name_on_door
                                                            });
                                                        }
                                                    } else {
                                                        // "None" selected
                                                        setEventForm({
                                                            ...eventForm,
                                                            facilitator_id: null,
                                                            // Optional: clear name if they select None? 
                                                            // Requirement: "if an event is updated, and the facilitator listbox is in non-select mode, nullify the facilitator_id"
                                                            // It implies we just nullify ID, maybe keep name or clear it. 
                                                            // Let's clear name to be consistent with "None".
                                                            facilitator_name: ''
                                                        });
                                                    }
                                                }}
                                            >
                                                <option value="">Select Facilitator...</option>
                                                {facilitators?.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name_on_door}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
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

                        {/* Narrative Modal */}
                        <Modal
                            isOpen={narrativeModalOpen}
                            onClose={() => setNarrativeModalOpen(false)}
                            title="Edit Event Narrative"
                        >
                            <div className="space-y-4">
                                <QuillEditor
                                    value={eventForm.narrative}
                                    onChange={(value: string) => setEventForm({ ...eventForm, narrative: value })}
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setNarrativeModalOpen(false)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </Modal>

                        {/* View Narrative Modal */}
                        <Modal
                            isOpen={!!viewNarrative}
                            onClose={() => setViewNarrative(null)}
                            title={viewNarrative?.title || ''}
                        >
                            <div className="space-y-4">
                                {(() => {
                                    // Extract text content from HTML to check for URL
                                    const tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = viewNarrative?.content || '';
                                    const textContent = tempDiv.textContent?.trim() || '';
                                    const isUrl = textContent.toLowerCase().startsWith('http');

                                    if (isUrl) {
                                        return (
                                            <div className="w-full h-[600px] bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                                <iframe
                                                    src={textContent}
                                                    className="w-full h-full border-0"
                                                    title="Narrative Content"
                                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                                />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            className="ql-editor !p-0" // Reuse Quill editor styles for consistency
                                            dangerouslySetInnerHTML={{ __html: viewNarrative?.content || '' }}
                                        />
                                    );
                                })()}
                                <div className="flex justify-end pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => setViewNarrative(null)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </Modal>

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
                                            <div key={event.id} className="event-card flex items-center justify-between border p-3 rounded-lg bg-white hover:bg-slate-50">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {event.narrative ? (
                                                            <button
                                                                onClick={() => setViewNarrative({ title: event.title, content: event.narrative! })}
                                                                className="font-bold text-base text-blue-600 hover:text-blue-800 underline text-left"
                                                            >
                                                                {event.title}
                                                            </button>
                                                        ) : (
                                                            <span className="font-bold text-base text-slate-900">{event.title}</span>
                                                        )}
                                                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full uppercase tracking-wide text-slate-600">{event.event_type}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 space-y-0.5">
                                                        <p>📍 {getRoomName(event.room_id)}</p>
                                                        <p>👤 {event.facilitator_name || 'No facilitator'}</p>
                                                        {event.recurrence_days ? (
                                                            <>
                                                                <p>📅 {event.recurrence_days.split(',').map((d: string) => d.trim()).join(', ')}</p>
                                                                <p>🕒 {event.daily_start_time} - {event.daily_end_time} ({new Date(event.start_time).toLocaleDateString()} - {new Date(event.end_time).toLocaleDateString()})</p>
                                                            </>
                                                        ) : (
                                                            <p>🕒 {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(event.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <div className="flex items-center scale-90 origin-right no-print">
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

                            {/* Pagination Controls */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 mt-4 no-print">
                                    <div className="text-sm text-slate-500">
                                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(page - 1)}
                                            disabled={page <= 1}
                                            className="px-3 py-1 bg-white border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                                .filter(p => p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1))
                                                .map((p, i, arr) => (
                                                    <div key={p} className="flex">
                                                        {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                                                        <button
                                                            onClick={() => setPage(p)}
                                                            className={`px-3 py-1 rounded text-sm ${page === p ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                        <button
                                            onClick={() => setPage(page + 1)}
                                            disabled={page >= pagination.totalPages}
                                            className="px-3 py-1 bg-white border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
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
            <Footer />
        </div >
    );
}
