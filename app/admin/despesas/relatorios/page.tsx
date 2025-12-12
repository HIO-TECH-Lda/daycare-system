'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockExpenses, mockExpenseCategories } from '@/lib/mock-data';
import { Download, Calendar, DollarSign, TrendingDown, PieChart } from 'lucide-react';

type Expense = {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  supplier_name?: string;
  notes?: string;
  receipt_url?: string;
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

export default function RelatoriosDespesasPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  // In real app, fetch expenses from database based on filters
  let filteredExpenses = mockExpenses;

  if (startDate) {
    filteredExpenses = filteredExpenses.filter(e => e.expense_date >= startDate);
  }
  if (endDate) {
    filteredExpenses = filteredExpenses.filter(e => e.expense_date <= endDate);
  }
  if (filterCategory !== 'all') {
    filteredExpenses = filteredExpenses.filter(e => e.category_id === filterCategory);
  }
  if (filterMethod !== 'all') {
    filteredExpenses = filteredExpenses.filter(e => e.payment_method === filterMethod);
  }

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = filteredExpenses.length;

  // Group by category
  const byCategory = filteredExpenses.reduce((acc, e) => {
    const category = mockExpenseCategories.find(c => c.id === e.category_id);
    const categoryName = category?.name || 'Desconhecido';
    if (!acc[categoryName]) {
      acc[categoryName] = { count: 0, amount: 0 };
    }
    acc[categoryName].count++;
    acc[categoryName].amount += e.amount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  // Group by payment method
  const byMethod = filteredExpenses.reduce((acc, e) => {
    acc[e.payment_method] = (acc[e.payment_method] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleExport = () => {
    // In real app, generate CSV/PDF report
    alert('Funcionalidade de exportação será implementada em breve.');
  };

  const getPaymentMethodLabel = (method: string) => {
    return paymentMethods.find(m => m.value === method)?.label || method;
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Relatórios de Despesas</h1>
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
              <Label htmlFor="category_filter">Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger id="category_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {mockExpenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  MZM {totalAmount.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Número de Despesas</p>
                <p className="text-2xl font-bold text-gray-900">{expenseCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Média por Despesa</p>
                <p className="text-2xl font-bold text-gray-900">
                  MZM {expenseCount > 0 ? (totalAmount / expenseCount).toFixed(2).replace('.', ',') : '0,00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byCategory)
              .sort((a, b) => b[1].amount - a[1].amount)
              .map(([category, data]) => {
                const percentage = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : '0';
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{category}</span>
                      <span className="text-gray-600">
                        MZM {data.amount.toFixed(2).replace('.', ',')} ({percentage}%) - {data.count} despesa{data.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Por Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byMethod).map(([method, amount]) => {
              const methodLabel = getPaymentMethodLabel(method);
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

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Nenhuma despesa encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => {
                    const category = mockExpenseCategories.find(c => c.id === expense.category_id);
                    
                    return (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {expense.supplier_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPaymentMethodLabel(expense.payment_method)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {expense.reference_number || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          MZM {expense.amount.toFixed(2).replace('.', ',')}
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
    </div>
  );
}

