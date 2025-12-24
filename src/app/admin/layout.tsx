import AdminLayout from '@/components/layout/AdminLayout';

export default function AdminSectionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminLayout>{children}</AdminLayout>;
}
