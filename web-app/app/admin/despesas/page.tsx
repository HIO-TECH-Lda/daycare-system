import type { Metadata } from 'next';
import { Expenses } from '@/components/admin/expenses';

export const metadata: Metadata = { title: 'Despesas' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <Expenses />;
}
