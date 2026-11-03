'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { authApi, type NotificationPrefs, type PrefCategory, type User } from '@/lib/api/auth';
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

/** Own contacts, WhatsApp consent, notification choices and password (email and role are set by the administration). */
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

      <NotificationChoices user={user} onSaved={setUser} />

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

const CHOICES: { category: PrefCategory; label: string; hint: string }[] = [
  { category: 'attendance', label: 'Entradas e saídas', hint: 'Quando a criança chega e sai do centro (duas por dia).' },
  { category: 'reports', label: 'Relatórios', hint: 'Relatório do dia e relatório mensal.' },
  { category: 'billing', label: 'Propinas e facturas', hint: 'Novas facturas, atrasos e pagamentos confirmados.' },
  { category: 'messages', label: 'Mensagens', hint: 'Mensagens novas do centro.' }
];

const DEFAULT_PREFS: NotificationPrefs = {
  attendance: { whatsapp: true, email: false },
  reports: { whatsapp: true, email: true },
  billing: { whatsapp: true, email: true },
  messages: { whatsapp: true, email: true }
};

/** Which channel each kind of message comes by. Saved on each change. */
function NotificationChoices({ user, onSaved }: { user: User; onSaved: (user: User) => void }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(user.notificationPrefs ?? DEFAULT_PREFS);
  // Families get every kind; the centre's team only gets messages
  const choices = user.role === 'responsavel' ? CHOICES : CHOICES.filter((choice) => choice.category === 'messages');
  const canWhatsApp = user.whatsappOptIn && !!user.phone;
  const canEmail = !!user.email;

  const change = async (category: PrefCategory, channel: 'whatsapp' | 'email', value: boolean) => {
    const previous = prefs;
    setPrefs({ ...prefs, [category]: { ...prefs[category], [channel]: value } });
    try {
      onSaved(await authApi.updateProfile({ notificationPrefs: { [category]: { [channel]: value } } }));
    } catch (error) {
      setPrefs(previous);
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-5" aria-labelledby="choices-title">
      <div className="space-y-1">
        <h3 id="choices-title" className="font-heading text-lg font-bold">
          Avisos
        </h3>
        <p className="text-sm text-muted-foreground">
          Escolha como quer receber cada aviso. Convites e links de palavra-passe chegam sempre.
          {!canWhatsApp && ' Para escolher WhatsApp, indique o telemóvel e aceite os avisos por WhatsApp acima.'}
        </p>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3">
        <span />
        <span className="text-center text-xs font-semibold text-muted-foreground">WhatsApp</span>
        <span className="text-center text-xs font-semibold text-muted-foreground">Email</span>
        {choices.map((choice) => (
          <div key={choice.category} className="contents">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{choice.label}</p>
              <p className="text-xs text-muted-foreground">{choice.hint}</p>
            </div>
            <Checkbox
              aria-label={`${choice.label} por WhatsApp`}
              className="mx-auto size-5"
              checked={canWhatsApp && prefs[choice.category].whatsapp}
              disabled={!canWhatsApp}
              onCheckedChange={(value) => void change(choice.category, 'whatsapp', value === true)}
            />
            <Checkbox
              aria-label={`${choice.label} por email`}
              className="mx-auto size-5"
              checked={canEmail && prefs[choice.category].email}
              disabled={!canEmail}
              onCheckedChange={(value) => void change(choice.category, 'email', value === true)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
