import type { Metadata } from 'next';
import { Notifications } from '@/components/admin/notifications';

export const metadata: Metadata = { title: 'Notificações' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <Notifications />;
}
