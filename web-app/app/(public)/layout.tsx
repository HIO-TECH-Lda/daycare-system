import { Logo } from '@/components/brand/logo';

/** Login, invite, password recovery: a single card under the logo. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo priority className="w-36 sm:w-44" />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      <p className="text-center text-xs text-muted-foreground">Centro Infantil Sonho de Criança</p>
    </main>
  );
}
