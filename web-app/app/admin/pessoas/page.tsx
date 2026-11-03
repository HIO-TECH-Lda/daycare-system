import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ListSkeleton } from '@/components/app/page-states';
import { People } from '@/components/admin/people';

export const metadata: Metadata = { title: 'Pessoas' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

// Reads ?estado= on the client: it streams in under Suspense (Cache Components)
export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={5} />}>
      <People />
    </Suspense>
  );
}
