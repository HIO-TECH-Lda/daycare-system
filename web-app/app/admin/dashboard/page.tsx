'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { childrenApi, classesApi, invoicesApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';

export default function AdminDashboard() {
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: queryKeys.classes.list(),
    queryFn: async () => {
      const response = await classesApi.list();
      return response.data || [];
    },
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: queryKeys.invoices.list(),
    queryFn: async () => {
      const response = await invoicesApi.list();
      return response.data || [];
    },
  });

  const isLoading = childrenLoading || classesLoading || invoicesLoading;
  const totalChildren = children?.length || 0;
  const totalClasses = classes?.length || 0;
  const pendingInvoices = invoices?.filter(i => i.status === 'pending').length || 0;
  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0) || 0;

  return (
    <div className="max-w-6xl mx-auto w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{totalChildren}</p>
              <p className="text-sm text-gray-600">Crianças</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{totalClasses}</p>
              <p className="text-sm text-gray-600">Turmas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{pendingInvoices}</p>
              <p className="text-sm text-gray-600">Faturas Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">MZM {totalRevenue.toFixed(0)}</p>
              <p className="text-sm text-gray-600">Receita Paga</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Ocupação das Turmas</h3>
              <div className="space-y-3">
                {classes?.map(classItem => {
                  const enrolled = children?.filter(c => c.class_id === classItem.id).length || 0;
                  const percentage = classItem.capacity > 0 ? (enrolled / classItem.capacity) * 100 : 0;

                  return (
                    <div key={classItem.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-900">{classItem.name}</span>
                        <span className="text-sm text-gray-600">{enrolled}/{classItem.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Faturamento</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-900">Faturas Pagas</span>
                  <span className="text-lg font-bold text-green-700">
                    MZM {totalRevenue.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-gray-900">Faturas Pendentes</span>
                  <span className="text-lg font-bold text-yellow-700">
                    MZM {invoices?.filter(i => i.status === 'pending')
                      .reduce((sum, inv) => sum + inv.amount, 0)
                      .toFixed(2).replace('.', ',') || '0,00'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>
  );
}
