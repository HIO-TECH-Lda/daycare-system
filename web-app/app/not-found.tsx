import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

/** Any address that isn't a page (outside the role areas, which have their own). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Logo priority className="w-36 sm:w-44" />
      <div className="grid w-full max-w-sm gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">Este endereço não existe no portal.</p>
        <Button asChild size="touch">
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Centro Infantil Sonho de Criança</p>
    </main>
  );
}
