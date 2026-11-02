import type { Metadata } from 'next';
import { ClassRoster } from '@/components/staff/class-roster';

export const metadata: Metadata = { title: 'Turma' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <ClassRoster />;
}
