import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ListSkeleton } from '@/components/app/page-states';
import { Enrollments } from '@/components/admin/enrollments';

export const metadata: Metadata = { title: 'Matrículas' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

// Reads ?pedido= on the client: it streams in under Suspense (Cache Components)
export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={5} />}>
      <Enrollments />
    </Suspense>
  );
}
