import { LogoMark } from '@/components/brand/logo';

/** Full-page wait (checking the session, loading a role's area). */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="A carregar">
      <LogoMark className="w-14 animate-pulse" />
    </div>
  );
}
