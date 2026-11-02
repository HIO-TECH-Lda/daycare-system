import type { Metadata } from 'next';
import { ClassRoster } from '@/components/staff/class-roster';

export const metadata: Metadata = { title: 'Turma' };

export default function Page() {
  return <ClassRoster />;
}
