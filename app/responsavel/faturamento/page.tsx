'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockInvoices, mockChildren } from '@/lib/mock-data';
import { CheckCircle2, Clock } from 'lucide-react';

export default function FaturamentoPage() {
  const { user } = useAuth();
  const myInvoices = mockInvoices.filter(i => i.parent_id === user?.id);

  return (
    <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Faturamento</h1>

        <div className="space-y-4">
          {myInvoices.map(invoice => {
            const child = mockChildren.find(c => c.id === invoice.child_id);
            return (
              <Card key={invoice.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        invoice.status === 'pago' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        {invoice.status === 'pago' ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Clock className="w-6 h-6 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Fatura {invoice.id.slice(-6)}
                          </h3>
                          <Badge variant={invoice.status === 'pago' ? 'default' : 'secondary'}>
                            {invoice.status === 'pago' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-1">{child?.name}</p>
                        <p className="text-sm text-gray-500">
                          Vencimento: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-sm text-gray-500">
                          Emissão: {new Date(invoice.issue_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        MZM {invoice.amount.toFixed(2).replace('.', ',')}
                      </p>
                      <Button size="sm" className="mt-2">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
    </div>
  );
}
