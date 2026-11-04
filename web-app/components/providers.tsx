'use client';

import { useEffect, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SerwistProvider } from '@serwist/turbopack/react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { ApiRequestError } from '@/lib/api/client';
import { persistOptions, saveOfflineDataNow } from '@/lib/offline/persist';
import { OfflineSync } from '@/components/app/offline-sync';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Queries restored from the device (meta.offline) must outlive the persisted copy
        gcTime: persistOptions.maxAge,
        // Don't retry what won't change by retrying (not found, forbidden, validation)
        retry: (failures, error) =>
          failures < 2 && !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500)
      }
    }
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  // Save the offline data as the app is hidden or closed, not only on the persister's timer
  useEffect(() => {
    const save = () => saveOfflineDataNow(queryClient);
    const onHidden = () => document.visibilityState === 'hidden' && save();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', save);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', save);
    };
  }, [queryClient]);
  return (
    // The service worker only runs in production builds (in development it would cache stale code)
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV !== 'production'} reloadOnOnline={false}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthProvider>
          <OfflineSync />
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-center" />
          </TooltipProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SerwistProvider>
  );
}
