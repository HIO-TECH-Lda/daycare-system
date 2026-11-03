import type { Metadata } from 'next';
import { Children } from '@/components/admin/children';

export const metadata: Metadata = { title: 'Crianças' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <Children />;
}
