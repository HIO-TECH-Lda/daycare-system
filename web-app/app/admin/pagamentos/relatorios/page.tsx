'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockPayments, mockChildren, mockUsers, mockInvoices } from '@/lib/mock-data';
import { Download, Calendar, DollarSign, TrendingUp } from 'lucide-react';

type Payment = {
  id: string;
  invoice_id?: string;
  parent_id: string;
  child_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
};

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'check', label: 'Cheque' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'other', label: 'Outro' },
];

export default function RelatoriosPagamentosPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterChild, setFilterChild] = useState<string>('all');

  // In real app, fetch payments from database based on filters
  let filteredPayments = mockPayments;

  if (startDate) {
    filteredPayments = filteredPayments.filter(p => p.payment_date >= startDate);
  }
  if (endDate) {
    filteredPayments = filteredPayments.filter(p => p.payment_date <= endDate);
  }
  if (filterMethod !== 'all') {
    filteredPayments = filteredPayments.filter(p => p.payment_method === filterMethod);
  }
  if (filterChild !== 'all') {
    filteredPayments = filteredPayments.filter(p => p.child_id === filterChild);
  }

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const paymentCount = filteredPayments.length;

  // Group by payment method
  const byMethod = filteredPayments.reduce((acc, p) => {
    acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  // Group by child
  const byChild = filteredPayments.reduce((acc, p) => {
    const child = mockChildren.find(c => c.id === p.child_id);
    const childName = child?.name || 'Desconhecido';
    if (!acc[childName]) {
      acc[childName] = { count: 0, amount: 0 };
    }
    acc[childName].count++;
    acc[childName].amount += p.amount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  const handleExport = () => {
    // In real app, generate CSV/PDF report
    alert('Funcionalidade de exportação será implementada em breve.');
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Relatórios de Pagamentos</h1>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inicial</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Final</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method_filter">Método</Label>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger id="method_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="child_filter">Criança</Label>
              <Select value={filterChild} onValueChange={setFilterChild}>
                <SelectTrigger id="child_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {mockChildren.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Recebido</p>
                <p className="text-2xl font-bold text-gray-900">
                  MZM {totalAmount.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Número de Pagamentos</p>
                <p className="text-2xl font-bold text-gray-900">{paymentCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Média por Pagamento</p>
                <p className="text-2xl font-bold text-gray-900">
                  MZM {paymentCount > 0 ? (totalAmount / paymentCount).toFixed(2).replace('.', ',') : '0,00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Por Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byMethod).map(([method, amount]) => {
              const methodLabel = paymentMethods.find(m => m.value === method)?.label || method;
              const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{methodLabel}</span>
                    <span className="text-gray-600">
                      MZM {amount.toFixed(2).replace('.', ',')} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Criança</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Nenhum pagamento encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => {
                    const child = mockChildren.find(c => c.id === payment.child_id);
                    const parent = mockUsers.find(u => u.id === payment.parent_id);
                    const methodLabel = paymentMethods.find(m => m.value === payment.payment_method)?.label || payment.payment_method;
                    
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">{child?.name || 'N/A'}</TableCell>
                        <TableCell>{parent?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{methodLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {payment.reference_number || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          MZM {payment.amount.toFixed(2).replace('.', ',')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* By Child Summary */}
      {Object.keys(byChild).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo por Criança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criança</TableHead>
                    <TableHead className="text-right">Nº Pagamentos</TableHead>
                    <TableHead className="text-right">Total Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(byChild)
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([childName, data]) => (
                      <TableRow key={childName}>
                        <TableCell className="font-medium">{childName}</TableCell>
                        <TableCell className="text-right">{data.count}</TableCell>
                        <TableCell className="text-right font-semibold">
                          MZM {data.amount.toFixed(2).replace('.', ',')}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

