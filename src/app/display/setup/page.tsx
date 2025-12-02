'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
    const [pairingCode, setPairingCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handlePair = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/device/pair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: 1, // Default tenant
                    pairing_code: pairingCode.toUpperCase(),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store device info in localStorage
                localStorage.setItem('device_id', data.device_id);
                localStorage.setItem('room_id', data.room_id);

                // Redirect to display page
                router.push(`/display/${data.room_id}`);
            } else {
                setError(data.error || 'Invalid pairing code');
            }
        } catch (err) {
            setError('Failed to connect. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
            <div className="bg-slate-800 rounded-2xl p-12 max-w-md w-full shadow-2xl border border-slate-700">
                <h1 className="text-4xl font-bold text-white mb-2">Device Setup</h1>
                <p className="text-slate-400 mb-8">Enter the pairing code from your admin panel</p>

                <form onSubmit={handlePair}>
                    <input
                        type="text"
                        value={pairingCode}
                        onChange={(e) => setPairingCode(e.target.value)}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className="w-full px-6 py-4 bg-slate-700 text-white text-2xl font-mono rounded-lg border-2 border-slate-600 focus:border-blue-500 focus:outline-none mb-4 text-center uppercase"
                        required
                    />

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || pairingCode.length !== 6}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-4 rounded-lg transition-colors text-lg"
                    >
                        {loading ? 'Pairing...' : 'Pair Device'}
                    </button>
                </form>
            </div>
        </div>
    );
}
