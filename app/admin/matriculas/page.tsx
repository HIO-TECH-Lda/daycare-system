'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockChildren, mockClasses } from '@/lib/mock-data';
import { ArrowLeft, Plus, UserPlus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GestaoMatriculasPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'administrador')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Matrículas</h1>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Iniciar Nova Matrícula
          </Button>
        </div>

        <div className="space-y-4">
          {mockChildren.map(child => {
            const classData = mockClasses.find(c => c.id === child.class_id);

            return (
              <Card key={child.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <img src={child.photo_url} alt={child.name} className="w-16 h-16 rounded-full object-cover" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{classData?.name}</Badge>
                        <Badge className="bg-green-100 text-green-700">Matrícula Ativa</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Matriculado em: {new Date('2025-01-15').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Mudar Turma
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
