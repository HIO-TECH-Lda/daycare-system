'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { NewPasswordFields } from '@/components/auth/new-password-fields';
import { authApi } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/client';
import { newPasswordForm } from '@/lib/validation';
import { useResetWhenHidden } from '@/lib/use-reset-when-hidden';
import type { z } from 'zod';

type Values = z.infer<typeof newPasswordForm>;

function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(newPasswordForm), defaultValues: { password: '', confirmPassword: '' } });
  const { errors, isSubmitting } = form.formState;
  useResetWhenHidden(() => {
    form.reset();
    setError(null);
  });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      await authApi.resetPassword(token!, values.password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Não foi possível redefinir a palavra-passe. Tente novamente.');
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">Link incompleto</h1>
        <p className="text-sm text-muted-foreground">Abra o link completo que recebeu, ou peça um novo.</p>
        <Button asChild size="touch">
          <Link href="/recuperar-senha">Pedir novo link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CircleCheck className="size-10 text-green-text" aria-hidden />
        <h1 className="text-2xl font-bold">Palavra-passe alterada</h1>
        <p className="text-sm text-muted-foreground">Por segurança, terminámos as sessões abertas noutros aparelhos.</p>
        <Button asChild size="touch" className="w-full">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Nova palavra-passe</h1>
        <p className="text-sm text-muted-foreground">Escolha a nova palavra-passe para a sua conta.</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}{' '}
            <Link href="/recuperar-senha" className="underline">Pedir novo link</Link>
          </AlertDescription>
        </Alert>
      )}
      <NewPasswordFields register={form.register} errors={errors} />
      <Button type="submit" size="touch" disabled={isSubmitting}>
        {isSubmitting ? 'A guardar…' : 'Guardar palavra-passe'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  // The token comes from the URL, which is only known in the browser
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
