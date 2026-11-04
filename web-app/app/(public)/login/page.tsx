'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth/auth-context';
import { ApiRequestError } from '@/lib/api/client';
import { identifierRule } from '@/lib/validation';
import { useResetWhenHidden } from '@/lib/use-reset-when-hidden';
import { ROLE_HOME } from '@/lib/roles';
import type { Role } from '@/lib/api/auth';
import { Skeleton } from '@/components/ui/skeleton';

const schema = z.object({
  identifier: identifierRule,
  password: z.string().min(1, 'Indique a sua palavra-passe')
});
type Values = z.infer<typeof schema>;

/** Where to go after logging in: the page asked for (only inside the user's own area), else their home. */
function destination(role: Role, next: string | null): string {
  const home = ROLE_HOME[role];
  return next && (next === home || next.startsWith(`${home}/`)) ? next : home;
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { user, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: '', password: '' } });
  const { errors, isSubmitting } = form.formState;
  useResetWhenHidden(() => {
    form.reset();
    setError(null);
  });

  // Already logged in: go to your area
  useEffect(() => {
    if (user) router.replace(destination(user.role, next));
  }, [user, router, next]);

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const loggedIn = await login(values.identifier, values.password);
      form.reset();
      router.replace(destination(loggedIn.role, next));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Não foi possível entrar. Tente novamente.');
    }
  }

  // POST: a submit before the page is interactive must never put the password in the URL
  return (
    <form method="post" onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="text-sm text-muted-foreground">Use o seu email ou número de telefone.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.identifier}>
          <FieldLabel htmlFor="identifier">Email ou telefone</FieldLabel>
          <Input
            id="identifier"
            autoComplete="username"
            inputMode="email"
            placeholder="ana@exemplo.com ou 84 123 4567"
            className="h-11"
            aria-invalid={!!errors.identifier}
            {...form.register('identifier')}
          />
          <FieldError errors={[errors.identifier]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Palavra-passe</FieldLabel>
            <Link href="/recuperar-senha" className="text-sm text-teal-text underline-offset-4 hover:underline">
              Esqueceu-se da palavra-passe?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-11"
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>

      <Button type="submit" size="touch" disabled={isSubmitting}>
        <LogIn data-icon="inline-start" />
        {isSubmitting ? 'A entrar…' : 'Entrar'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Ainda não tem conta? As contas são criadas pela administração do centro, que lhe envia um convite.{' '}
        <Link href="/matricula" className="font-medium text-teal-text underline underline-offset-4">
          Pedir matrícula
        </Link>
      </p>
      <p className="text-center text-xs">
        <Link href="/privacidade" className="text-muted-foreground underline underline-offset-4">
          Privacidade
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  // `next` comes from the URL, which is only known in the browser
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <LoginForm />
    </Suspense>
  );
}
