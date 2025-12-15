'use client';

import Link from 'next/link';

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center space-y-6">
                <div className="text-5xl">🎧</div>
                <h1 className="text-3xl font-bold text-slate-900">Customer Support</h1>
                <p className="text-slate-600">
                    We are here to help! If you are experiencing issues with the Classroom Scheduler system, please contact our support team.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3 text-left">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">📧</span>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Support</p>
                            <a href="mailto:info@digitalsupportsystems.com" className="text-blue-600 font-medium hover:underline">
                                info@digitalsupportsystems.com
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <span className="text-xl">📞</span>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phone Support</p>
                            <a href="tel:+12566177295" className="text-blue-600 font-medium hover:underline">
                                (256) 617-7295
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <span className="text-xl">🕒</span>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Support Hours</p>
                            <p className="text-slate-700">Monday - Friday</p>
                            <p className="text-slate-700">9:00 AM - 5:00 PM CST</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <Link href="/dashboard" className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-all">
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <footer className="mt-8 text-center text-sm text-slate-500">
                <p>&copy; {new Date().getFullYear()} Digital Support Systems of Alabama, LLC</p>
            </footer>
        </div>
    );
}
