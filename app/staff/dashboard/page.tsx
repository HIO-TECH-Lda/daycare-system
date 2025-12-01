'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockChildren, mockStaffAssignments, mockClasses, mockAttendance } from '@/lib/mock-data';
import { Users, FileText, MessageCircle, ClipboardCheck, FileEdit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StaffDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'staff')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  const myAssignments = mockStaffAssignments.filter(sa => sa.staff_id === user.id);
  const myClasses = mockClasses.filter(c => myAssignments.some(a => a.class_id === c.id));
  const myChildren = mockChildren.filter(c => myAssignments.some(a => a.class_id === c.class_id));

  const today = '2025-11-12';
  const presentToday = mockAttendance.filter(a => a.attendance_date === today && a.check_in_time).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo, {user.name}!</h1>
          <p className="text-gray-600 mt-1">Gerencie suas turmas e atividades diárias</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myChildren.length}</p>
                <p className="text-sm text-gray-600">Crianças Atribuídas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{presentToday}</p>
                <p className="text-sm text-gray-600">Presentes Hoje</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myClasses.length}</p>
                <p className="text-sm text-gray-600">Turmas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Minhas Turmas</h2>
            <Link href="/staff/presenca">
              <Button className="gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Registrar Presença
              </Button>
            </Link>
          </div>

          {myClasses.map(classItem => {
            const classChildren = mockChildren.filter(c => c.class_id === classItem.id);

            return (
              <Card key={classItem.id}>
                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl">{classItem.name}</h3>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                        {classChildren.length} crianças | {classItem.min_age_months}-{classItem.max_age_months} meses
                      </p>
                    </div>
                    <Link href={`/staff/turma/${classItem.id}`}>
                      <Button size="sm">Ver Turma</Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {classChildren.slice(0, 8).map(child => (
                      <Link
                        key={child.id}
                        href={`/staff/relatorio/preencher/${child.id}/${today}`}
                        className="block"
                      >
                        <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <img
                            src={child.photo_url}
                            alt={child.name}
                            className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 border-white shadow-sm"
                          />
                          <p className="text-sm font-medium text-gray-900 truncate">{child.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Link href="/staff/presenca">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Presença</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/staff/mensagens">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Mensagens</p>
              </CardContent>
            </Card>
          </Link>

          <Link href={myChildren[0] ? `/staff/relatorio/preencher/${myChildren[0].id}/${today}` : '#'}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <FileEdit className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Preencher Relatório</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
