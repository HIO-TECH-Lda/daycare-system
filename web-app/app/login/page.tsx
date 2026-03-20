'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby } from 'lucide-react';
import { messages } from '@/lib/messages';

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
      // After successful login, the auth context will have the user
      // We'll redirect based on role in a useEffect or let the layout handle it
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : messages.auth.invalidCredentials;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Baby className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Sonho de Criança Centro Infantil</CardTitle>
          <CardDescription>Faça login para continuar</CardDescription>
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
                autoComplete="username"
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
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? messages.auth.loggingIn : messages.auth.login}
            </Button>
          </form>

          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
            <p className="font-medium text-gray-700">Contas demo <span className="text-gray-500 font-normal">(senha: Demo@2026)</span></p>
            <div className="space-y-1">
              <p className="text-gray-500 font-medium uppercase tracking-wide" style={{fontSize: '10px'}}>Administrador</p>
              <button
                type="button"
                onClick={() => { setEmail('admin@sonhodecrianca.mz'); setPassword('Demo@2026'); }}
                className="text-green-700 hover:text-green-900 hover:underline block text-left"
              >
                admin@sonhodecrianca.mz
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-gray-500 font-medium uppercase tracking-wide" style={{fontSize: '10px'}}>Staff</p>
              <button
                type="button"
                onClick={() => { setEmail('maria@sonhodecrianca.mz'); setPassword('Demo@2026'); }}
                className="text-green-700 hover:text-green-900 hover:underline block text-left"
              >
                maria@sonhodecrianca.mz
              </button>
              <button
                type="button"
                onClick={() => { setEmail('joao@sonhodecrianca.mz'); setPassword('Demo@2026'); }}
                className="text-green-700 hover:text-green-900 hover:underline block text-left"
              >
                joao@sonhodecrianca.mz
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-gray-500 font-medium uppercase tracking-wide" style={{fontSize: '10px'}}>Responsável</p>
              <button
                type="button"
                onClick={() => { setEmail('ana.silva@demo.com'); setPassword('Demo@2026'); }}
                className="text-green-700 hover:text-green-900 hover:underline block text-left"
              >
                ana.silva@demo.com
              </button>
              <button
                type="button"
                onClick={() => { setEmail('carlos.santos@demo.com'); setPassword('Demo@2026'); }}
                className="text-green-700 hover:text-green-900 hover:underline block text-left"
              >
                carlos.santos@demo.com
              </button>
              <button
                type="button"
                onClick={() => { setEmail('patricia.oliveira@demo.com'); setPassword('Demo@2026'); }}
                className="text-green-700 hover:text-green-900 hover:underline block text-left"
              >
                patricia.oliveira@demo.com
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
