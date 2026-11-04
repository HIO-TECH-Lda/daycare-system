import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ListSkeleton } from '@/components/app/page-states';
import { Messages } from '@/components/app/messages';

export const metadata: Metadata = { title: 'Mensagens' };

// Reads ?com= on the client: it streams in under Suspense (Cache Components)
// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={5} />}>
      <Messages />
    </Suspense>
  );
}
