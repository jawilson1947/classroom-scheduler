'use client';

import { useParams } from 'next/navigation';
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
}

interface Room {
    id: number;
    name: string;
    building_name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DisplayPage() {
    const params = useParams();
    const roomId = params.id as string;
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isOnline, setIsOnline] = useState(true);

    // Fetch room details
    const { data: rooms } = useSWR<Room[]>(`/api/rooms?tenant_id=1`, fetcher, {
        refreshInterval: 60000, // Refresh every minute
        onError: () => setIsOnline(false),
        onSuccess: () => setIsOnline(true),
    });

    const room = rooms?.find((r) => r.id === parseInt(roomId));

    // Fetch events for this room
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: events } = useSWR<Event[]>(
        `/api/events?room_id=${roomId}&start_date=${today}T00:00:00&end_date=${today}T23:59:59&tenant_id=1`,
        fetcher,
        {
            refreshInterval: 30000, // Refresh every 30 seconds
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

    // Find current and upcoming events
    const currentEvent = events?.find((event) => {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        return isWithinInterval(currentTime, { start, end });
    });

    const upcomingEvents = events?.filter((event) => {
        const start = new Date(event.start_time);
        return isAfter(start, currentTime);
    }) || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-5xl font-bold">{room?.name || 'Loading...'}</h1>
                    <p className="text-2xl text-slate-400 mt-2">{room?.building_name}</p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-bold">{format(currentTime, 'h:mm a')}</div>
                    <div className="text-xl text-slate-400">{format(currentTime, 'EEEE, MMMM d')}</div>
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
                        {format(new Date(currentEvent.start_time), 'h:mm a')} - {format(new Date(currentEvent.end_time), 'h:mm a')}
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
                        {upcomingEvents.slice(0, 3).map((event) => (
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
                                            {format(new Date(event.start_time), 'h:mm a')}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {format(new Date(event.end_time), 'h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {upcomingEvents.length === 0 && !currentEvent && (
                <div className="text-center text-slate-500 mt-8">
                    <p className="text-xl">No events scheduled for today</p>
                </div>
            )}
        </div>
    );
}
