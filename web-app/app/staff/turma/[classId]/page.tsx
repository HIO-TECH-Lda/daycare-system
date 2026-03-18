'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockChildren, mockClasses } from '@/lib/mock-data';
import { ArrowLeft, FileEdit, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function TurmaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  useEffect(() => {
    if (!loading && (!user || user.role !== 'staff')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  const classData = mockClasses.find(c => c.id === classId);
  const classChildren = mockChildren.filter(c => c.class_id === classId);

  if (!classData) return <div>Turma não encontrada</div>;

  const today = '2025-11-12';

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
        <p className="text-gray-600">
          {classChildren.length} crianças | {classData.min_age_months}-{classData.max_age_months} meses
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classChildren.map(child => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <img src={child.photo_url} alt={child.name} className="w-16 h-16 rounded-full object-cover" />
                <div className="flex-1">
                  <CardTitle className="text-lg">{child.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Nascimento: {new Date(child.birth_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(child.allergies && child.allergies !== 'Nenhuma') && (
                <div className="bg-red-50 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-red-900">Alergias</p>
                    <p className="text-red-700">{child.allergies}</p>
                  </div>
                </div>
              )}

              {(child.medications && child.medications !== 'Nenhum') && (
                <div className="bg-blue-50 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-blue-900">Medicações</p>
                  <p className="text-blue-700">{child.medications}</p>
                </div>
              )}

              <Link href={`/staff/relatorio/preencher/${child.id}/${today}`}>
                <Button className="w-full gap-2" size="sm">
                  <FileEdit className="w-4 h-4" />
                  Preencher Relatório
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
