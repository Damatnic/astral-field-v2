'use client';

import { withAuth } from '@/components/AuthProvider';

function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}

export default withAuth(DashboardLayout);