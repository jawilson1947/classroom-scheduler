'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Footer from '@/components/Footer';

interface SettingsCard {
    href: string;
    title: string;
    description: string;
    icon: string;
    roles: string[];
}

// One entry per admin function. `roles` controls who sees the card.
const CARDS: SettingsCard[] = [
    { href: '/admin/organizations', title: 'Organizations', description: 'Create and manage organizations (tenants).', icon: '🏢', roles: ['SYSTEM_ADMIN'] },
    { href: '/admin/organization', title: 'Organization Profile', description: "Your organization's name, address, logo, and branding.", icon: '🏛️', roles: ['ORG_ADMIN'] },
    { href: '/dashboard/users', title: 'Users', description: 'Add and manage admin, scheduler, and viewer accounts.', icon: '👥', roles: ['SYSTEM_ADMIN', 'ORG_ADMIN'] },
    { href: '/admin/buildings', title: 'Buildings', description: 'Add and edit the buildings in your organization.', icon: '🏬', roles: ['SYSTEM_ADMIN', 'ORG_ADMIN'] },
    { href: '/admin/rooms', title: 'Rooms & Devices', description: 'Manage rooms and pair display devices.', icon: '🚪', roles: ['SYSTEM_ADMIN', 'ORG_ADMIN'] },
    { href: '/admin/events', title: 'Events & Schedule', description: 'Create, edit, and schedule events.', icon: '📅', roles: ['SYSTEM_ADMIN', 'ORG_ADMIN'] },
    { href: '/admin/facilitators', title: 'Facilitators', description: 'Edit bios, photos, and contact info.', icon: '👤', roles: ['SYSTEM_ADMIN', 'ORG_ADMIN'] },
    { href: '/admin/themes', title: 'Display Themes', description: 'Preview and assign display themes per room or org default.', icon: '🎨', roles: ['SYSTEM_ADMIN', 'ORG_ADMIN'] },
];

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const user = session?.user as any;
    const role = user?.role as string | undefined;
    const isAdmin = role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN';

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    // Settings is admin-only; send other roles back to the dashboard.
    useEffect(() => {
        if (status === 'authenticated' && role && !isAdmin) {
            router.push('/dashboard');
        }
    }, [status, role, isAdmin, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }
    if (!session || !isAdmin) return null;

    const cards = CARDS.filter((c) => role && c.roles.includes(role));

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center gap-4">
                    <a href="/dashboard" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                        ← Back
                    </a>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                        <p className="text-sm text-slate-500">Manage your organization, displays, and schedule.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {cards.map((c) => (
                        <Link
                            key={c.href}
                            href={c.href}
                            className="group bg-white rounded-xl shadow p-5 hover:shadow-md hover:border-blue-300 border border-transparent transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-3xl leading-none" aria-hidden>{c.icon}</span>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.title}</h2>
                                    <p className="text-sm text-slate-500 mt-1">{c.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <Footer />
        </div>
    );
}
