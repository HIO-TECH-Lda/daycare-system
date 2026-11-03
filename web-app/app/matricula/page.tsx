import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { EnrollmentForm } from '@/components/public/enrollment-form';

export const metadata: Metadata = {
  title: 'Pedido de matrícula',
  description: 'Peça a matrícula do seu filho no Centro Infantil Sonho de Criança.'
};

/** Public enrolment request: wider than the sign-in pages, the form has several sections. */
export default function Page() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-2xl content-start gap-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Logo priority className="w-20" />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Pedido de matrícula</h1>
          <p className="text-sm text-muted-foreground">Centro Infantil Sonho de Criança</p>
        </div>
      </div>
      <EnrollmentForm />
    </main>
  );
}
