'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Smart Resume: Check if this device is already paired
    const roomId = localStorage.getItem('room_id');
    const tenantId = localStorage.getItem('tenant_id');

    if (roomId && tenantId) {
      console.log('Device already paired, redirecting to display...');
      router.push(`/display/${roomId}`);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">Classroom Scheduler</h1>
        <p className="text-2xl text-slate-400 mb-12">iPad Display Management System</p>

        <div className="flex gap-6 justify-center">
          <Link
            href="/admin"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/display/setup"
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            Device Setup
          </Link>
        </div>

        <div className="mt-12 text-slate-500">
          <p>Navigate to Admin Dashboard to manage events and devices</p>
          <p>Or set up a new iPad display device</p>
        </div>
      </div>
    </div>
  );
}
