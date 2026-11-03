import type { Metadata } from 'next';
import { AdminMonthlyReports } from '@/components/admin/monthly-reports';

export const metadata: Metadata = { title: 'Relatórios mensais' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <AdminMonthlyReports />;
}
