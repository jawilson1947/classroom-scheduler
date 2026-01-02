'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';

interface TenantOption {
    tenant_id: number;
    tenant_name: string;
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [tenants, setTenants] = useState<TenantOption[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<number | string>('');
    const [checkingTenants, setCheckingTenants] = useState(false);

    const checkTenants = async (emailValue: string) => {
        if (!emailValue || !emailValue.includes('@')) {
            setTenants([]);
            return;
        }

        setCheckingTenants(true);
        try {
            const res = await fetch('/api/check-tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailValue })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.tenants && Array.isArray(data.tenants)) {
                    setTenants(data.tenants);
                    // If only one tenant, auto-select it? Or leave it (backend handles it if tenant_id missing)
                    // But if we want to be explicit:
                    if (data.tenants.length === 1) {
                        setSelectedTenantId(data.tenants[0].tenant_id);
                    } else if (data.tenants.length > 1) {
                        // Default to first or prompt? Prompt is better.
                        setSelectedTenantId(data.tenants[0].tenant_id);
                    } else {
                        setSelectedTenantId('');
                    }
                }
            }
        } catch (err) {
            console.error('Failed to check tenants', err);
        } finally {
            setCheckingTenants(false);
        }
    };

    const handleEmailBlur = () => {
        checkTenants(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                tenant_id: selectedTenantId,
                redirect: false
            });

            if (result?.error) {
                setError('Invalid email or password');
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Classroom Scheduler</h1>
                    <p className="text-slate-600">Sign in to your account</p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={handleEmailBlur}
                            required
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="you@example.com"
                            disabled={loading}
                        />
                    </div>

                    {/* Tenant Selection logic */}
                    {tenants.length > 1 && (
                        <div>
                            <label htmlFor="tenant" className="block text-sm font-medium text-slate-700 mb-1">
                                Select Organization
                            </label>
                            <div className="relative">
                                <select
                                    id="tenant"
                                    value={selectedTenantId}
                                    onChange={(e) => setSelectedTenantId(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                                    disabled={loading}
                                >
                                    {tenants.map((t) => (
                                        <option key={t.tenant_id} value={t.tenant_id}>
                                            {t.tenant_name} (ID: {t.tenant_id})
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                This email is associated with multiple organizations. Please select one.
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                            disabled={loading}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 hover:underline">
                            Forgot your password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (tenants.length > 1 && !selectedTenantId)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Sign in with Google
                    </button>
                </div>

                <div className="mt-8 w-full">
                    <Footer />
                </div>
            </div>
        </div>
    );
}
