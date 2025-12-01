'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockChildren, mockClasses, mockInvoices } from '@/lib/mock-data';
import { Users, School, CreditCard, TrendingUp, Baby, FileText, Calendar, UserCog } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'administrador')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  const totalChildren = mockChildren.length;
  const totalClasses = mockClasses.length;
  const pendingInvoices = mockInvoices.filter(i => i.status === 'pendente').length;
  const paidInvoices = mockInvoices.filter(i => i.status === 'pago').length;
  const totalRevenue = mockInvoices.filter(i => i.status === 'pago').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-600 mt-1">Bem-vindo, {user.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Baby className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalChildren}</p>
                  <p className="text-sm text-gray-600">Crianças</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <School className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalClasses}</p>
                  <p className="text-sm text-gray-600">Turmas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{pendingInvoices}</p>
                  <p className="text-sm text-gray-600">Faturas Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">R$ {totalRevenue.toFixed(0)}</p>
                  <p className="text-sm text-gray-600">Receita Paga</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Ocupação das Turmas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockClasses.map(classItem => {
                  const enrolled = mockChildren.filter(c => c.class_id === classItem.id).length;
                  const percentage = (enrolled / classItem.capacity) * 100;

                  return (
                    <div key={classItem.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{classItem.name}</span>
                        <span className="text-sm text-gray-600">{enrolled}/{classItem.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status de Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-900">Faturas Pagas</p>
                    <p className="text-2xl font-bold text-green-700">{paidInvoices}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Faturas Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-700">{pendingInvoices}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-yellow-600">
                      R$ {mockInvoices.filter(i => i.status === 'pendente')
                        .reduce((sum, inv) => sum + inv.amount, 0)
                        .toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/admin/alunos" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Gestão de Alunos</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/staff" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <UserCog className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Gestão de Staff</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/turmas" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <School className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Gestão de Turmas</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/faturamento/visao-geral" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <CreditCard className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm font-medium">Faturamento</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/eventos/gestao" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-red-600" />
                <p className="text-sm font-medium">Gestão de Eventos</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/matriculas" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                <p className="text-sm font-medium">Matrículas</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
