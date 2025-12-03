'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { format, isAfter, isBefore, isWithinInterval } from 'date-fns';

interface Event {
    id: number;
    title: string;
    facilitator_name: string | null;
    start_time: string;
    end_time: string;
    description: string | null;
    recurrence_days?: string;
    daily_start_time?: string;
    daily_end_time?: string;
    display_start?: Date;
    display_end?: Date;
}

interface Room {
    id: number;
    name: string;
    building_name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DisplayPage() {
    const params = useParams();
    const roomId = params?.id as string;

    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        setCurrentTime(new Date()); // Set initial time on mount
        const storedTenantId = localStorage.getItem('tenant_id');
        console.log('Stored Tenant ID:', storedTenantId);
        if (!storedTenantId) {
            router.push('/display/setup');
        } else {
            setTenantId(storedTenantId);
        }
    }, [router]);

    // Fetch room details
    const { data: rooms, isLoading } = useSWR<Room[]>(
        tenantId ? `/api/rooms?tenant_id=${tenantId}` : null,
        fetcher,
        {
            refreshInterval: 60000, // Refresh every minute
            onError: (err) => {
                console.error('Rooms fetch error:', err);
                setIsOnline(false);
            },
            onSuccess: (data) => {
                console.log('Rooms fetched:', data);
                setIsOnline(true);
            },
        }
    );

    console.log('Tenant ID:', tenantId);
    console.log('Room ID param:', roomId);
    console.log('Rooms data:', rooms);

    // Fetch events for this room
    // For recurring events, we need a broader date range
    const today = new Date();
    const startOfMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
    const endOfMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
    const isValidRoomId = roomId && !isNaN(parseInt(roomId));
    const { data: events, mutate: mutateEvents } = useSWR<Event[]>(
        tenantId && isValidRoomId ? `/api/events?room_id=${roomId}&start_date=${startOfMonth}T00:00:00&end_date=${endOfMonth}T23:59:59&tenant_id=${tenantId}` : null,
        fetcher,
        {
            refreshInterval: 300000, // Refresh every 5 minutes (SSE will handle real-time updates)
            onError: () => setIsOnline(false),
            onSuccess: () => setIsOnline(true),
        }
    );

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Connect to SSE for real-time updates
    useEffect(() => {
        if (!tenantId) return;

        console.log('[SSE] Connecting to event stream...');
        const eventSource = new EventSource('/api/events/stream');

        eventSource.onopen = () => {
            console.log('[SSE] Connected to event stream');
            setIsOnline(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Received message:', data);

                // Revalidate events when any event is created, updated, or deleted
                if (data.type === 'event_created' || data.type === 'event_updated' || data.type === 'event_deleted') {
                    console.log('[SSE] Revalidating events...');
                    mutateEvents();
                }
            } catch (error) {
                console.error('[SSE] Error parsing message:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('[SSE] Connection error:', error);
            setIsOnline(false);
            eventSource.close();
        };

        return () => {
            console.log('[SSE] Disconnecting from event stream');
            eventSource.close();
        };
    }, [tenantId, mutateEvents]);

    const room = rooms?.find((r) => r.id === parseInt(roomId));
    console.log('Found Room:', room);

    if (!isValidRoomId) {
        return <div className="text-white p-8">Invalid Room ID</div>;
    }

    if (!isLoading && rooms && !room) {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center">
                <h1 className="text-3xl font-bold mb-4">Room Not Found</h1>
                <p className="text-slate-400 mb-8">
                    Room ID {roomId} does not exist for the current organization.
                </p>
                <button
                    onClick={() => router.push('/display/setup')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                    Go to Setup
                </button>
            </div>
        );
    }

    // Get all events for today
    const todaysEvents = (currentTime && Array.isArray(events)) ? events.filter((event) => {
        // Handle recurring events
        if (event.recurrence_days && event.daily_start_time && event.daily_end_time) {
            const todayDay = format(currentTime, 'EEE'); // Mon, Tue, etc.
            if (!event.recurrence_days.includes(todayDay)) return false;

            // Check if today is within the event's date range
            const eventStartDate = new Date(event.start_time);
            const eventEndDate = new Date(event.end_time);
            const todayStart = new Date(currentTime);
            todayStart.setHours(0, 0, 0, 0);

            if (isBefore(todayStart, eventStartDate) || isAfter(todayStart, eventEndDate)) {
                return false;
            }

            return true;
        }

        // For non-recurring events, check if they occur today
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

        const todayStart = new Date(currentTime);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(currentTime);
        todayEnd.setHours(23, 59, 59, 999);

        // Event occurs today if it starts or ends today, or spans across today
        return (isWithinInterval(start, { start: todayStart, end: todayEnd }) ||
            isWithinInterval(end, { start: todayStart, end: todayEnd }) ||
            (isBefore(start, todayStart) && isAfter(end, todayEnd)));
    }).map((event) => {
        // For recurring events, create a version with today's times
        if (event.recurrence_days && event.daily_start_time && event.daily_end_time && currentTime) {
            const todayStr = format(currentTime, 'yyyy-MM-dd');
            return {
                ...event,
                display_start: new Date(`${todayStr}T${event.daily_start_time}`),
                display_end: new Date(`${todayStr}T${event.daily_end_time}`)
            };
        }
        return {
            ...event,
            display_start: new Date(event.start_time),
            display_end: new Date(event.end_time)
        };
    }).sort((a, b) => a.display_start!.getTime() - b.display_start!.getTime()) : [];

    // Find current event
    const currentEvent = todaysEvents.find((event) => {
        if (!currentTime) return false;
        return isWithinInterval(currentTime, { start: event.display_start!, end: event.display_end! });
    });

    // All events that haven't started yet (upcoming)
    const upcomingEvents = todaysEvents.filter((event) => {
        if (!currentTime) return false;
        return isAfter(event.display_start!, currentTime);
    });

    // Events that already finished today (past)
    const pastEvents = todaysEvents.filter((event) => {
        if (!currentTime) return false;
        return isBefore(event.display_end!, currentTime) && !currentEvent;
    });

    if (!mounted) {
        return <div className="min-h-screen bg-slate-900 text-white p-8 flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-5xl font-bold">{room?.name || 'Loading...'}</h1>
                    <p className="text-2xl text-slate-400 mt-2">{room?.building_name}</p>
                </div>
                <div className="text-right">
                    {mounted && currentTime ? (
                        <>
                            <div className="text-4xl font-bold" suppressHydrationWarning>{format(currentTime, 'h:mm a')}</div>
                            <div className="text-xl text-slate-400" suppressHydrationWarning>{format(currentTime, 'EEEE, MMMM d')}</div>
                        </>
                    ) : (
                        <div className="text-4xl font-bold">--:--</div>
                    )}
                    <div className={`mt-2 text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                        {isOnline ? '● Online' : '● Offline'}
                    </div>
                </div>
            </div>

            {/* Current Event */}
            {currentEvent ? (
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-8 mb-8 shadow-2xl">
                    <div className="text-sm uppercase tracking-wider opacity-90 mb-2">Current Event</div>
                    <h2 className="text-4xl font-bold mb-4">{currentEvent.title}</h2>
                    {currentEvent.facilitator_name && (
                        <p className="text-2xl mb-2">Facilitator: {currentEvent.facilitator_name}</p>
                    )}
                    <p className="text-xl opacity-90">
                        {currentEvent.recurrence_days && currentEvent.daily_start_time && currentEvent.daily_end_time ? (
                            // Parse daily times (e.g. "10:00:00") to show AM/PM
                            `${format(new Date(`2000-01-01T${currentEvent.daily_start_time}`), 'h:mm a')} - ${format(new Date(`2000-01-01T${currentEvent.daily_end_time}`), 'h:mm a')}`
                        ) : (
                            `${format(new Date(currentEvent.start_time), 'h:mm a')} - ${format(new Date(currentEvent.end_time), 'h:mm a')}`
                        )}
                    </p>
                    {currentEvent.description && (
                        <p className="mt-4 text-lg opacity-80">{currentEvent.description}</p>
                    )}
                </div>
            ) : (
                <div className="bg-slate-800 rounded-2xl p-8 mb-8 border-2 border-dashed border-slate-600">
                    <h2 className="text-3xl font-bold text-slate-400">Room Available</h2>
                    <p className="text-xl text-slate-500 mt-2">No current event scheduled</p>
                </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
                <div>
                    <h3 className="text-2xl font-bold mb-4 text-slate-300">Upcoming Events</h3>
                    <div className="space-y-4">
                        {upcomingEvents.map((event) => (
                            <div key={event.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-2xl font-semibold">{event.title}</h4>
                                        {event.facilitator_name && (
                                            <p className="text-lg text-slate-400 mt-1">{event.facilitator_name}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-medium">
                                            {format(event.display_start!, 'h:mm a')}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {format(event.display_end!, 'h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
                <div>
                    <h3 className="text-2xl font-bold mb-4 text-slate-300">Earlier Today</h3>
                    <div className="space-y-4">
                        {pastEvents.map((event) => (
                            <div key={event.id} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 opacity-60">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-2xl font-semibold">{event.title}</h4>
                                        {event.facilitator_name && (
                                            <p className="text-lg text-slate-400 mt-1">{event.facilitator_name}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-medium">
                                            {format(event.display_start!, 'h:mm a')}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {format(event.display_end!, 'h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {upcomingEvents.length === 0 && !currentEvent && pastEvents.length === 0 && (
                <div className="text-center text-slate-500 mt-8">
                    <p className="text-xl">No events scheduled for today</p>
                </div>
            )}
        </div>
    );
}
