'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PairPage() {
    const params = useParams();
    const token = params?.token as string;
    const router = useRouter();
    const [status, setStatus] = useState<'pairing' | 'success' | 'error'>('pairing');
    const [error, setError] = useState('');

    useEffect(() => {
        const pair = async () => {
            try {
                const response = await fetch('/api/device/validate-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                if (response.ok) {
                    // Store pairing info in localStorage
                    localStorage.setItem('room_id', data.room_id.toString());
                    localStorage.setItem('tenant_id', data.tenant_id.toString());
                    localStorage.setItem('device_paired', 'true');

                    setStatus('success');

                    // Redirect to display page after 1 second
                    setTimeout(() => {
                        router.push(`/display/${data.room_id}`);
                    }, 1000);
                } else {
                    setStatus('error');
                    setError(data.error || 'Invalid or expired pairing token');
                }
            } catch (err) {
                setStatus('error');
                setError('Failed to connect to server');
            }
        };

        if (token) {
            pair();
        }
    }, [token, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
            <div className="bg-slate-800 rounded-2xl p-12 max-w-md w-full shadow-2xl border border-slate-700 text-center">
                {status === 'pairing' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
                        <h1 className="text-3xl font-bold text-white mb-2">Pairing Device...</h1>
                        <p className="text-slate-400">Please wait while we configure your display</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="text-green-500 text-6xl mb-6">✓</div>
                        <h1 className="text-3xl font-bold text-white mb-2">Pairing Successful!</h1>
                        <p className="text-slate-400">Redirecting to display...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="text-red-500 text-6xl mb-6">✗</div>
                        <h1 className="text-3xl font-bold text-white mb-2">Pairing Failed</h1>
                        <p className="text-red-400 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/display/setup')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            Try Manual Setup
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
