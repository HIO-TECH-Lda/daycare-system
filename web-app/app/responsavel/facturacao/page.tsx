import type { Metadata } from 'next';
import { ParentBilling } from '@/components/parent/parent-billing';

export const metadata: Metadata = { title: 'Facturação' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <ParentBilling />;
}
