'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { childrenApi, staffAssignmentsApi, classesApi, attendanceApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export default function StaffDashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { data: staffAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: queryKeys.staffAssignments.list({ staff_id: user?.id }),
    queryFn: async () => {
      const response = await staffAssignmentsApi.list({ staff_id: user?.id });
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: queryKeys.classes.list(),
    queryFn: async () => {
      const response = await classesApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: queryKeys.attendance.list({ date: today }),
    queryFn: async () => {
      const response = await attendanceApi.list({ date: today });
      return response.data || [];
    },
    enabled: !!user,
  });

  const isLoading = assignmentsLoading || classesLoading || childrenLoading || attendanceLoading;
  const myAssignments = staffAssignments || [];
  const myClasses = classes?.filter(c => myAssignments.some(a => a.class_id === c.id)) || [];
  const myChildren = children?.filter(c => myAssignments.some(a => a.class_id === c.class_id)) || [];
  const presentToday = attendance?.filter(a => a.date === today && a.check_in).length || 0;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600 mx-auto"></div>
            <p className="text-sm text-gray-600">{messages.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {presentToday} de {myChildren.length} crianças presentes hoje
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
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

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Minhas Turmas</h2>
            <Link href="/staff/presenca" className="w-full sm:w-auto">
              <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto">
                <ClipboardCheck className="w-4 h-4" />
                Presença
              </Button>
            </Link>
          </div>

          {myClasses.map(classItem => {
            const classChildren = children?.filter(c => c.class_id === classItem.id) || [];

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
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                    {classChildren.map(child => (
                      <Link
                        key={child.id}
                        href={`/staff/relatorio/preencher/${child.id}/${today}`}
                        className="text-center"
                      >
                        <img
                          src={child.photo_url}
                          alt={child.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full mx-auto mb-1 sm:mb-2 object-cover border-2 border-gray-200"
                        />
                        <p className="text-xs font-medium text-gray-900 truncate px-1">{child.name}</p>
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
