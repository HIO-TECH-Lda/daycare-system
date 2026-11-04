'use client';

import { useState } from 'react';
import { Phone, School } from 'lucide-react';
import { childrenOfClass, useMyChildren, useMyClasses, usePickupPeople } from '@/lib/api/staff';
import { hasHealthNote, personName, type Child, type PickupPerson } from '@/lib/api/types';
import { formatAge, formatPhone, initials } from '@/lib/format';
import { ClassPicker, useSelectedClass } from '@/components/app/class-picker';
import { ChildAvatar, SafetyBadges } from '@/components/app/child-badges';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/** The children of the educator's class, with what matters for their safety always visible. */
export function ClassRoster() {
  const classes = useMyClasses();
  const children = useMyChildren();
  const pickup = usePickupPeople();
  const [classId, setClassId] = useSelectedClass(classes.data);
  const [open, setOpen] = useState<Child | null>(null);

  if (classes.isPending || children.isPending) return <ListSkeleton rows={6} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;
  if (!classes.data?.length) {
    return (
      <EmptyState icon={School} title="Ainda não tem turmas">
        Peça à administração para o associar a uma turma.
      </EmptyState>
    );
  }

  const currentClass = classes.data.find((item) => item._id === classId);
  const rows = childrenOfClass(children.data, classId);
  const flagged = rows.filter((child) => hasHealthNote(child.allergies) || hasHealthNote(child.medications)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={currentClass?.name ?? 'Turma'}
        description={`${rows.length === 1 ? '1 criança' : `${rows.length} crianças`}${flagged ? ` · ${flagged} com alergias ou medicação` : ''}`}
        actions={<ClassPicker classes={classes.data} value={classId} onChange={setClassId} />}
      />
      {rows.length === 0 ? (
        <EmptyState icon={School} title="Sem crianças nesta turma" />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((child) => (
            <li key={child._id}>
              <button
                type="button"
                onClick={() => setOpen(child)}
                className="flex h-full w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-brand-green"
              >
                <ChildAvatar child={child} className="size-12" />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate font-semibold">{child.name}</span>
                  <span className="block text-sm text-muted-foreground">{formatAge(child.birth_date)}</span>
                  <SafetyBadges child={child} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ChildSheet child={open} people={open ? (pickup.data?.get(open._id) ?? []) : []} onClose={() => setOpen(null)} />
    </div>
  );
}

function ChildSheet({ child, people, onClose }: { child: Child | null; people: PickupPerson[]; onClose: () => void }) {
  const guardian = child && typeof child.parent_id === 'object' ? child.parent_id : null;
  return (
    <Sheet open={!!child} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {child && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <ChildAvatar child={child} className="size-16" />
                <div>
                  <SheetTitle className="text-xl">{child.name}</SheetTitle>
                  <SheetDescription>{formatAge(child.birth_date)}</SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="grid gap-5 px-4 pb-6">
              <Section title="Saúde">
                <SafetyBadges child={child} full />
                {!hasHealthNote(child.allergies) && !hasHealthNote(child.medications) && <p className="text-sm text-muted-foreground">Sem alergias nem medicação registadas.</p>}
                {child.image_usage_authorized === false && <p className="text-sm text-muted-foreground">A família não autorizou fotografias desta criança.</p>}
              </Section>

              <Section title="Contactos">
                {guardian && <Contact name={personName(guardian)} detail="Encarregado de Educação" phone={guardian.phone} />}
                {child.emergency_contact_phone && child.emergency_contact_phone !== guardian?.phone && (
                  <Contact name={child.emergency_contact_name || 'Contacto de emergência'} detail="Emergência" phone={child.emergency_contact_phone} />
                )}
              </Section>

              <Section title="Pessoas autorizadas a recolher">
                {people.length === 0 && <p className="text-sm text-muted-foreground">Só o encarregado de educação.</p>}
                {people.map((person) => (
                  <div key={person._id} className="flex items-center gap-3">
                    <Avatar className="size-14 rounded-xl">
                      {person.photo_url && <AvatarImage src={person.photo_url} alt="" className="object-cover" />}
                      <AvatarFallback className="rounded-xl bg-muted font-semibold">{initials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-muted-foreground">{[person.relationship, person.phone && formatPhone(person.phone)].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                ))}
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Contact({ name, detail, phone }: { name: string; detail: string; phone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{name}</p>
        <p className="text-muted-foreground">
          {detail}
          {phone ? ` · ${formatPhone(phone)}` : ''}
        </p>
      </div>
      {phone && (
        <Button asChild variant="outline" size="icon-lg" className="size-11 shrink-0">
          <a href={`tel:${phone}`} aria-label={`Ligar a ${name}`}>
            <Phone aria-hidden />
          </a>
        </Button>
      )}
    </div>
  );
}
