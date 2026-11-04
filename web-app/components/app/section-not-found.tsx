'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { ROLE_HOME } from '@/lib/roles';
import type { Role } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';

/** An address inside a role's area that isn't a screen: say so, inside the app, with a way back. */
export function SectionNotFound({ role }: { role: Role }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-sun-tint text-sun-text">
        <SearchX className="size-7" aria-hidden />
      </div>
      <h2 className="text-2xl font-bold">Página não encontrada</h2>
      <p className="text-muted-foreground">Este endereço não existe no portal. Use o menu, ou volte ao início.</p>
      <Button asChild size="touch">
        <Link href={ROLE_HOME[role]}>Voltar ao início</Link>
      </Button>
    </div>
  );
}
