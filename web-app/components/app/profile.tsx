'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { authApi } from '@/lib/api/auth';
import { formatPhone } from '@/lib/format';
import { newPasswordForm } from '@/lib/validation';
import { ROLE_LABELS } from '@/lib/roles';
import { NewPasswordFields } from '@/components/auth/new-password-fields';
import { PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const passwordForm = newPasswordForm.and(z.object({ currentPassword: z.string().min(1, 'Indique a palavra-passe actual') }));
type PasswordValues = z.infer<typeof passwordForm>;

/** Own contacts, WhatsApp consent and password (email and role are set by the administration). */
export function Profile() {
  const { user, setUser } = useAuth();
  const [first, ...rest] = (user?.name ?? '').split(' ');
  const [firstName, setFirstName] = useState(first ?? '');
  const [lastName, setLastName] = useState(rest.join(' '));
  const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone) : '');
  const [whatsapp, setWhatsapp] = useState(!!user?.whatsappOptIn);
  const [saving, setSaving] = useState(false);
  const password = useForm<PasswordValues>({ resolver: zodResolver(passwordForm) });

  if (!user) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      setUser(await authApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), whatsappOptIn: whatsapp }));
      toast.success('Perfil guardado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = password.handleSubmit(async (values) => {
    try {
      await authApi.changePassword(values.currentPassword, values.password);
      password.reset();
      toast.success('Palavra-passe alterada. As outras sessões foram terminadas.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a palavra-passe.');
    }
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Perfil" description={`${ROLE_LABELS[user.role]}${user.email ? ` · ${user.email}` : ''}`} />

      <form method="post"
        className="grid gap-4 rounded-2xl border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void saveProfile();
        }}
      >
        <h3 className="font-heading text-lg font-bold">Os seus dados</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="firstName">Nome</FieldLabel>
            <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11" />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Apelido</FieldLabel>
            <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="phone">Telemóvel</FieldLabel>
          <Input id="phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="84 123 4567" className="h-11" />
        </Field>
        <label className="flex items-start gap-3 rounded-xl bg-teal-tint p-3">
          <Checkbox checked={whatsapp} onCheckedChange={(value) => setWhatsapp(value === true)} className="mt-0.5" />
          <span className="text-sm">
            <span className="block font-semibold">Receber avisos por WhatsApp</span>
            <span className="text-teal-text">Entradas e saídas, relatórios, facturas e mensagens, no seu telemóvel. Sem WhatsApp, os avisos chegam por email.</span>
          </span>
        </label>
        <Button type="submit" size="touch" disabled={saving || firstName.trim().length < 2 || lastName.trim().length < 2}>
          {saving ? 'A guardar…' : 'Guardar'}
        </Button>
      </form>

      <form method="post" className="grid gap-4 rounded-2xl border bg-card p-5" onSubmit={changePassword}>
        <h3 className="font-heading text-lg font-bold">Palavra-passe</h3>
        <Field data-invalid={!!password.formState.errors.currentPassword}>
          <FieldLabel htmlFor="currentPassword">Palavra-passe actual</FieldLabel>
          <Input id="currentPassword" type="password" autoComplete="current-password" className="h-11" {...password.register('currentPassword')} />
          <FieldError errors={[password.formState.errors.currentPassword]} />
        </Field>
        <NewPasswordFields register={password.register} errors={password.formState.errors} />
        <Button type="submit" size="touch" variant="outline" disabled={password.formState.isSubmitting}>
          Alterar palavra-passe
        </Button>
      </form>
    </div>
  );
}
