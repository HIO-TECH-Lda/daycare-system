import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ListSkeleton } from '@/components/app/page-states';
import { DailyReports } from '@/components/staff/daily-report';

export const metadata: Metadata = { title: 'Relatório diário' };

// Reads ?crianca= on the client: it streams in under Suspense (Cache Components)
export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <DailyReports />
    </Suspense>
  );
}
