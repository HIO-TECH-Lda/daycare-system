import type { Metadata } from 'next';
import { Classes } from '@/components/admin/classes';

export const metadata: Metadata = { title: 'Turmas' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <Classes />;
}
