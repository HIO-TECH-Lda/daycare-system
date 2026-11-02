import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { ReloadButton } from './reload-button';

export const metadata: Metadata = { title: 'Sem internet' };

/** Shown by the service worker when a page that isn't on the device can't load offline. */
export default function OfflinePage() {
  return (
    <div className="grid gap-4 text-center">
      <WifiOff className="mx-auto size-10 text-sun-text" aria-hidden />
      <h1 className="font-heading text-2xl font-extrabold">Sem internet</h1>
      <p className="text-sm text-muted-foreground">
        Esta página ainda não está guardada neste aparelho. As páginas que já abriu, como as Presenças, continuam a funcionar.
      </p>
      <ReloadButton />
    </div>
  );
}
