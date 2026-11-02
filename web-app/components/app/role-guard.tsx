'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_HOME } from '@/lib/roles';
import type { Role } from '@/lib/api/auth';
import { LoadingScreen } from '@/components/app/loading-screen';

/**
 * Only lets the given role into this part of the app. Not logged in → login page;
 * logged in with another role → that role's home. (The API enforces access anyway;
 * this keeps people on screens that work for them.)
 */
export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (user.role !== role) router.replace(ROLE_HOME[user.role]);
  }, [user, loading, role, router, pathname]);

  if (loading || !user || user.role !== role) {
    return (
      <LoadingScreen />
    );
  }
  return <>{children}</>;
}
