'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
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

    if (!role) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center p-8 bg-slate-800 rounded-xl shadow-lg border border-slate-700 max-w-md mx-4">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Account Not Configured</h1>
                    <p className="text-slate-400 mb-6">
                        Your account ({user.email}) has not been assigned a role or organization yet.
                    </p>
                    <p className="text-slate-400 mb-8 text-sm">
                        Please contact your system administrator to have your account set up.
                    </p>
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

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
            {/* Footer */}
            <Footer />
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
                    description="Edit organization details and logo"
                    href="/admin/organization"
                    icon="⚙️"
                    color="blue"
                />
                <DashboardCard
                    title="Manage Buildings"
                    description="Manage buildings for your organization"
                    href="/admin/buildings"
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
                    href="/admin/events"
                    icon="📅"
                    color="green"
                />
                <DashboardCard
                    title="Manage Rooms and Devices"
                    description="Pair and manage iPad displays"
                    href="/admin/rooms"
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
                href="/admin/events"
                icon="📅"
                color="green"
            />
            <DashboardCard
                title="View Schedule"
                description="View all scheduled events"
                href="/admin/events"
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
                href="/admin/events"
                icon="📅"
                color="blue"
            />
            <DashboardCard
                title="Room Schedules"
                description="See what's happening in each room"
                href="/admin/events"
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
        blue: 'bg-blue-700 hover:bg-blue-800',
        purple: 'bg-purple-700 hover:bg-purple-800',
        green: 'bg-green-700 hover:bg-green-800',
        orange: 'bg-orange-700 hover:bg-orange-800'
    };

    return (
        <Link href={href}>
            <div className={`block max-w-sm p-6 ${colorClasses[color]} border border-gray-200 rounded-lg shadow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                <div className="text-6xl mb-4">{icon}</div>
                <h5 className="mb-2 text-2xl font-bold tracking-tight text-white">{title}</h5>
                <p className="font-normal text-white/90">{description}</p>
            </div>
        </Link>
    );
}
