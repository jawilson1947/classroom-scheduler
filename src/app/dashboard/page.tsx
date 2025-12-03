'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const user = session.user as any;
    const role = user.role;

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: '/login' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 shadow-lg">
                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Classroom Scheduler</h1>
                        <p className="text-slate-400 text-sm">Welcome, {user.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-white font-semibold">{user.email}</p>
                            <p className="text-slate-400 text-sm">{role.replace('_', ' ')}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-8 py-12">
                <div className="mb-8">
                    <h2 className="text-4xl font-bold text-white mb-2">Dashboard</h2>
                    <p className="text-slate-400 text-lg">Your role: {role.replace('_', ' ')}</p>
                </div>

                {/* Role-specific content */}
                {role === 'SYSTEM_ADMIN' && (
                    <SystemAdminDashboard />
                )}

                {role === 'ORG_ADMIN' && (
                    <OrgAdminDashboard user={user} />
                )}

                {role === 'SCHEDULER' && (
                    <SchedulerDashboard />
                )}

                {role === 'VIEWER' && (
                    <ViewerDashboard />
                )}
            </div>
        </div>
    );
}

function SystemAdminDashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard
                title="Manage All Tenants"
                description="View and manage all organizations in the system"
                href="/admin"
                icon="🏢"
                color="blue"
            />
            <DashboardCard
                title="User Management"
                description="Manage users across all tenants"
                href="/dashboard/users"
                icon="👥"
                color="purple"
            />
            <DashboardCard
                title="System Overview"
                description="View system-wide statistics and metrics"
                href="#"
                icon="📊"
                color="orange"
            />
            <DashboardCard
                title="All Events"
                description="View and manage all events"
                href="/admin?view=events"
                icon="📅"
                color="green"
            />
        </div>
    );
}

function OrgAdminDashboard({ user }: { user: any }) {
    const { data: tenant } = useSWR(
        user.tenant_id ? `/api/tenants?id=${user.tenant_id}` : null,
        fetcher
    );

    return (
        <div className="space-y-6">
            {tenant && (
                <div className="bg-white/10 border border-white/20 rounded-xl p-6 text-white">
                    <h3 className="text-xl font-semibold opacity-80">Organization</h3>
                    <div className="text-3xl font-bold">{tenant.name}</div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard
                    title="Manage Organization"
                    description="Manage buildings, rooms, and devices"
                    href="/admin?view=buildings"
                    icon="🏢"
                    color="blue"
                />
                <DashboardCard
                    title="Manage Users"
                    description="Create and manage user accounts"
                    href="/dashboard/users"
                    icon="👥"
                    color="purple"
                />
                <DashboardCard
                    title="Events & Schedule"
                    description="Create and manage events"
                    href="/admin?view=events"
                    icon="📅"
                    color="green"
                />
                <DashboardCard
                    title="Device Pairing"
                    description="Pair and manage iPad displays"
                    href="/admin?view=rooms"
                    icon="📱"
                    color="orange"
                />
            </div>
        </div>
    );
}

function SchedulerDashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard
                title="Manage Events"
                description="Create, edit, and delete events"
                href="/admin"
                icon="📅"
                color="green"
            />
            <DashboardCard
                title="View Schedule"
                description="View all scheduled events"
                href="/admin"
                icon="📊"
                color="blue"
            />
        </div>
    );
}

function ViewerDashboard() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard
                title="View Schedule"
                description="View all scheduled events (read-only)"
                href="/admin"
                icon="📅"
                color="blue"
            />
            <DashboardCard
                title="Room Schedules"
                description="See what's happening in each room"
                href="/admin"
                icon="🚪"
                color="purple"
            />
        </div>
    );
}

interface DashboardCardProps {
    title: string;
    description: string;
    href: string;
    icon: string;
    color: 'blue' | 'purple' | 'green' | 'orange';
}

function DashboardCard({ title, description, href, icon, color }: DashboardCardProps) {
    const colorClasses = {
        blue: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
        purple: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
        green: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
        orange: 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
    };

    return (
        <Link href={href}>
            <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1`}>
                <div className="text-5xl mb-4">{icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-100">{description}</p>
            </div>
        </Link>
    );
}
