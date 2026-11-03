import type { Metadata } from 'next';
import { AdminBilling } from '@/components/admin/billing';

export const metadata: Metadata = { title: 'Facturação' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <AdminBilling />;
}
