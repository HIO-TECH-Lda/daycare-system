'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Baby, LogOut, LayoutDashboard, Users, FileText, MessageCircle, Calendar, CreditCard, User, ClipboardCheck, School, UserCog, Receipt, Menu } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  mobile?: boolean;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  if (!user) return null;

  const responsavelNav: NavItem[] = [
    { title: 'Dashboard', href: '/responsavel/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { title: 'Mensagens', href: '/responsavel/mensagens', icon: <MessageCircle className="w-5 h-5" /> },
    { title: 'Eventos', href: '/responsavel/eventos', icon: <Calendar className="w-5 h-5" /> },
    // { title: 'Faturamento', href: '/responsavel/faturamento', icon: <CreditCard className="w-5 h-5" /> },
    { title: 'Perfil', href: '/responsavel/perfil', icon: <User className="w-5 h-5" /> },
  ];

  const staffNav: NavItem[] = [
    { title: 'Dashboard', href: '/staff/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { title: 'Presença', href: '/staff/presenca', icon: <ClipboardCheck className="w-5 h-5" /> },
    { title: 'Mensagens', href: '/staff/mensagens', icon: <MessageCircle className="w-5 h-5" /> },
  ];

  const adminNav: NavItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { title: 'Alunos', href: '/admin/alunos', icon: <Users className="w-5 h-5" /> },
    { title: 'Staff', href: '/admin/staff', icon: <UserCog className="w-5 h-5" /> },
    { title: 'Turmas', href: '/admin/turmas', icon: <School className="w-5 h-5" /> },
    // { title: 'Faturamento', href: '/admin/faturamento/visao-geral', icon: <Receipt className="w-5 h-5" /> },
    { title: 'Eventos', href: '/admin/eventos/gestao', icon: <Calendar className="w-5 h-5" /> },
    { title: 'Matrículas', href: '/admin/matriculas', icon: <FileText className="w-5 h-5" /> },
  ];

  const navItems = user.role === 'responsavel' ? responsavelNav : 
                   user.role === 'staff' ? staffNav : 
                   adminNav;

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Baby className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Creche Feliz</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t p-4">
        <div className="mb-3 rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ mobile }: SidebarProps) {
  const [open, setOpen] = useState(false);

  if (mobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-md hover:bg-gray-50"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return <SidebarContent />;
}

