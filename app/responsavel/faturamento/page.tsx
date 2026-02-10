'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi, paymentsApi, childrenApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { CheckCircle2, Clock, History, DollarSign } from 'lucide-react';

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'check', label: 'Cheque' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'other', label: 'Outro' },
];

export default function FaturamentoPage() {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const myInvoices = mockInvoices.filter(i => i.parent_id === user?.id);
  
  const getInvoicePayments = (invoiceId: string) => {
    return mockPayments.filter(p => p.invoice_id === invoiceId);
  };

  const getTotalPaid = (invoiceId: string) => {
    return getInvoicePayments(invoiceId).reduce((sum, p) => sum + p.amount, 0);
  };

  const handleViewHistory = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    setHistoryOpen(true);
  };

  const getPaymentMethodLabel = (method: string) => {
    return paymentMethods.find(m => m.value === method)?.label || method;
  };

  const totalPaid = myInvoices.reduce((sum, inv) => sum + getTotalPaid(inv.id), 0);
  const totalPending = myInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + (inv.amount - getTotalPaid(inv.id)), 0);

  if (invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-600">{messages.loading}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Faturamento e Pagamentos</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pago</p>
                <p className="text-2xl font-bold text-green-600">
                  MZM {totalPaid.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  MZM {totalPending.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="payments">Histórico de Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {myInvoices.map(invoice => {
            const child = mockChildren.find(c => c.id === invoice.child_id);
            const payments = getInvoicePayments(invoice.id);
            const paidAmount = getTotalPaid(invoice.id);
            const remaining = invoice.amount - paidAmount;
            
            return (
              <Card key={invoice.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        invoice.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        {invoice.status === 'paid' ? (
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
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 mb-1">{child?.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Vencimento: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Emissão: {new Date(invoice.issue_date).toLocaleDateString('pt-BR')}
                        </p>
                        {payments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600">
                              Pago: MZM {paidAmount.toFixed(2).replace('.', ',')} de MZM {invoice.amount.toFixed(2).replace('.', ',')}
                            </p>
                            {remaining > 0 && (
                              <p className="text-xs text-yellow-600">
                                Restante: MZM {remaining.toFixed(2).replace('.', ',')}
                              </p>
                            )}
                            {payments.length > 0 && (
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${(paidAmount / invoice.amount) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right sm:flex-shrink-0 space-y-2">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        MZM {invoice.amount.toFixed(2).replace('.', ',')}
                      </p>
                      {payments.length > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full sm:w-auto gap-2"
                          onClick={() => handleViewHistory(invoice.id)}
                        >
                          <History className="w-4 h-4" />
                          Ver Pagamentos
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {myInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma fatura encontrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Criança</TableHead>
                        <TableHead>Fatura</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myInvoices.flatMap(invoice => {
                        const payments = getInvoicePayments(invoice.id);
                        const child = children.find(c => c.id === invoice.child_id);
                        return payments.map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="font-medium">{child?.name || 'N/A'}</TableCell>
                            <TableCell>#{invoice.id.slice(-6)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getPaymentMethodLabel(payment.payment_method)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {payment.reference_number || '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              MZM {payment.amount.toFixed(2).replace('.', ',')}
                            </TableCell>
                          </TableRow>
                        ));
                      })}
                      {myInvoices.every(inv => getInvoicePayments(inv.id).length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nenhum pagamento registrado ainda.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Pagamentos</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {(() => {
                const invoice = myInvoices.find(i => i.id === selectedInvoice);
                const payments = getInvoicePayments(selectedInvoice);
                const child = mockChildren.find(c => c.id === invoice?.child_id);
                const paidAmount = getTotalPaid(selectedInvoice);
                
                return (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Fatura #{invoice?.id.slice(-6)}</p>
                      <p className="font-semibold text-lg">{child?.name}</p>
                      <div className="mt-2 flex justify-between text-sm">
                        <span>Valor Total:</span>
                        <span className="font-semibold">MZM {invoice?.amount.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Pago:</span>
                        <span className="font-semibold text-green-600">MZM {paidAmount.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {invoice && (invoice.amount - paidAmount) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Restante:</span>
                          <span className="font-semibold text-yellow-600">
                            MZM {(invoice.amount - paidAmount).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>

                    {payments.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Nenhum pagamento registrado para esta fatura.</p>
                    ) : (
                      <div className="space-y-3">
                        {payments.map((payment) => (
                          <Card key={payment.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{getPaymentMethodLabel(payment.payment_method)}</Badge>
                                    <span className="text-sm text-gray-600">
                                      {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  {payment.reference_number && (
                                    <p className="text-xs text-gray-500">Ref: {payment.reference_number}</p>
                                  )}
                                  {payment.payment_method_details && (
                                    <p className="text-xs text-gray-500">{payment.payment_method_details}</p>
                                  )}
                                  {payment.notes && (
                                    <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                                  )}
                                </div>
                                <p className="text-lg font-bold text-green-600">
                                  MZM {payment.amount.toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setHistoryOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
