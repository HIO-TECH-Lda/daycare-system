import type { Metadata } from 'next';
import { AttendanceBoard } from '@/components/staff/attendance-board';

export const metadata: Metadata = { title: 'Presenças' };

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <AttendanceBoard />;
}
