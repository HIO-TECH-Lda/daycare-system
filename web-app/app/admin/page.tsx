import { RoleHome } from '@/components/app/role-home';

// The page renders in the browser (the session lives there): opt out of instant-navigation checks
export const instant = false;

export default function Page() {
  return <RoleHome role="administrador" />;
}
