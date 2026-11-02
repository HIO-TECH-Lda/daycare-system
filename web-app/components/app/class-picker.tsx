'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { ClassInfo } from '@/lib/api/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const KEY = 'sdc.staff.class';
const listeners = new Set<() => void>();

function readStored(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * The class an educator is working with, remembered on the device across screens. Falls back
 * to their first class; null while the classes load or when they have none.
 */
export function useSelectedClass(classes: ClassInfo[] | undefined): [string | null, (id: string) => void] {
  const stored = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readStored,
    () => null
  );
  const select = useCallback((id: string) => {
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // Not remembered: this screen still switches
    }
    listeners.forEach((listener) => listener());
  }, []);
  const selected = classes?.some((item) => item._id === stored) ? stored : (classes?.[0]?._id ?? null);
  return [selected, select];
}

/** Class switcher, shown only to educators with more than one class. */
export function ClassPicker({ classes, value, onChange }: { classes: ClassInfo[]; value: string | null; onChange: (id: string) => void }) {
  if (classes.length < 2 || !value) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 min-w-44 rounded-full bg-card font-semibold" aria-label="Turma">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {classes.map((item) => (
          <SelectItem key={item._id} value={item._id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
