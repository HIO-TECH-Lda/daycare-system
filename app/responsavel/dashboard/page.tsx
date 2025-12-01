'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockChildren, mockDailyReports, mockAttendance, mockMessages } from '@/lib/mock-data';
import { FileText, CheckCircle2, SmilePlus } from 'lucide-react';
import Link from 'next/link';

export default function ResponsavelDashboard() {
  const myChildren = mockChildren.filter(c => c.parent_id === '1');
  const unreadMessages = mockMessages.filter(m => m.receiver_id === '1' && !m.read).length;

  const getChildReport = (childId: string) => {
    const report = mockDailyReports.find(r => r.child_id === childId && r.report_date === '2025-11-12');
    const attendance = mockAttendance.find(a => a.child_id === childId && a.attendance_date === '2025-11-12');
    return { report, attendance };
  };

  return (
    <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {unreadMessages > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Você tem {unreadMessages} mensagem{unreadMessages > 1 ? 's' : ''} não lida{unreadMessages > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {myChildren.map(child => {
            const { report, attendance } = getChildReport(child.id);

            return (
              <Card key={child.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{child.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">Idade: {calculateAge(child.birth_date)}</span>
                        {attendance?.check_in_time && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Presente
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link href={`/responsavel/relatorio/${child.id}`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Ver Rotina
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                {report && (
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <SmilePlus className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 mb-1">Humor: {report.mood}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{report.summary_note}</p>
                      </div>
                    </div>
                  </CardContent>
                )}

                {!report && (
                  <CardContent>
                    <p className="text-sm text-gray-500 text-center py-2">Ainda não há relatório para hoje</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
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
