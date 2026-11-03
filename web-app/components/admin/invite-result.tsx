'use client';

import { useState } from 'react';
import { Check, Copy, Mail, MessageCircle, TriangleAlert } from 'lucide-react';
import type { Delivery } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * How an invite (or password link) went out. When it reached no one (no WhatsApp consent, no
 * email, or sending failed), the link is shown to share by hand.
 */
export function InviteResult({ name, link, delivery, kind = 'invite' }: { name: string; link?: string; delivery?: Delivery; kind?: 'invite' | 'reset' }) {
  const [copied, setCopied] = useState(false);
  const sent = !!delivery && (delivery.email || delivery.whatsapp);
  const what = kind === 'invite' ? 'O convite' : 'O link para a nova palavra-passe';

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the field is selectable
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4">
      {sent ? (
        <p className="flex items-start gap-2 text-sm">
          {delivery!.whatsapp ? <MessageCircle className="mt-0.5 size-4 shrink-0 text-green-text" aria-hidden /> : <Mail className="mt-0.5 size-4 shrink-0 text-green-text" aria-hidden />}
          <span>
            {what} para <strong>{name}</strong> foi enviado por {[delivery!.whatsapp && 'WhatsApp', delivery!.email && 'email'].filter(Boolean).join(' e ')}.
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {what} para <strong>{name}</strong> não foi entregue (sem email, sem consentimento para WhatsApp, ou falha no envio). Partilhe o link de outra forma:
          </span>
        </p>
      )}
      {link && (
        <div className="flex gap-2">
          <Input readOnly value={link} aria-label="Link" className="h-11 min-w-0 flex-1 text-xs" onFocus={(event) => event.target.select()} />
          <Button type="button" variant="outline" className="h-11" onClick={() => void copy()}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      )}
      {link && kind === 'invite' && <p className="text-xs text-muted-foreground">O link vale 7 dias e só pode ser usado uma vez.</p>}
    </div>
  );
}
