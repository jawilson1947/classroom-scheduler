import AdminLayout from '@/components/layout/AdminLayout';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminLayout>{children}</AdminLayout>;
}
