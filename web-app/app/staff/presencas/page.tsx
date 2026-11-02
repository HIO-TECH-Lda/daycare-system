import type { Metadata } from 'next';
import { AttendanceBoard } from '@/components/staff/attendance-board';

export const metadata: Metadata = { title: 'Presenças' };

export default function Page() {
  return <AttendanceBoard />;
}
