'use client';

import { Button } from '@/components/ui/button';

export function ReloadButton() {
  return (
    <Button size="touch" onClick={() => window.location.reload()}>
      Tentar de novo
    </Button>
  );
}
