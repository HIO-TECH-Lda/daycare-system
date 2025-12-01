'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      if (email.includes('responsavel')) {
        router.push('/responsavel/dashboard');
      } else if (email.includes('staff')) {
        router.push('/staff/dashboard');
      } else if (email.includes('admin')) {
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Baby className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Bem-vindo</CardTitle>
            <CardDescription>Sistema de Gestão de Creche</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm space-y-2">
            <p className="font-medium text-blue-900">Contas de demonstração:</p>
            <div className="space-y-1 text-blue-700">
              <p><strong>Responsável:</strong> responsavel@daycare.com</p>
              <p><strong>Staff:</strong> staff@daycare.com</p>
              <p><strong>Admin:</strong> admin@daycare.com</p>
              <p className="text-xs mt-2 text-blue-600">Senha: qualquer valor</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
