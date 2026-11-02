'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { NewPasswordFields } from '@/components/auth/new-password-fields';
import { authApi } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { newPasswordForm } from '@/lib/validation';
import { useResetWhenHidden } from '@/lib/use-reset-when-hidden';
import { ROLE_HOME, ROLE_LABELS } from '@/lib/roles';
import { formatPhone } from '@/lib/format';

const schema = newPasswordForm.and(z.object({ whatsappOptIn: z.boolean() }));
type Values = z.infer<typeof schema>;

/** Accept an invite: choose a password (and WhatsApp consent), then straight into the app. */
function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const invite = useQuery({ queryKey: ['invite', token], queryFn: () => authApi.getInvite(token), staleTime: Infinity, refetchOnWindowFocus: false });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { password: '', confirmPassword: '', whatsappOptIn: invite.data?.whatsappOptIn ?? false },
    resetOptions: { keepDirtyValues: true }
  });
  const { errors, isSubmitting } = form.formState;
  useResetWhenHidden(() => {
    form.reset();
    setError(null);
  });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const user = await authApi.acceptInvite({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
        ...(invite.data?.phone ? { whatsappOptIn: values.whatsappOptIn } : {})
      });
      setUser(user);
      router.replace(ROLE_HOME[user.role]);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Não foi possível activar a conta. Tente novamente.');
    }
  }

  if (invite.isPending) return <Skeleton className="h-72 w-full" />;

  if (invite.isError) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">Convite indisponível</h1>
        <p className="text-sm text-muted-foreground">
          {invite.error instanceof ApiRequestError && invite.error.status === 400
            ? 'Este convite expirou ou já foi usado. Peça um novo à administração do centro, ou use “Esqueceu-se da senha?” se já activou a conta.'
            : 'Não foi possível abrir o convite. Verifique a ligação e tente novamente.'}
        </p>
        <Button asChild variant="outline" size="touch">
          <Link href="/login">Ir para a entrada</Link>
        </Button>
      </div>
    );
  }

  const { firstName, role, phone } = invite.data;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Olá, {firstName}!</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo(a) ao portal, com o perfil <strong>{ROLE_LABELS[role]}</strong>. Escolha a sua senha para activar a conta.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <NewPasswordFields register={form.register} errors={errors} />

      {phone && (
        <Field orientation="horizontal">
          <Controller
            control={form.control}
            name="whatsappOptIn"
            render={({ field }) => (
              <Checkbox id="whatsappOptIn" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
            )}
          />
          <FieldContent>
            <FieldLabel htmlFor="whatsappOptIn">Receber avisos por WhatsApp</FieldLabel>
            <FieldDescription>Entradas e saídas, relatórios, facturas e mensagens, no número {formatPhone(phone)}. Pode mudar isto no seu perfil.</FieldDescription>
          </FieldContent>
        </Field>
      )}

      <Button type="submit" size="touch" disabled={isSubmitting}>
        {isSubmitting ? 'A activar…' : 'Activar conta'}
      </Button>
    </form>
  );
}

export default function AcceptInvitePage() {
  // The invite token comes from the URL, which is only known in the browser
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <AcceptInvite />
    </Suspense>
  );
}
