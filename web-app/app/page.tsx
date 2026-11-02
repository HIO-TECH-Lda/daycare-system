'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_HOME } from '@/lib/roles';
import { LoadingScreen } from '@/components/app/loading-screen';

/** Entry point: each role goes to its own area; everyone else to the login page. */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? ROLE_HOME[user.role] : '/login');
  }, [user, loading, router]);

  return (
    <LoadingScreen />
  );
}
