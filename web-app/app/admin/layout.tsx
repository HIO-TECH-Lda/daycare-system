import { Suspense } from 'react';
import { RoleGuard } from '@/components/app/role-guard';
import { AppShell } from '@/components/app/app-shell';
import { LoadingScreen } from '@/components/app/loading-screen';

// Signed-in pages depend on the session, which lives in the browser (the API is separate), so
// they can't be prerendered for instant navigation: opt out of that check (see the Next.js
// guide "Authentication with Cache Components").
export const instant = false;

// The guard and shell read the URL, which is only known in the browser: they stream in
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RoleGuard role="administrador">
        <AppShell role="administrador">{children}</AppShell>
      </RoleGuard>
    </Suspense>
  );
}
