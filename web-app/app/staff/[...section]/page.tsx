import { SectionNotFound } from '@/components/app/section-not-found';

// Any address in this area that isn't a screen (the role's layout keeps the menu around it)
// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <SectionNotFound role="staff" />;
}
