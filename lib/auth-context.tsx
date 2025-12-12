'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'responsavel@creche.com',
    name: 'Maria Silva',
    role: 'responsavel',
    phone: '(+258) 98765-4321',
  },
  {
    id: '2',
    email: 'staff@creche.com',
    name: 'Ana Santos',
    role: 'staff',
    phone: '(+258) 98765-1234',
  },
  {
    id: '3',
    email: 'admin@creche.com',
    name: 'João Oliveira',
    role: 'administrador',
    phone: '(+258) 98765-5678',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('daycare_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const foundUser = mockUsers.find(u => u.email === email);
    if (!foundUser) {
      throw new Error('Usuário não encontrado');
    }

    localStorage.setItem('daycare_user', JSON.stringify(foundUser));
    setUser(foundUser);
  };

  const logout = () => {
    localStorage.removeItem('daycare_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
