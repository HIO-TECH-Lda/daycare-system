import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ListSkeleton } from '@/components/app/page-states';
import { StaffMonthlyReports } from '@/components/staff/monthly-reports';

export const metadata: Metadata = { title: 'Relatórios mensais' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

// Reads ?crianca= on the client: it streams in under Suspense (Cache Components)
export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={5} />}>
      <StaffMonthlyReports />
    </Suspense>
  );
}
