import { StaffToday } from '@/components/staff/staff-today';

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <StaffToday />;
}
