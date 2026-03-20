'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const ROLE_HOME: Record<string, string> = {
  administrador: '/admin/dashboard',
  staff: '/staff/dashboard',
  responsavel: '/responsavel/dashboard',
};

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(ROLE_HOME[user.role] ?? '/admin/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return null;
}
