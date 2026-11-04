import type { Metadata } from 'next';
import { Profile } from '@/components/app/profile';

export const metadata: Metadata = { title: 'Perfil' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <Profile />;
}
