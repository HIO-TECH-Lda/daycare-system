'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockClasses, mockChildren } from '@/lib/mock-data';
import { ArrowLeft, Plus, Users, Edit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GestaoTurmasPage() {
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
    <div className="max-w-6xl mx-auto w-full">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Turmas</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Nova Turma
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockClasses.map(classItem => {
          const enrolled = mockChildren.filter(c => c.class_id === classItem.id).length;
          const percentage = (enrolled / classItem.capacity) * 100;

          return (
            <Card key={classItem.id}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="flex items-center justify-between">
                  <span>{classItem.name}</span>
                  <Button size="sm" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {enrolled} / {classItem.capacity} crianças
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-600">Ocupação</span>
                    <span className="font-semibold text-gray-900">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 pt-2 border-t">
                  <p>Idade: {classItem.min_age_months}-{classItem.max_age_months} meses</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
