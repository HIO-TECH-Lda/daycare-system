'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, CameraOff, Check, ChevronLeft, ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiRequestError } from '@/lib/api/client';
import { childrenOfClass, useActivities, useDayAttendance, useDayReports, useMyChildren, useMyClasses, useReportPhotos, type DayReport } from '@/lib/api/staff';
import type { Child } from '@/lib/api/types';
import { formatTime, formatWeekday } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { saveDailyReport, usePendingWrites, type DailyReportFields } from '@/lib/offline/writes';
import { compressImage } from '@/lib/image';
import { cn } from '@/lib/utils';
import { ClassPicker, useSelectedClass } from '@/components/app/class-picker';
import { ChildAvatar, PendingBadge, SafetyBadges } from '@/components/app/child-badges';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PAGE = '/staff/relatorio-diario';

function isFilled(report: DayReport | undefined): boolean {
  const fields = report?.fields;
  if (!fields) return false;
  return !!(fields.mood || fields.notes || fields.activities?.length || Object.values(fields.meals ?? {}).some(Boolean) || fields.nap_time?.start);
}

/** Today's daily reports: the class list, or one child's report (`?crianca=<id>`). */
export function DailyReports() {
  const childId = useSearchParams().get('crianca');
  const day = maputoDay();
  const classes = useMyClasses();
  const children = useMyChildren();
  const reports = useDayReports(day);
  const attendance = useDayAttendance(day);
  const [classId, setClassId] = useSelectedClass(classes.data);

  if (classes.isPending || children.isPending || reports.isPending) return <ListSkeleton rows={6} />;
  if (!children.data) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;
  if (!classes.data?.length) {
    return (
      <EmptyState icon={ClipboardList} title="Ainda não tem turmas">
        Peça à administração para o associar a uma turma.
      </EmptyState>
    );
  }

  const child = childId ? children.data.find((item) => item._id === childId) : undefined;
  if (child) {
    // Previous / next go through the child's own class
    const classmates = childrenOfClass(children.data, typeof child.class_id === 'object' ? (child.class_id?._id ?? null) : child.class_id);
    const index = classmates.findIndex((item) => item._id === child._id);
    return (
      <ReportEditor
        key={child._id}
        child={child}
        day={day}
        initial={reports.byChild.get(child._id)}
        position={`${index + 1} de ${classmates.length}`}
        previous={classmates[index - 1]}
        next={classmates[index + 1]}
      />
    );
  }

  const currentClass = classes.data.find((item) => item._id === classId);
  const rows = childrenOfClass(children.data, classId);
  // Absent children need no report today
  const isAbsent = (id: string) => ['absent', 'excused'].includes(attendance.byChild.get(id)?.status ?? '');
  const expected = rows.filter((item) => !isAbsent(item._id));
  const filled = expected.filter((item) => isFilled(reports.byChild.get(item._id))).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Relatório diário"
        description={`${formatWeekday(new Date())} · ${currentClass?.name ?? ''} · ${filled} de ${expected.length} preenchidos`}
        actions={<ClassPicker classes={classes.data} value={classId} onChange={setClassId} />}
      />
      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sem crianças nesta turma" />
      ) : (
        <ul className="grid grid-cols-1 gap-2">
          {rows.map((item) => {
            const report = reports.byChild.get(item._id);
            const done = isFilled(report);
            const absent = isAbsent(item._id) && !done;
            return (
              <li key={item._id}>
                <Link href={`${PAGE}?crianca=${item._id}`} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-brand-green">
                  <ChildAvatar child={item} />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <SafetyBadges child={item} />
                  </span>
                  {report?.pending && <PendingBadge />}
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', done ? 'bg-green-tint text-green-text' : 'bg-muted text-muted-foreground')}>
                    {done ? 'Preenchido' : absent ? 'Ausente' : 'Por preencher'}
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// --- Editor ---

const MEALS: { key: keyof NonNullable<DailyReportFields['meals']>; label: string }[] = [
  { key: 'breakfast', label: 'Pequeno-almoço' },
  { key: 'snack', label: 'Lanche' },
  { key: 'lunch', label: 'Almoço' }
];
const MEAL_AMOUNTS = ['Comeu tudo', 'Comeu metade', 'Comeu pouco', 'Não comeu'];
const MOODS = ['Alegre', 'Calmo', 'Cansado', 'Choroso', 'Agitado'];
const DEFAULT_ACTIVITIES = ['Pintura', 'Música', 'Recreio', 'Histórias', 'Jogos', 'Motricidade'];
const AUTOSAVE_MS = 800;

/** "12:30" on the centre day → ISO (Maputo is UTC+2 all year). */
function timeOnDay(day: string, time: string): string {
  return new Date(`${day}T${time}:00+02:00`).toISOString();
}

function minutesBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return minutes > 0 ? minutes : undefined;
}

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`;
}

function ReportEditor({
  child,
  day,
  initial,
  position,
  previous,
  next
}: {
  child: Child;
  day: string;
  initial: DayReport | undefined;
  position: string;
  previous?: Child;
  next?: Child;
}) {
  // Taken once: later refetches must not overwrite what the educator is typing
  const [fields, setFields] = useState<DailyReportFields>(() => initial?.fields ?? {});
  const [touched, setTouched] = useState(false);
  // Changes waiting for the autosave delay
  const [dirty, setDirty] = useState(false);
  const timer = useRef<number | null>(null);
  const latest = useRef(fields);
  const pending = usePendingWrites('daily-report', { childId: child._id, day });

  const flush = () => {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
    setDirty(false);
    void saveDailyReport({ childId: child._id, fields: latest.current }).catch(() => toast.error('Não foi possível guardar o relatório.'));
  };

  // Save what's left when leaving this child (next child, another screen)
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<DailyReportFields>) => {
    const nextFields = { ...latest.current, ...patch };
    latest.current = nextFields;
    setFields(nextFields);
    setTouched(true);
    setDirty(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, AUTOSAVE_MS);
  };

  const meals = fields.meals ?? {};
  const nap = fields.nap_time ?? {};
  const napMinutes = nap.duration_minutes ?? minutesBetween(nap.start, nap.end);
  const setNap = (part: 'start' | 'end', time: string) => {
    const nextNap = { ...nap, [part]: time ? timeOnDay(day, time) : undefined };
    update({ nap_time: { ...nextNap, duration_minutes: minutesBetween(nextNap.start, nextNap.end) } });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-20">
      <Link href={PAGE} className="inline-flex items-center gap-1 text-sm font-medium text-teal-text">
        <ChevronLeft className="size-4" aria-hidden />
        Todas as crianças
      </Link>

      <div className="flex items-center gap-3">
        <ChildAvatar child={child} className="size-14" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="truncate text-2xl font-bold">{child.name}</h2>
          <p className="text-sm text-muted-foreground">
            {formatWeekday(new Date())} · {position}
          </p>
          <SafetyBadges child={child} full />
        </div>
        <span className="shrink-0" role="status">
          {dirty ? (
            <span className="text-xs text-muted-foreground">A guardar…</span>
          ) : pending.length > 0 ? (
            <PendingBadge />
          ) : (
            touched && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-tint px-2 py-0.5 text-xs font-medium text-green-text">
                <Check className="size-3.5" aria-hidden />
                Enviado
              </span>
            )
          )}
        </span>
      </div>

      <Block title="Refeições">
        <div className="grid gap-3">
          {MEALS.map((meal) => (
            <div key={meal.key} className="grid gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-center">
              <span className="text-sm text-muted-foreground">{meal.label}</span>
              <Chips
                options={MEAL_AMOUNTS}
                value={meals[meal.key] ? [meals[meal.key]!] : []}
                onToggle={(option) => update({ meals: { ...meals, [meal.key]: meals[meal.key] === option ? '' : option } })}
              />
            </div>
          ))}
        </div>
      </Block>

      <Block title="Sesta">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Input type="time" aria-label="Início da sesta" className="h-11 w-32" value={nap.start ? formatTime(nap.start) : ''} onChange={(event) => setNap('start', event.target.value)} />
          <span className="text-muted-foreground">até</span>
          <Input type="time" aria-label="Fim da sesta" className="h-11 w-32" value={nap.end ? formatTime(nap.end) : ''} onChange={(event) => setNap('end', event.target.value)} />
          {napMinutes && <span className="text-muted-foreground">({duration(napMinutes)})</span>}
        </div>
      </Block>

      <Block title="Disposição">
        <Chips
          options={fields.mood && !MOODS.includes(fields.mood) ? [...MOODS, fields.mood] : MOODS}
          value={fields.mood ? [fields.mood] : []}
          onToggle={(option) => update({ mood: fields.mood === option ? '' : option })}
        />
      </Block>

      <ActivitiesBlock value={fields.activities ?? []} onChange={(activities) => update({ activities })} />

      <Block title="Nota para a família">
        <Textarea
          rows={3}
          value={fields.notes ?? ''}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder="Algo especial do dia (opcional)"
          aria-label="Nota para a família"
        />
      </Block>

      <Block title="Saúde e incidentes">
        <Textarea
          rows={2}
          value={fields.health_notes ?? ''}
          onChange={(event) => update({ health_notes: event.target.value })}
          placeholder="Febre, quedas, medicação dada… (opcional)"
          aria-label="Saúde e incidentes"
        />
      </Block>

      <ReportPhotos child={child} reportId={initial?.id} />

      <p className="text-xs text-muted-foreground">Cada alteração é guardada logo neste aparelho, mesmo sem internet, e enviada quando houver ligação.</p>

      <nav aria-label="Crianças" className="fixed inset-x-0 bottom-16 z-10 border-t bg-background/95 px-4 py-2 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button asChild={!!previous} variant="outline" size="touch" className="flex-1" disabled={!previous}>
            {previous ? (
              <Link href={`${PAGE}?crianca=${previous._id}`} onClick={flush}>
                <ChevronLeft aria-hidden />
                Anterior
              </Link>
            ) : (
              <span>
                <ChevronLeft aria-hidden />
                Anterior
              </span>
            )}
          </Button>
          <Button asChild size="touch" className="flex-[2]">
            <Link href={next ? `${PAGE}?crianca=${next._id}` : PAGE} onClick={flush}>
              {next ? 'Próxima criança' : 'Concluir'}
              {next && <ChevronRight aria-hidden />}
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Chips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (option: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(option)}
            className={cn(
              'h-10 rounded-full border px-4 text-sm transition-colors',
              on ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-background hover:bg-muted'
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ActivitiesBlock({ value, onChange }: { value: string[]; onChange: (activities: string[]) => void }) {
  const activities = useActivities();
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');
  const fromCentre = (activities.data ?? []).filter((item) => item.is_active !== false).map((item) => item.name);
  const options = [...new Set([...fromCentre, ...DEFAULT_ACTIVITIES, ...value])];

  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  const add = () => {
    const name = custom.trim();
    if (name && !value.includes(name)) onChange([...value, name]);
    setCustom('');
    setAdding(false);
  };

  return (
    <Block title="Actividades">
      <Chips options={options} value={value} onToggle={toggle} />
      {adding ? (
        <form method="post"
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <Input autoFocus value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Nome da actividade" aria-label="Nova actividade" className="h-10" />
          <Button type="submit" variant="outline" className="h-10">
            Adicionar
          </Button>
        </form>
      ) : (
        <Button variant="ghost" className="justify-start text-teal-text" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Outra actividade
        </Button>
      )}
    </Block>
  );
}

// --- Photos (online only) ---

function ReportPhotos({ child, reportId }: { child: Child; reportId?: string }) {
  const photos = useReportPhotos(reportId);
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (child.image_usage_authorized === false) {
    return (
      <Block title="Fotografias">
        <p className="flex items-center gap-2 text-sm text-brand-grape">
          <CameraOff className="size-4" aria-hidden />
          A família não autorizou fotografias desta criança.
        </p>
      </Block>
    );
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length || !reportId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('daily_report_id', reportId);
        form.append('photo', await compressImage(file), 'foto.jpg');
        await api.post('/report-photos', form);
      }
      await queryClient.invalidateQueries({ queryKey: ['report-photos', reportId] });
      toast.success(files.length === 1 ? 'Fotografia adicionada.' : 'Fotografias adicionadas.');
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError && error.status === 0
          ? 'Sem ligação: as fotografias precisam de internet.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível enviar a fotografia.'
      );
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Block title="Fotografias">
      {!reportId ? (
        <p className="text-sm text-muted-foreground">Pode juntar fotografias quando o relatório estiver enviado (precisa de internet).</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {photos.data?.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element -- signed API link, not a static asset
            <img key={photo._id} src={photo.photo_url} alt={photo.caption || `Fotografia de ${child.name}`} className="size-20 rounded-lg object-cover" />
          ))}
          <input ref={input} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(event) => void upload(event.target.files)} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => input.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-teal-text text-xs font-semibold text-teal-text disabled:opacity-50"
          >
            <Camera className="size-5" aria-hidden />
            {uploading ? 'A enviar…' : 'Foto'}
          </button>
        </div>
      )}
    </Block>
  );
}
