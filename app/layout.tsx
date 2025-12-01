'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

function AppWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';
  const isPublicPage = pathname === '/' || isLoginPage;

  useEffect(() => {
    if (!loading && !user && !isPublicPage) {
      router.push('/login');
    }
  }, [user, loading, isPublicPage, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600 mx-auto"></div>
          <p className="text-sm text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show sidebar for authenticated users (except on login page)
  if (user && !isLoginPage) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        {/* Mobile Sidebar */}
        <div className="md:hidden">
          <Sidebar mobile />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="h-full p-4 sm:p-6 pt-16 md:pt-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Public pages (login, home)
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <AppWrapper>{children}</AppWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
