'use client';

import { useState } from 'react';
import { Phone, Siren } from 'lucide-react';
import { useDayAttendance, useMyChildren, useMyClasses } from '@/lib/api/staff';
import { refId, type Child } from '@/lib/api/types';
import { formatPhone } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { cn } from '@/lib/utils';
import { ChildAvatar, SafetyBadges } from '@/components/app/child-badges';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function guardianPhone(child: Child): string | undefined {
  const guardian = typeof child.parent_id === 'object' ? child.parent_id : null;
  return guardian?.phone || child.emergency_contact_phone || undefined;
}

/**
 * Emergency roll call: every child in the building right now (checked in, not yet collected)
 * across the educator's classes, to tick off at the assembly point. Uses the data on the
 * device, so it works without internet; the ticks are kept only on this screen.
 */
export function RollCallButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState<Set<string>>(new Set());
  const day = maputoDay();
  const classes = useMyClasses();
  const children = useMyChildren();
  const attendance = useDayAttendance(day);

  const inSchool = (children.data ?? []).filter((child) => {
    const record = attendance.byChild.get(child._id);
    return (record?.status === 'present' || record?.status === 'late') && !record.checkOut;
  });
  const classNames = new Map((classes.data ?? []).map((item) => [item._id, item.name]));

  const toggle = (id: string) =>
    setCounted((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const missing = inSchool.filter((child) => !counted.has(child._id)).length;

  return (
    <>
      <Button variant="outline" size="touch" className={cn('border-destructive text-destructive hover:bg-berry-tint hover:text-destructive', className)} onClick={() => setOpen(true)}>
        <Siren aria-hidden />
        Chamada de emergência
      </Button>
      <Sheet
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setCounted(new Set());
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-xl">Quem está na escola agora</SheetTitle>
            <SheetDescription>
              {inSchool.length === 0
                ? 'Nenhuma criança registada como presente.'
                : missing === 0
                  ? inSchool.length === 1
                    ? 'A criança foi contada.'
                    : `Todas as ${inSchool.length} crianças contadas.`
                  : `${inSchool.length - missing} de ${inSchool.length} contadas · faltam ${missing}`}
            </SheetDescription>
          </SheetHeader>
          <ul className="grid gap-2 px-4 pb-6">
            {inSchool.map((child) => {
              const done = counted.has(child._id);
              const phone = guardianPhone(child);
              return (
                <li key={child._id} className={cn('flex items-center gap-3 rounded-xl border p-2.5', done ? 'border-green-text bg-green-tint' : 'bg-card')}>
                  <button type="button" aria-pressed={done} onClick={() => toggle(child._id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ChildAvatar child={child} />
                    <span className="min-w-0 space-y-0.5">
                      <span className={cn('block truncate font-semibold', done && 'text-green-text')}>
                        {done ? '✓ ' : ''}
                        {child.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">{classNames.get(refId(child.class_id) ?? '') ?? ''}</span>
                      <SafetyBadges child={child} />
                    </span>
                  </button>
                  {phone && (
                    <Button asChild variant="outline" size="icon-lg" className="size-11 shrink-0">
                      <a href={`tel:${phone}`} aria-label={`Ligar ao encarregado de ${child.name} (${formatPhone(phone)})`}>
                        <Phone aria-hidden />
                      </a>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="px-4 pb-6 text-xs text-muted-foreground">
            Lista feita a partir das entradas e saídas registadas neste aparelho, também sem internet. Toque numa criança para a marcar como contada.
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}
