'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Not in TypeScript's DOM types yet (Chromium only)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'sdc.install-dismissed';
const ASK_AGAIN_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

function recentlyDismissed(): boolean {
  try {
    return Date.now() - Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0) < ASK_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

// iPhone and iPad Safari can't prompt: they need "Partilhar → Adicionar ao ecrã principal"
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/**
 * Suggests adding the portal to the home screen (tablets and phones; laptops on Chrome/Edge).
 * Hidden once installed, and for 30 days after "not now".
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    // Deferred so the hint isn't set synchronously during the effect
    const timer = window.setTimeout(() => setShowIosHint(isIosSafari()), 0);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Storage unavailable: asks again next time
    }
    setInstallEvent(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'dismissed') dismiss();
    setInstallEvent(null);
  };

  if (!installEvent && !showIosHint) return null;

  return (
    <div className="flex items-center gap-3 border-b bg-green-tint px-4 py-2 text-sm text-green-text sm:px-6 lg:px-10">
      {installEvent ? <Download className="size-4 shrink-0" aria-hidden /> : <Share className="size-4 shrink-0" aria-hidden />}
      <p className="flex-1">
        {installEvent
          ? 'Instale o portal neste aparelho para o abrir como uma aplicação, mesmo sem internet.'
          : 'Para instalar: toque em Partilhar e depois em "Adicionar ao ecrã principal".'}
      </p>
      {installEvent && (
        <Button size="sm" className="h-8" onClick={() => void install()}>
          Instalar
        </Button>
      )}
      <Button size="icon" variant="ghost" className="size-8 text-green-text" onClick={dismiss} aria-label="Agora não">
        <X aria-hidden />
      </Button>
    </div>
  );
}
