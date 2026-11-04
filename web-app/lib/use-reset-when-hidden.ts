'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Next.js keeps recently visited pages alive (hidden) to preserve their state. Forms with
 * passwords or one-off messages must not keep it: `reset` runs when the page is hidden, so
 * coming back (or the next person on a shared tablet) finds an empty form.
 */
export function useResetWhenHidden(reset: () => void): void {
  const latest = useRef(reset);
  useLayoutEffect(() => {
    latest.current = reset;
  });
  useLayoutEffect(() => () => latest.current(), []);
}
