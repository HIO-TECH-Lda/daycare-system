'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockChildren, mockStaffAssignments, mockClasses, mockAttendance } from '@/lib/mock-data';
import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export default function StaffDashboard() {
  const myAssignments = mockStaffAssignments.filter(sa => sa.staff_id === '2');
  const myClasses = mockClasses.filter(c => myAssignments.some(a => a.class_id === c.id));
  const myChildren = mockChildren.filter(c => myAssignments.some(a => a.class_id === c.class_id));

  const today = '2025-11-12';
  const presentToday = mockAttendance.filter(a => a.attendance_date === today && a.check_in_time).length;

  return (
    <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            {presentToday} de {myChildren.length} crianças presentes hoje
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{myChildren.length}</p>
              <p className="text-sm text-gray-600">Crianças</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{presentToday}</p>
              <p className="text-sm text-gray-600">Presentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{myClasses.length}</p>
              <p className="text-sm text-gray-600">Turmas</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Minhas Turmas</h2>
            <Link href="/staff/presenca">
              <Button size="sm" variant="outline" className="gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Presença
              </Button>
            </Link>
          </div>

          {myClasses.map(classItem => {
            const classChildren = mockChildren.filter(c => c.class_id === classItem.id);

            return (
              <Card key={classItem.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{classItem.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {classChildren.length} crianças
                      </p>
                    </div>
                    <Link href={`/staff/turma/${classItem.id}`}>
                      <Button size="sm" variant="outline">Ver Turma</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {classChildren.map(child => (
                      <Link
                        key={child.id}
                        href={`/staff/relatorio/preencher/${child.id}/${today}`}
                        className="text-center"
                      >
                        <img
                          src={child.photo_url}
                          alt={child.name}
                          className="w-14 h-14 rounded-full mx-auto mb-2 object-cover border-2 border-gray-200"
                        />
                        <p className="text-xs font-medium text-gray-900 truncate">{child.name}</p>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
  );
}
