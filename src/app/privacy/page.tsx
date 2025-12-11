import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto space-y-8 bg-white p-10 rounded-xl shadow-sm">
                <header className="border-b border-slate-200 pb-6 mb-6">
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold mb-4 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
                    <p className="text-slate-500 mt-2">Last Updated: {new Date().toLocaleDateString()}</p>
                </header>

                <div className="prose prose-slate max-w-none">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">1. Introduction</h2>
                        <p>
                            Digital Support Systems of Alabama, LLC ("we," "our," or "us") respects your privacy and is committed to protecting it through our compliance with this policy.
                            This policy describes the types of information we may collect from you or that you may provide when you visit the Classroom Scheduler application
                            and our practices for collecting, using, maintaining, protecting, and disclosing that information.
                        </p>
                    </section>

                    <section className="space-y-4 pt-4">
                        <h2 className="text-xl font-bold text-slate-800">2. Information We Collect</h2>
                        <p>We collect information you provide directly to us when you use our services, including:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Account information such as your name, email address, and role within your organization.</li>
                            <li>Organization details including tenant names, building information, and room configurations.</li>
                            <li>Event scheduling data, including titles, descriptions, and facilitator names.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 pt-4">
                        <h2 className="text-xl font-bold text-slate-800">3. How We Use Your Information</h2>
                        <p>We use information that we collect about you or that you provide to us, including any personal information:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To present our Application and its contents to you.</li>
                            <li>To provide you with information, products, or services that you request from us.</li>
                            <li>To fulfill any other purpose for which you provide it.</li>
                            <li>To notify you about changes to our Application or any products or services we offer or provide though it.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 pt-4">
                        <h2 className="text-xl font-bold text-slate-800">4. Data Security</h2>
                        <p>
                            We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure.
                            The safety and security of your information also depends on you. Where we have given you (or where you have chosen) a password for access to certain parts of our Application,
                            you are responsible for keeping this password confidential.
                        </p>
                    </section>

                    <section className="space-y-4 pt-4">
                        <h2 className="text-xl font-bold text-slate-800">5. Contact Information</h2>
                        <p>
                            To ask questions or comment about this privacy policy and our privacy practices, contact us at:
                        </p>
                        <address className="not-italic text-slate-600">
                            Digital Support Systems of Alabama, LLC<br />
                            Support Team<br />
                            Email: info@digitalsupportsystems.com
                        </address>
                    </section>
                </div>

                <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} Digital Support Systems of Alabama, LLC. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
}
