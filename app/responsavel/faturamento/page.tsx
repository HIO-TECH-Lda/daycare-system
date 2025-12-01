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
    <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Faturamento</h1>

        <div className="space-y-3 sm:space-y-4">
          {myInvoices.map(invoice => {
            const child = mockChildren.find(c => c.id === invoice.child_id);
            return (
              <Card key={invoice.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        invoice.status === 'pago' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        {invoice.status === 'pago' ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                            Fatura {invoice.id.slice(-6)}
                          </h3>
                          <Badge variant={invoice.status === 'pago' ? 'default' : 'secondary'} className="text-xs">
                            {invoice.status === 'pago' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 mb-1">{child?.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Vencimento: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Emissão: {new Date(invoice.issue_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right sm:flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
                        MZM {invoice.amount.toFixed(2).replace('.', ',')}
                      </p>
                      <Button size="sm" className="w-full sm:w-auto">
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
