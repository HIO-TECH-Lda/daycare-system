'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authApi } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/client';
import { identifierRule } from '@/lib/validation';
import { useResetWhenHidden } from '@/lib/use-reset-when-hidden';

const schema = z.object({ identifier: identifierRule });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: '' } });
  const { errors, isSubmitting } = form.formState;
  useResetWhenHidden(() => {
    form.reset();
    setSent(null);
    setError(null);
  });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      setSent(await authApi.forgotPassword(values.identifier));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Não foi possível enviar o pedido. Tente novamente.');
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <MailCheck className="size-10 text-green-text" aria-hidden />
        <h1 className="text-2xl font-bold">Verifique as suas mensagens</h1>
        <p className="text-sm text-muted-foreground">{sent}</p>
        <p className="text-sm text-muted-foreground">
          Se ainda não activou a conta, receberá de novo o seu convite. Se não receber nada, contacte a administração do centro.
        </p>
        <Button asChild variant="outline" size="touch" className="w-full">
          <Link href="/login">Voltar a entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">Enviamos um link por email ou WhatsApp para escolher uma nova senha.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!errors.identifier}>
        <FieldLabel htmlFor="identifier">Email ou telefone</FieldLabel>
        <Input id="identifier" autoComplete="username" className="h-11" aria-invalid={!!errors.identifier} {...form.register('identifier')} />
        <FieldDescription>O mesmo que usa para entrar.</FieldDescription>
        <FieldError errors={[errors.identifier]} />
      </Field>

      <Button type="submit" size="touch" disabled={isSubmitting}>
        {isSubmitting ? 'A enviar…' : 'Enviar link'}
      </Button>
      <Link href="/login" className="text-center text-sm text-teal-text underline-offset-4 hover:underline">
        Voltar a entrar
      </Link>
    </form>
  );
}
