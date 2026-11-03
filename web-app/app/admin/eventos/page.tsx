import type { Metadata } from 'next';
import { AdminEvents } from '@/components/admin/events';

export const metadata: Metadata = { title: 'Eventos' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <AdminEvents />;
}
