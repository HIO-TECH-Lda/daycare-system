'use client';

import { Card, CardContent } from '@/components/ui/card';
import { mockChildren, mockClasses, mockInvoices } from '@/lib/mock-data';

export default function AdminDashboard() {
  const totalChildren = mockChildren.length;
  const totalClasses = mockClasses.length;
  const pendingInvoices = mockInvoices.filter(i => i.status === 'pendente').length;
  const totalRevenue = mockInvoices.filter(i => i.status === 'pago').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                {mockClasses.map(classItem => {
                  const enrolled = mockChildren.filter(c => c.class_id === classItem.id).length;
                  const percentage = (enrolled / classItem.capacity) * 100;

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
                    MZM {mockInvoices.filter(i => i.status === 'pendente')
                      .reduce((sum, inv) => sum + inv.amount, 0)
                      .toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>
  );
}
