'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockChildren, mockDailyReports, mockAttendance, mockMessages } from '@/lib/mock-data';
import { Calendar, FileText, MessageCircle, CreditCard, User, SmilePlus, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ResponsavelDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'responsavel')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  }

  if (!user) return null;

  const myChildren = mockChildren.filter(c => c.parent_id === user.id);
  const unreadMessages = mockMessages.filter(m => m.receiver_id === user.id && !m.read).length;

  const getChildReport = (childId: string) => {
    const report = mockDailyReports.find(r => r.child_id === childId && r.report_date === '2025-11-12');
    const attendance = mockAttendance.find(a => a.child_id === childId && a.attendance_date === '2025-11-12');
    return { report, attendance };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo, {user.name}!</h1>
          <p className="text-gray-600 mt-1">Acompanhe aqui o dia a dia dos seus pequenos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/responsavel/mensagens" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900">{unreadMessages}</p>
                  <p className="text-sm text-gray-600">Mensagens não lidas</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/responsavel/eventos" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900">3</p>
                  <p className="text-sm text-gray-600">Próximos eventos</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/responsavel/faturamento" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900">2</p>
                  <p className="text-sm text-gray-600">Faturas pendentes</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Minhas Crianças</h2>

          {myChildren.map(child => {
            const { report, attendance } = getChildReport(child.id);

            return (
              <Card key={child.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-start gap-4">
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-xl">{child.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>Idade: {calculateAge(child.birth_date)}</span>
                        {attendance?.check_in_time && (
                          <Badge variant="outline" className="bg-white">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                            Presente
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <Link href={`/responsavel/relatorio/${child.id}`}>
                      <Button size="sm" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Ver Rotina
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                {report && (
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <SmilePlus className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Humor do dia</p>
                          <p className="text-lg font-semibold text-gray-900">{report.mood}</p>
                        </div>
                      </div>

                      {attendance && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Horários</p>
                            <p className="text-sm text-gray-900">
                              Entrada: {attendance.check_in_time}
                              {attendance.check_out_time && ` | Saída: ${attendance.check_out_time}`}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-900 mb-2">Resumo do Dia</p>
                        <p className="text-sm text-blue-800">{report.summary_note}</p>
                      </div>
                    </div>
                  </CardContent>
                )}

                {!report && (
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Ainda não há relatório para hoje</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/responsavel/mensagens" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Mensagens</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/responsavel/eventos" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Calendário</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/responsavel/faturamento" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <CreditCard className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm font-medium">Faturamento</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/responsavel/perfil" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <User className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Perfil</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const today = new Date();
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

  if (months < 12) {
    return `${months} meses`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }

  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
}
