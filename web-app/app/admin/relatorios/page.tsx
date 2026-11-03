import type { Metadata } from 'next';
import { Reports } from '@/components/admin/reports';

export const metadata: Metadata = { title: 'Relatórios' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <Reports />;
}
