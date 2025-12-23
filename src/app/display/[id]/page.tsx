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
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isOnline, setIsOnline] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        const storedTenantId = localStorage.getItem('tenant_id');
        console.log('Stored Tenant ID:', storedTenantId);
        if (!storedTenantId) {
            router.push('/display/setup');
        } else {
            setTenantId(storedTenantId);
        }

        // Request fullscreen to hide browser chrome
        const enterFullscreen = async () => {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                console.log('Fullscreen request failed:', err);
            }
        };
        enterFullscreen();
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
        const eventSource = new EventSource(`/api/events/stream?tenant_id=${tenantId}&room_id=${roomId}`);

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
    const todaysEvents = Array.isArray(events) ? events.filter((event) => {
        // Debug
        const todayDay = format(currentTime, 'EEE');
        // console.log(`[Filter] Checking event ${event.id} (${event.title}) for ${todayDay}`);
        // Handle recurring events
        if (event.recurrence_days && event.daily_start_time && event.daily_end_time) {
            // Robust day checking: Map numeric day to 3-letter code
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const todayDay = days[currentTime.getDay()];

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
        if (event.recurrence_days && event.daily_start_time && event.daily_end_time) {
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
        return isWithinInterval(currentTime, { start: event.display_start!, end: event.display_end! });
    });

    // All events that haven't started yet (upcoming)
    const upcomingEvents = todaysEvents.filter((event) => {
        return isAfter(event.display_start!, currentTime);
    });

    // Events that already finished today (past)
    const pastEvents = todaysEvents.filter((event) => {
        return isBefore(event.display_end!, currentTime);
    });

    if (!mounted) {
        return <div className="min-h-screen bg-slate-900 text-white p-8 flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-4xl font-bold">{room?.name || 'Loading...'}</h1>
                    <p className="text-lg text-slate-400">{room?.building_name}</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold">
                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-base text-slate-400">
                        {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-slate-500">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
            </div>

            {/* ERROR DEBUG OVERLAY */}
            {/* <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs z-50">
                Time: {currentTime.toString()} <br/>
                Day: {format(currentTime, 'EEE')} <br/>
                Events: {events?.length || 0} <br/>
                RoomId: {roomId} <br/>
                TenantId: {tenantId}
            </div> */}

            {/* Current Event */}
            {currentEvent && (
                <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-xs font-medium text-white/90 italic mb-1">In Progress...</div>
                            <h4 className="text-base font-semibold text-white">{currentEvent.title}</h4>
                            {currentEvent.facilitator_name && (
                                <p className="text-sm text-white/80">{currentEvent.facilitator_name}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-white">
                                {currentEvent.display_start?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-white/80">
                                {currentEvent.display_end?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
                <div className="mb-6">
                    <div className="space-y-3">
                        {upcomingEvents.map((event) => (
                            <div key={event.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-base font-semibold">{event.title}</h4>
                                        {event.facilitator_name && (
                                            <p className="text-sm text-slate-400">{event.facilitator_name}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium">
                                            {event.display_start?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {event.display_end?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
                <div className="mb-6">
                    <div className="space-y-3">
                        {pastEvents.map((event) => (
                            <div key={event.id} className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-base font-semibold italic text-green-500">{event.title}</h4>
                                        {event.facilitator_name && (
                                            <p className="text-sm text-green-500/70 italic">{event.facilitator_name}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium italic text-green-500">
                                            {event.display_start?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-xs text-green-500/70 italic">
                                            {event.display_end?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No Events */}
            {todaysEvents.length === 0 && !isLoading && (
                <div className="text-center py-12">
                    <p className="text-base text-slate-500">No events scheduled for today</p>
                </div>
            )}
        </div>
    );
}
