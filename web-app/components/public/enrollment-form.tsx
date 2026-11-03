'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, Plus, Trash2 } from 'lucide-react';
import { publicApi, ApiRequestError } from '@/lib/api/client';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Person {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface Draft {
  child: {
    name: string;
    birth_date: string;
    gender: '' | 'Masculino' | 'Feminino';
    allergies: string;
    medications: string;
    dietary_restrictions: string;
    languages_spoken: string;
    previous_center: string;
  };
  guardians: Person[];
  pickup: Person[];
  start: string;
  notes: string;
  consents: { data: boolean; images: boolean; whatsapp: boolean };
}

const KEY = 'sdc.matricula';
const EMPTY_PERSON: Person = { name: '', relationship: '', phone: '', email: '' };
const EMPTY: Draft = {
  child: { name: '', birth_date: '', gender: '', allergies: '', medications: '', dietary_restrictions: '', languages_spoken: '', previous_center: '' },
  guardians: [{ ...EMPTY_PERSON }],
  pickup: [],
  start: '',
  notes: '',
  consents: { data: false, images: false, whatsapp: true }
};
const STEPS = ['Criança', 'Encarregados', 'Autorizados', 'Confirmar'];

function loadDraft(): Draft {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Draft) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** What's missing on a step (shown under the buttons), or null when it can move on. */
function problem(step: number, draft: Draft): string | null {
  if (step === 0) {
    if (draft.child.name.trim().length < 2) return 'Indique o nome completo da criança.';
    if (!draft.child.birth_date) return 'Indique a data de nascimento.';
  }
  if (step === 1) {
    const main = draft.guardians[0];
    if (main.name.trim().length < 2) return 'Indique o nome do encarregado principal.';
    if (!main.phone.trim() && !main.email.trim()) return 'O encarregado principal precisa de um telemóvel ou de um email (para receber o convite).';
    if (draft.guardians.slice(1).some((g) => g.name.trim().length > 0 && g.name.trim().length < 2)) return 'Complete o nome de cada encarregado.';
  }
  if (step === 2 && draft.pickup.some((p) => p.name.trim().length < 2 || !p.phone.trim())) return 'Cada pessoa autorizada precisa de nome e telemóvel.';
  if (step === 3 && !draft.consents.data) return 'É necessário aceitar o tratamento dos dados para enviar o pedido.';
  return null;
}

/**
 * The public enrolment request (/matricula), in four steps. What's typed stays in this browser
 * until it's sent; the administration reviews the request and, when approved, invites the
 * main guardian to the portal.
 */
export function EnrollmentForm() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  // Read in the browser: the page is prerendered, so a date taken while rendering would be the build's
  const [today, setToday] = useState<string | undefined>(undefined);

  // Restore after the first render (the page is prerendered without the browser's storage)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(loadDraft());
      setToday(maputoDay());
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      // Not kept: the form still works
    }
  }, [draft, loaded]);

  const issue = problem(step, draft);
  const setChild = (patch: Partial<Draft['child']>) => setDraft({ ...draft, child: { ...draft.child, ...patch } });

  const next = () => {
    setTried(true);
    if (issue) return;
    setTried(false);
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const send = async () => {
    setTried(true);
    if (issue) return;
    setSending(true);
    setError(null);
    const person = (p: Person) => ({ name: p.name.trim(), relationship: p.relationship.trim(), ...(p.phone.trim() && { phone: p.phone.trim() }), ...(p.email.trim() && { email: p.email.trim() }) });
    try {
      const res = await publicApi.post<{ reference: string }>('/enrollments', {
        child: {
          ...Object.fromEntries(Object.entries(draft.child).filter(([, value]) => value)),
          birth_date: draft.child.birth_date,
          emergency_contact_name: draft.guardians[0].name.trim(),
          ...(draft.guardians[0].phone.trim() && { emergency_contact_phone: draft.guardians[0].phone.trim() })
        },
        guardians: draft.guardians.filter((g) => g.name.trim()).map(person),
        pickup_persons: draft.pickup.map((p) => ({ name: p.name.trim(), relationship: p.relationship.trim(), phone: p.phone.trim() })),
        consents: { data_processing: true, image_usage_authorized: draft.consents.images, whatsapp_opt_in: draft.consents.whatsapp && !!draft.guardians[0].phone.trim() },
        ...(draft.start && { requested_start_date: draft.start }),
        notes: draft.notes.trim(),
        website: honeypot
      });
      setReference(res.data.reference);
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        // Nothing stored
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? [err.message, ...err.errors].filter(Boolean).join(' ') : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (reference) {
    return (
      <section className="grid gap-4 rounded-2xl border bg-card p-6 text-center">
        <CircleCheck className="mx-auto size-12 text-green-text" aria-hidden />
        <h1 className="font-heading text-2xl font-bold">Pedido enviado</h1>
        <p>
          O número do seu pedido é <strong className="font-mono">{reference}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          A administração do centro vai analisar o pedido e responder por WhatsApp ou email. Se for aprovado, recebe um convite para entrar no portal.
        </p>
      </section>
    );
  }

  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step < 3) next();
        else void send();
      }}
      className="grid gap-5"
    >
      <ol aria-label="Passos" className="grid grid-cols-4 gap-2 text-xs font-semibold">
        {STEPS.map((label, index) => (
          <li key={label} className={cn('grid gap-1', index <= step ? 'text-green-text' : 'text-muted-foreground')} aria-current={index === step ? 'step' : undefined}>
            <span className={cn('h-1.5 rounded-full', index <= step ? 'bg-green-text' : 'bg-muted')} />
            {index + 1} · {label}
          </li>
        ))}
      </ol>

      <section className="grid gap-4 rounded-2xl border bg-card p-5">
        {step === 0 && (
          <>
            <h2 className="font-heading text-xl font-bold">Sobre a criança</h2>
            <Field label="Nome completo">
              <Input value={draft.child.name} onChange={(e) => setChild({ name: e.target.value })} className="h-11" autoComplete="off" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de nascimento">
                <Input type="date" max={today} value={draft.child.birth_date} onChange={(e) => setChild({ birth_date: e.target.value })} className="h-11" />
              </Field>
              {/* Two buttons: a labelled group, not a <label> (which would name both buttons "Sexo …") */}
              <div role="group" aria-labelledby="sexo-label" className="grid gap-1 text-sm font-medium">
                <span id="sexo-label">Sexo</span>
                <div className="flex gap-2">
                  {(['Feminino', 'Masculino'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={draft.child.gender === value}
                      onClick={() => setChild({ gender: draft.child.gender === value ? '' : value })}
                      className={cn('h-11 flex-1 rounded-lg border text-sm', draft.child.gender === value ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-background')}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Field label="Alergias" hint="Deixe vazio se nenhuma.">
              <Input value={draft.child.allergies} onChange={(e) => setChild({ allergies: e.target.value })} placeholder="Ex.: amendoim, leite" className="h-11" />
            </Field>
            <Field label="Medicação">
              <Input value={draft.child.medications} onChange={(e) => setChild({ medications: e.target.value })} className="h-11" />
            </Field>
            <details className="rounded-xl border p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Mais sobre a criança (opcional)</summary>
              <div className="mt-3 grid gap-3">
                <Field label="Alimentação (restrições)">
                  <Input value={draft.child.dietary_restrictions} onChange={(e) => setChild({ dietary_restrictions: e.target.value })} className="h-11" />
                </Field>
                <Field label="Línguas faladas em casa">
                  <Input value={draft.child.languages_spoken} onChange={(e) => setChild({ languages_spoken: e.target.value })} placeholder="Ex.: Português, Changana" className="h-11" />
                </Field>
                <Field label="Creche anterior">
                  <Input value={draft.child.previous_center} onChange={(e) => setChild({ previous_center: e.target.value })} className="h-11" />
                </Field>
              </div>
            </details>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-heading text-xl font-bold">Encarregados de educação</h2>
            <p className="text-sm text-muted-foreground">O primeiro é o contacto principal: recebe a resposta e, se o pedido for aprovado, o convite para o portal.</p>
            {draft.guardians.map((guardian, index) => (
              <PersonFields
                key={index}
                title={index === 0 ? 'Encarregado principal' : `Encarregado ${index + 1}`}
                person={guardian}
                withEmail
                onChange={(patch) => setDraft({ ...draft, guardians: draft.guardians.map((g, i) => (i === index ? { ...g, ...patch } : g)) })}
                onRemove={index > 0 ? () => setDraft({ ...draft, guardians: draft.guardians.filter((_, i) => i !== index) }) : undefined}
              />
            ))}
            {draft.guardians.length < 4 && (
              <Button type="button" variant="ghost" className="justify-start text-teal-text" onClick={() => setDraft({ ...draft, guardians: [...draft.guardians, { ...EMPTY_PERSON }] })}>
                <Plus aria-hidden />
                Outro encarregado
              </Button>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-heading text-xl font-bold">Pessoas autorizadas a buscar</h2>
            <p className="text-sm text-muted-foreground">Além dos encarregados. O centro só entrega a criança a quem estiver na lista (pode juntar fotografias depois, no portal).</p>
            {draft.pickup.map((person, index) => (
              <PersonFields
                key={index}
                title={`Pessoa ${index + 1}`}
                person={person}
                onChange={(patch) => setDraft({ ...draft, pickup: draft.pickup.map((p, i) => (i === index ? { ...p, ...patch } : p)) })}
                onRemove={() => setDraft({ ...draft, pickup: draft.pickup.filter((_, i) => i !== index) })}
              />
            ))}
            {draft.pickup.length < 6 && (
              <Button type="button" variant="ghost" className="justify-start text-teal-text" onClick={() => setDraft({ ...draft, pickup: [...draft.pickup, { ...EMPTY_PERSON }] })}>
                <Plus aria-hidden />
                Adicionar pessoa
              </Button>
            )}
            {draft.pickup.length === 0 && <p className="text-sm text-muted-foreground">Ninguém além dos encarregados? Pode continuar.</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-heading text-xl font-bold">Confirmar e enviar</h2>
            <dl className="grid gap-1 text-sm">
              <Summary label="Criança" value={`${draft.child.name}${draft.child.birth_date ? `, nascida/o a ${draft.child.birth_date.split('-').reverse().join('/')}` : ''}`} />
              <Summary label="Alergias" value={draft.child.allergies || 'Nenhuma'} />
              <Summary label="Encarregados" value={draft.guardians.filter((g) => g.name.trim()).map((g) => g.name).join(', ')} />
              <Summary label="Autorizados" value={draft.pickup.map((p) => p.name).join(', ') || '—'} />
            </dl>
            <Field label="Data de início pretendida (opcional)">
              <Input type="date" min={today} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="h-11" />
            </Field>
            <Field label="Observações (opcional)">
              <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3} />
            </Field>
            <Consent checked={draft.consents.data} onChange={(value) => setDraft({ ...draft, consents: { ...draft.consents, data: value } })}>
              <strong>Autorizo o tratamento destes dados</strong> pelo Centro Infantil Sonho de Criança, para a matrícula e o acompanhamento da criança. (Obrigatório)
            </Consent>
            <Consent checked={draft.consents.images} onChange={(value) => setDraft({ ...draft, consents: { ...draft.consents, images: value } })}>
              Autorizo fotografias da criança nas actividades, partilhadas só com a família no portal.
            </Consent>
            <Consent checked={draft.consents.whatsapp} onChange={(value) => setDraft({ ...draft, consents: { ...draft.consents, whatsapp: value } })}>
              Aceito receber avisos por WhatsApp no telemóvel do encarregado principal.
            </Consent>
            {/* Honeypot: hidden from people, filled in by bots */}
            <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          </>
        )}
      </section>

      {tried && issue && (
        <p role="alert" className="text-sm text-destructive">
          {issue}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-berry-tint p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" size="touch" variant="outline" className="flex-1" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Voltar
        </Button>
        <Button type="submit" size="touch" className="flex-[2]" disabled={sending}>
          {step < 3 ? 'Continuar' : sending ? 'A enviar…' : 'Enviar pedido'}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">O que escreve fica guardado neste aparelho até enviar.</p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

function PersonFields({ title, person, withEmail, onChange, onRemove }: { title: string; person: Person; withEmail?: boolean; onChange: (patch: Partial<Person>) => void; onRemove?: () => void }) {
  return (
    <fieldset className="grid gap-3 rounded-xl border p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        {title}
        {onRemove && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Retirar ${title}`} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        )}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome completo">
          <Input value={person.name} onChange={(e) => onChange({ name: e.target.value })} className="h-11" />
        </Field>
        <Field label="Relação com a criança">
          <Input value={person.relationship} onChange={(e) => onChange({ relationship: e.target.value })} placeholder="Ex.: mãe, avó" className="h-11" />
        </Field>
        <Field label="Telemóvel">
          <Input value={person.phone} onChange={(e) => onChange({ phone: e.target.value })} inputMode="tel" placeholder="84 123 4567" className="h-11" />
        </Field>
        {withEmail && (
          <Field label="Email (opcional)">
            <Input type="email" value={person.email} onChange={(e) => onChange({ email: e.target.value })} className="h-11" />
          </Field>
        )}
      </div>
    </fieldset>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Consent({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 rounded-xl bg-muted/50 p-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
      <span>{children}</span>
    </label>
  );
}
