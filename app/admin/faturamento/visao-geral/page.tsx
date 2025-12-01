'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockInvoices, mockChildren } from '@/lib/mock-data';
import { ArrowLeft, Plus, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FaturamentoVisaoGeralPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'administrador')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Faturamento</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Gerar Nova Fatura
        </Button>
      </div>

      <div className="space-y-4">
        {mockInvoices.map(invoice => {
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
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Fatura #{invoice.id.slice(-6)}
                        </h3>
                        <Badge variant={invoice.status === 'pago' ? 'default' : 'secondary'}>
                          {invoice.status === 'pago' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-1">{child?.name}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>Emissão: {new Date(invoice.issue_date).toLocaleDateString('pt-BR')}</p>
                        <p>Vencimento: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      MZM {invoice.amount.toFixed(2).replace('.', ',')}
                    </p>
                    <Button size="sm" className="mt-2">Ver Detalhes</Button>
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
