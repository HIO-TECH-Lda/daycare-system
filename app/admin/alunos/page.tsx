'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockChildren, mockClasses } from '@/lib/mock-data';
import { ArrowLeft, Plus, Search, Edit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GestaoAlunosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'administrador')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  const filteredChildren = mockChildren.filter(child =>
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Alunos</h1>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Novo Aluno
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredChildren.map(child => {
            const classData = mockClasses.find(c => c.id === child.class_id);
            return (
              <Card key={child.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <img src={child.photo_url} alt={child.name} className="w-16 h-16 rounded-full object-cover" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge>{classData?.name}</Badge>
                        <span className="text-sm text-gray-600">
                          Nascimento: {new Date(child.birth_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {child.allergies && child.allergies !== 'Nenhuma' && (
                        <p className="text-sm text-red-600 mt-1">⚠️ Alergia: {child.allergies}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Edit className="w-4 h-4" />
                      Editar
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
