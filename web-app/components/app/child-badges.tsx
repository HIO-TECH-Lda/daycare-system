import { CameraOff, Pill, TriangleAlert } from 'lucide-react';
import { hasHealthNote, type Child } from '@/lib/api/types';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/** A child's photo, or initials when there's none (or offline: photos aren't kept on the device). */
export function ChildAvatar({ child, className }: { child: Pick<Child, 'name' | 'photo_url'>; className?: string }) {
  return (
    <Avatar className={cn('size-11', className)}>
      {child.photo_url && <AvatarImage src={child.photo_url} alt="" className="object-cover" />}
      <AvatarFallback className="bg-teal-tint font-semibold text-teal-text">{initials(child.name)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * What the team must never miss about a child: allergies, medication, and no consent for photos.
 * `full` shows the details (lists); otherwise short labels.
 */
export function SafetyBadges({ child, full = false, className }: { child: Child; full?: boolean; className?: string }) {
  const allergy = hasHealthNote(child.allergies);
  const medication = hasHealthNote(child.medications);
  const noPhotos = child.image_usage_authorized === false;
  if (!allergy && !medication && !noPhotos) return null;
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {allergy && (
        <span className="inline-flex items-center gap-1 rounded-full bg-berry-tint px-2 py-0.5 text-xs font-semibold text-destructive">
          <TriangleAlert className="size-3.5" aria-hidden />
          {full ? `Alergia: ${child.allergies}` : 'Alergia'}
        </span>
      )}
      {medication && (
        <span className="inline-flex items-center gap-1 rounded-full bg-sun-tint px-2 py-0.5 text-xs font-semibold text-sun-text">
          <Pill className="size-3.5" aria-hidden />
          {full ? `Medicação: ${child.medications}` : 'Medicação'}
        </span>
      )}
      {noPhotos && (
        <span className="inline-flex items-center gap-1 rounded-full bg-grape-tint px-2 py-0.5 text-xs font-semibold text-brand-grape">
          <CameraOff className="size-3.5" aria-hidden />
          Sem fotos
        </span>
      )}
    </span>
  );
}

/** "Por enviar": a change made on this device that the API doesn't have yet. */
export function PendingBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-teal-tint px-2 py-0.5 text-xs font-medium text-teal-text', className)}>
      Por enviar
    </span>
  );
}
