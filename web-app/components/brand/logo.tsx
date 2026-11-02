import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The logo files are traced SVGs that only look right on light backgrounds
 * (see the plan, §2): use them on white or cream surfaces only.
 */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.svg"
      alt="Centro Infantil Sonho de Criança"
      width={720}
      height={680}
      priority={priority}
      unoptimized
      className={cn('h-auto w-40', className)}
    />
  );
}

/** The tree and symbols only, for the sidebar and small spaces. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-mark.svg"
      alt=""
      aria-hidden
      width={600}
      height={525}
      // Usually the first image on screen (top bar, sidebar, loading screen)
      loading="eager"
      unoptimized
      className={cn('h-auto w-10', className)}
    />
  );
}
