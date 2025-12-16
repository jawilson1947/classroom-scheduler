'use client';

import { useState } from 'react';

type ModalType = 'privacy' | 'about' | 'support' | null;

export default function Footer() {
    const [openModal, setOpenModal] = useState<ModalType>(null);

    const closeModal = () => setOpenModal(null);

    return (
        <>
            <footer className="mt-12 border-t border-slate-200 pt-6 pb-4">
                <div className="text-center text-sm text-slate-600">
                    <p className="mb-2">© {new Date().getFullYear()} Digital Support Systems of Alabama, LLC. All rights reserved.</p>
                    <div className="flex justify-center gap-4 mb-2">
                        <button
                            onClick={() => setOpenModal('privacy')}
                            className="text-slate-600 hover:text-slate-800 font-medium bg-transparent border-none cursor-pointer"
                        >
                            Privacy Policy
                        </button>
                        <span className="text-slate-400">•</span>
                        <button
                            onClick={() => setOpenModal('about')}
                            className="text-slate-600 hover:text-slate-800 font-medium bg-transparent border-none cursor-pointer"
                        >
                            About Us
                        </button>
                        <span className="text-slate-400">•</span>
                        <button
                            onClick={() => setOpenModal('support')}
                            className="text-slate-600 hover:text-slate-800 font-medium bg-transparent border-none cursor-pointer"
                        >
                            Support
                        </button>
                    </div>
                </div>
            </footer>

            {/* Modal Overlay */}
            {openModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 animate-fade-in" onClick={closeModal}>
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900">
                                {openModal === 'privacy' && 'Privacy Policy'}
                                {openModal === 'about' && 'About Us'}
                                {openModal === 'support' && 'Support'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {openModal === 'privacy' && (
                                <div className="space-y-4 text-slate-600">
                                    <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use the iPad Classroom Scheduler application.</p>

                                    <h3 className="text-lg font-semibold text-slate-900 mt-4">Information We Collect</h3>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Account Information:</strong> When you log in, we utilize Google Authentication to verify your identity. We store your email address and name.</li>
                                        <li><strong>Usage Data:</strong> We monitor application usage to improve performance and security.</li>
                                        <li><strong>Device Data:</strong> We register unique identifiers for iPads connected to the system for management purposes.</li>
                                    </ul>

                                    <h3 className="text-lg font-semibold text-slate-900 mt-4">How We Use Your Information</h3>
                                    <p>We use your information strictly for providing and improving the scheduling service. We do not sell or share your personal data with third parties for marketing purposes.</p>

                                    <h3 className="text-lg font-semibold text-slate-900 mt-4">Contact Us</h3>
                                    <p>If you have questions about this policy, please contact us at <a href="mailto:support@digitalsupportsystems.com" className="text-blue-600 hover:underline">support@digitalsupportsystems.com</a>.</p>
                                </div>
                            )}

                            {openModal === 'about' && (
                                <div className="space-y-4 text-slate-600">
                                    <p className="text-lg leading-relaxed">
                                        <strong>Digital Support Systems of Alabama, LLC</strong> is dedicated to providing intuitive and reliable technology solutions for educational and corporate environments.
                                    </p>
                                    <p>
                                        The <strong>iPad Classroom Scheduler</strong> was designed to simplify room management, ensuring that students and faculty always know when a room is available or occupied. By integrating directly with commodity iPad hardware, we offer a cost-effective and modern alternative to proprietary room scheduling panels.
                                    </p>
                                    <div className="bg-slate-50 p-4 rounded-lg mt-4 border border-slate-100">
                                        <h4 className="font-semibold text-slate-900 mb-2">Our Mission</h4>
                                        <p className="italic">"To empower organizations with seamless digital tools that enhance productivity and communication."</p>
                                    </div>
                                </div>
                            )}

                            {openModal === 'support' && (
                                <div className="space-y-4 text-slate-600">
                                    <p>Need help? We're here for you.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div className="border p-4 rounded-lg hover:border-blue-300 transition-colors">
                                            <h3 className="font-bold text-slate-900 mb-2">📧 Email Support</h3>
                                            <p className="text-sm mb-2">For general inquiries and troubleshooting.</p>
                                            <a href="mailto:support@digitalsupportsystems.com" className="text-blue-600 font-semibold hover:underline">support@digitalsupportsystems.com</a>
                                        </div>

                                        <div className="border p-4 rounded-lg hover:border-blue-300 transition-colors">
                                            <h3 className="font-bold text-slate-900 mb-2">📞 Phone Support</h3>
                                            <p className="text-sm mb-2">Available Mon-Fri, 8am - 5pm CST.</p>
                                            <a href="tel:2566177295" className="text-blue-600 font-semibold hover:underline">(256) 617-7295</a>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-lg mt-6">
                                        <h3 className="font-bold text-slate-900 mb-2">Common Issues</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                            <li><strong>iPad not syncing?</strong> Ensure it is connected to Wi-Fi and the "Last Seen" status is recent in the dashboard.</li>
                                            <li><strong>Cannot log in?</strong> Verify your Google account permissions with your administrator.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
