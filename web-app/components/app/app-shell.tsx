'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV, ROLE_LABELS, type NavItem } from '@/lib/roles';
import { useAuth } from '@/lib/auth/auth-context';
import type { Role } from '@/lib/api/auth';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OfflineBanner } from '@/components/app/offline-banner';
import { InstallPrompt } from '@/components/app/install-prompt';
import { useSyncQueue } from '@/lib/offline/writes';

function isActive(item: NavItem, home: string, pathname: string): boolean {
  return item.href === home ? pathname === home : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

/**
 * Signing out reloads the page: hidden pages and forms that Next.js keeps alive would otherwise
 * stay in memory for the next person on a shared tablet. With writes still waiting to sync, it
 * asks first (they stay on the device until this person signs in again).
 */
function useLogout() {
  const { logout } = useAuth();
  const { writes } = useSyncQueue();
  const [confirming, setConfirming] = useState(false);
  const waiting = writes.filter((write) => !write.error).length;

  const signOut = () => {
    logout();
    window.location.replace('/login');
  };
  // Opened after the menu that triggered it has closed (Radix would close it straight away)
  const request = () => (waiting > 0 ? window.setTimeout(() => setConfirming(true), 0) : signOut());

  const dialog = (
    <Dialog open={confirming} onOpenChange={setConfirming}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Há registos por enviar</DialogTitle>
          <DialogDescription>
            {waiting === 1 ? '1 registo ainda não foi enviado' : `${waiting} registos ainda não foram enviados`}. Ficam guardados neste
            aparelho e são enviados quando voltar a entrar com a sua conta, com internet.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Continuar aqui
          </Button>
          <Button variant="destructive" onClick={signOut}>
            Terminar sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return { request, dialog };
}

/**
 * The signed-in frame: sidebar on laptops; on phones and tablets a top bar and a bottom
 * tab bar (the role's main sections), with everything else under "Mais".
 */
export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { request: logout, dialog: logoutDialog } = useLogout();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV[role];
  const home = items[0].href;
  const current = items.find((item) => isActive(item, home, pathname));
  const tabs = items.filter((item) => item.tab).slice(0, 4);

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar (laptops) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <Link href={home} className="flex items-center gap-3 px-5 py-5">
          <LogoMark className="w-11" />
          <div className="leading-tight">
            <p className="font-heading text-lg font-extrabold text-brand-earth">Sonho de Criança</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
        </Link>
        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = isActive(item, home, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      active && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="size-4.5 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {user && (
          <div className="border-t p-3">
            <UserMenu name={user.name} role={role} onLogout={logout} />
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (phones and tablets) */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Link href={home} aria-label="Início">
            <LogoMark className="w-9" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-bold">{current?.label ?? 'Sonho de Criança'}</h1>
          {user && <UserMenu name={user.name} role={role} onLogout={logout} compact />}
        </header>

        <OfflineBanner />
        <InstallPrompt />
        <main className="flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-10">{children}</main>

        {/* Bottom tab bar (phones and tablets) */}
        <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {tabs.map((item) => {
              const active = isActive(item, home, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-muted-foreground', active && 'text-green-text')}
                  >
                    <item.icon className="size-5" aria-hidden />
                    <span className="max-w-full truncate px-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger asChild>
                  <button type="button" className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-muted-foreground">
                    <Menu className="size-5" aria-hidden />
                    Mais
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <ul className="grid gap-1 overflow-y-auto px-4 pb-6">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn('flex h-12 items-center gap-3 rounded-lg px-3 font-medium hover:bg-accent', isActive(item, home, pathname) && 'bg-accent text-accent-foreground')}
                        >
                          <item.icon className="size-5" aria-hidden />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <button type="button" onClick={logout} className="flex h-12 w-full items-center gap-3 rounded-lg px-3 font-medium text-destructive hover:bg-berry-tint">
                        <LogOut className="size-5" aria-hidden />
                        Terminar sessão
                      </button>
                    </li>
                  </ul>
                </SheetContent>
              </Sheet>
            </li>
          </ul>
        </nav>
      </div>
      {logoutDialog}
    </div>
  );
}

function UserMenu({ name, role, onLogout, compact }: { name: string; role: Role; onLogout: () => void; compact?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn('h-auto gap-3 px-2 py-2', !compact && 'w-full justify-start')} aria-label="Menu da conta">
          <Avatar className="size-8">
            <AvatarFallback className="bg-teal-tint text-xs font-semibold text-teal-text">{initials(name)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="min-w-0 text-left leading-tight">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-medium">{name}</span>
          <span className="block text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
          <LogOut aria-hidden />
          Terminar sessão
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
