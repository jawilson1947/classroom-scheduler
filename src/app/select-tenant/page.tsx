
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TenantOption {
    tenant_id: number;
    tenant_name: string;
}

export default function SelectTenantPage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [tenants, setTenants] = useState<TenantOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);

    useEffect(() => {
        if (session?.user?.email) {
            // Fetch tenants for this user
            fetch('/api/check-tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.user.email })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.tenants) {
                        setTenants(data.tenants);
                    }
                })
                .finally(() => setLoading(false));
        } else if (session === null) {
            // Not logged in
            router.push('/login');
        }
    }, [session, router]);

    const handleSelectTenant = async (tenantId: number) => {
        setSelecting(true);
        // Update the session via the 'jwt' callback 'update' trigger
        await update({ tenant_id: tenantId });
        router.push('/dashboard');
        router.refresh(); // Refresh to ensure new session data propagates
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                Loading organizations...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Select Organization</h1>
                    <p className="text-slate-600">
                        Your account ({session?.user?.email}) belongs to multiple organizations. Please choose one to continue.
                    </p>
                </div>

                <div className="space-y-4">
                    {tenants.map(tenant => (
                        <button
                            key={tenant.tenant_id}
                            onClick={() => handleSelectTenant(tenant.tenant_id)}
                            disabled={selecting}
                            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group group-disabled:opacity-50"
                        >
                            <div className="font-semibold text-slate-900 group-hover:text-blue-700">
                                {tenant.tenant_name}
                            </div>
                            <div className="text-sm text-slate-500">
                                Organization ID: {tenant.tenant_id}
                            </div>
                        </button>
                    ))}
                </div>

                {tenants.length === 0 && (
                    <div className="text-center text-red-500">
                        No organizations found. Please contact support.
                    </div>
                )}
            </div>
        </div>
    );
}
