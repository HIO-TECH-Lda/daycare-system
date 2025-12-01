'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockStaffAssignments, mockClasses } from '@/lib/mock-data';
import { ArrowLeft, Plus, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const mockStaff = [
  { id: '2', name: 'Ana Santos', email: 'ana@creche.com', phone: '(+258) 98765-1234' },
  { id: '7', name: 'Carlos Lima', email: 'carlos@creche.com', phone: '(+258) 98765-5555' },
];

export default function GestaoStaffPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Staff</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Novo Staff
        </Button>
      </div>

      <div className="space-y-4">
        {mockStaff.map(staff => {
          const assignments = mockStaffAssignments.filter(sa => sa.staff_id === staff.id);
          const assignedClasses = mockClasses.filter(c => assignments.some(a => a.class_id === c.id));

          return (
            <Card key={staff.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{staff.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{staff.email}</p>
                    <p className="text-sm text-gray-600">{staff.phone}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm text-gray-700">Turmas:</span>
                      {assignedClasses.map(c => (
                        <Badge key={c.id} variant="outline">{c.name}</Badge>
                      ))}
                    </div>
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

    </div>
  );
}
