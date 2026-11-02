'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Construction } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { greeting } from '@/lib/format';
import { NAV } from '@/lib/roles';
import type { Role } from '@/lib/api/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


/**
 * Home of each role while the screens are being built (Phase 3): a greeting and the
 * sections that are coming, so the structure can be reviewed with the centre.
 */
export function RoleHome({ role }: { role: Role }) {
  const { user } = useAuth();
  const [home, ...sections] = NAV[role];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold sm:text-3xl">
          {greeting()}, {user?.name.split(' ')[0]}!
        </h2>
        <p className="text-muted-foreground">{home.description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((item) => (
          <Link key={item.href} href={item.href} className="group rounded-xl focus-visible:outline-2">
            <Card className="h-full transition-colors group-hover:border-brand-green">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-green-tint text-green-text">
                    <item.icon className="size-5" aria-hidden />
                  </div>
                  <Badge variant="outline">Em breve</Badge>
                </div>
                <CardTitle className="font-heading text-lg">{item.label}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for a section that's built in Phase 3. */
export function ComingSoon({ role }: { role: Role }) {
  const pathname = usePathname();
  const item = NAV[role].find((i) => i.href === pathname) ?? NAV[role].find((i) => pathname.startsWith(`${i.href}/`));
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-sun-tint text-sun-text">
        <Construction className="size-7" aria-hidden />
      </div>
      <h2 className="text-2xl font-bold">{item?.label ?? 'Página'} — em construção</h2>
      <p className="text-muted-foreground">{item?.description ?? 'Esta página ainda não existe.'}</p>
    </div>
  );
}
