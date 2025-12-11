import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto space-y-8 bg-white p-10 rounded-xl shadow-sm">
                <header className="border-b border-slate-200 pb-6 mb-6">
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold mb-4 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">About Us</h1>
                </header>

                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-800">Digital Support Systems of Alabama, LLC</h2>
                        <p className="text-lg">
                            We are a premier technology solutions provider dedicated to simplifying complex scheduling and resource management challenges for educational institutions and organizations.
                        </p>
                    </section>

                    <section className="space-y-4 pt-6">
                        <h2 className="text-xl font-bold text-slate-800">Our Mission</h2>
                        <p>
                            To provide intuitive, reliable, and powerful digital tools that empower administrators to manage their spaces efficiently, ensuring that the focus remains on education and collaboration rather than logistics.
                        </p>
                    </section>

                    <section className="space-y-4 pt-6">
                        <h2 className="text-xl font-bold text-slate-800">The Classroom Scheduler</h2>
                        <p>
                            This application is designed to seamlessly integrate with iPad displays outside meeting rooms and classrooms. It provides real-time visibility into schedule availability, "One-Tap" booking, and remote device management.
                        </p>
                    </section>

                    <section className="space-y-4 pt-8 mt-8 border-t border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">Contact Us</h2>
                        <p>
                            For support, inquiries, or more information about our services:
                        </p>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 inline-block pr-12">
                            <p className="font-semibold text-slate-900">Digital Support Systems of Alabama, LLC</p>
                            <p className="mt-1">Email: <a href="mailto:info@digitalsupportsystems.com" className="text-blue-600 hover:underline">info@digitalsupportsystems.com</a></p>
                        </div>
                    </section>
                </div>

                <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} Digital Support Systems of Alabama, LLC. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
}
