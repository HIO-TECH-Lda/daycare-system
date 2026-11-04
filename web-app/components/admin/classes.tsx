'use client';

import { useState } from 'react';
import { Pencil, Plus, School, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAllChildren, useAssignStaff, useAssignments, useClasses, useDeleteClass, useSaveClass, useUnassignStaff, useUsers } from '@/lib/api/admin';
import { personName, refId, type ClassInfo } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ages(item: ClassInfo): string {
  const fmt = (months: number) => (months < 24 ? `${months} meses` : `${Math.floor(months / 12)} anos`);
  return `${fmt(item.min_age_months ?? 0)} a ${fmt(item.max_age_months ?? 0)}`;
}

/** Classes: capacity and how full they are, assigned educators, create and edit. */
export function Classes() {
  const classes = useClasses();
  const children = useAllChildren();
  const assignments = useAssignments();
  const staff = useUsers({ role: 'staff', status: 'active' });
  const assign = useAssignStaff();
  const unassign = useUnassignStaff();
  const [editing, setEditing] = useState<ClassInfo | 'new' | null>(null);

  if (classes.isPending) return <ListSkeleton rows={4} />;
  if (!classes.data) return <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Turmas"
        actions={
          <Button size="touch" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            Nova turma
          </Button>
        }
      />
      {classes.data.length === 0 ? (
        <EmptyState icon={School} title="Ainda sem turmas" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.data.map((item) => {
            const count = (children.data ?? []).filter((child) => refId(child.class_id) === item._id).length;
            const ratio = item.capacity ? count / item.capacity : 0;
            const educators = (assignments.data ?? []).filter((row) => refId(row.class_id) === item._id);
            const assignedIds = new Set(educators.map((row) => refId(row.staff_id)));
            const available = (staff.data ?? []).filter((user) => !assignedIds.has(user.id));
            return (
              <li key={item._id} className="grid gap-3 rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-lg font-bold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{ages(item)}</p>
                  </div>
                  <Button variant="ghost" size="icon-lg" aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}>
                    <Pencil aria-hidden />
                  </Button>
                </div>
                <div className="grid gap-1">
                  <p className="text-sm">
                    <strong className="tabular-nums">{count}</strong> de {item.capacity} crianças
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className={cn('block h-full', ratio >= 1 ? 'bg-destructive' : ratio >= 0.9 ? 'bg-brand-sun' : 'bg-green-text')} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Educadores</p>
                  <div className="flex flex-wrap gap-2">
                    {educators.map((row) => (
                      <span key={row._id} className="inline-flex items-center gap-1 rounded-full bg-green-tint py-1 pr-1 pl-3 text-sm text-green-text">
                        {personName(row.staff_id)}
                        <button type="button" aria-label="Retirar da turma" className="flex size-7 items-center justify-center rounded-full hover:bg-green-text/10" onClick={() => unassign.mutate(row._id)}>
                          <X className="size-4" aria-hidden />
                        </button>
                      </span>
                    ))}
                    {educators.length === 0 && <span className="text-sm text-destructive">Sem educador</span>}
                  </div>
                  {available.length > 0 && (
                    <Select value="" onValueChange={(staffId) => assign.mutate({ staffId, classId: item._id })}>
                      <SelectTrigger className="h-10" aria-label={`Juntar educador a ${item.name}`}>
                        <SelectValue placeholder="Juntar educador…" />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ClassDialog
        key={editing === 'new' ? 'new' : (editing?._id ?? 'none')}
        target={editing}
        childCount={editing && editing !== 'new' ? (children.data ?? []).filter((child) => refId(child.class_id) === editing._id).length : 0}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function ClassDialog({ target, childCount, onClose }: { target: ClassInfo | 'new' | null; childCount: number; onClose: () => void }) {
  const save = useSaveClass();
  const remove = useDeleteClass();
  const existing = target && target !== 'new' ? target : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [min, setMin] = useState(String(existing?.min_age_months ?? ''));
  const [max, setMax] = useState(String(existing?.max_age_months ?? ''));
  const [capacity, setCapacity] = useState(String(existing?.capacity ?? ''));
  const valid = name.trim() && Number(max) >= Number(min) && min !== '' && max !== '' && Number(capacity) >= 1;

  const submit = async () => {
    try {
      await save.mutateAsync({ id: existing?._id, name: name.trim(), min_age_months: Number(min), max_age_months: Number(max), capacity: Number(capacity) });
      toast.success(existing ? 'Turma actualizada.' : 'Turma criada.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  const destroy = async () => {
    if (!existing) return;
    try {
      await remove.mutateAsync(existing._id);
      toast.success('Turma apagada.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível apagar.');
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? `Editar ${existing.name}` : 'Nova turma'}</DialogTitle>
          <DialogDescription>Idades em meses (ex.: 0 a 12 para o berçário).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Nome
            <Input value={name} onChange={(event) => setName(event.target.value)} className="h-11" />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1 text-sm font-medium">
              Idade mín.
              <Input inputMode="numeric" value={min} onChange={(event) => setMin(event.target.value.replace(/\D/g, ''))} className="h-11" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Idade máx.
              <Input inputMode="numeric" value={max} onChange={(event) => setMax(event.target.value.replace(/\D/g, ''))} className="h-11" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Capacidade
              <Input inputMode="numeric" value={capacity} onChange={(event) => setCapacity(event.target.value.replace(/\D/g, ''))} className="h-11" />
            </label>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {existing ? (
            <Button variant="ghost" className="text-destructive" disabled={childCount > 0 || remove.isPending} title={childCount > 0 ? 'Mude primeiro as crianças de turma' : undefined} onClick={() => void destroy()}>
              {childCount > 0 ? `Tem ${childCount} crianças` : 'Apagar turma'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!valid || save.isPending} onClick={() => void submit()}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
