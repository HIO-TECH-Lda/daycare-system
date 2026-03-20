'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, expenseCategoriesApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
import { Plus, Search, Calendar, DollarSign, TrendingDown, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

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

export default function DespesasPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as Expense['payment_method'],
    payment_method_details: '',
    reference_number: '',
    supplier_name: '',
    notes: '',
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: queryKeys.expenses.list(),
    queryFn: async () => {
      const response = await expensesApi.list();
      return (response.data || []) as Expense[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.expenseCategories.list(),
    queryFn: async () => {
      const response = await expenseCategoriesApi.list();
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { category_id: string; description: string; amount: number; expense_date: string; vendor?: string }) =>
      expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      toast.success(messages.success.created);
    },
    onError: () => toast.error('Erro ao registrar despesa'),
  });

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || expense.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const todayAmount = expenses
    .filter(e => e.expense_date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + e.amount, 0);
  const thisMonthAmount = expenses
    .filter(e => {
      const expenseDate = new Date(e.expense_date);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const handleOpenDialog = () => {
    setFormData({
      category_id: '',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      payment_method_details: '',
      reference_number: '',
      supplier_name: '',
      notes: '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        category_id: formData.category_id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        vendor: formData.supplier_name || undefined,
      });
      setOpen(false);
      setFormData({
        category_id: '', description: '', amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash', payment_method_details: '', reference_number: '',
        supplier_name: '', notes: '',
      });
    } catch {
      // error handled by mutation onError
    }
  };

  const getPaymentMethodLabel = (method: Expense['payment_method']) => {
    return paymentMethods.find(m => m.value === method)?.label || method;
  };

  const getPaymentMethodBadge = (method: Expense['payment_method']) => {
    const colors = {
      cash: 'bg-green-100 text-green-700',
      bank_transfer: 'bg-blue-100 text-blue-700',
      check: 'bg-purple-100 text-purple-700',
      mobile_money: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return <Badge className={colors[method]}>{getPaymentMethodLabel(method)}</Badge>;
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Categoria não encontrada';
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestão de Despesas</h1>
        <div className="flex gap-2">
          <Link href="/admin/despesas/relatorios">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </Button>
          </Link>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Registrar Despesa
          </Button>
        </div>
      </div>

      {/* Stats */}
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
                <p className="text-sm text-gray-600">Este Mês</p>
                <p className="text-2xl font-bold text-gray-900">
                  MZM {thisMonthAmount.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-gray-900">
                  MZM {todayAmount.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por descrição, fornecedor ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-64">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-64">
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Métodos</SelectItem>
              {paymentMethods.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expenses List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-600">{messages.loading}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map(expense => {
            const category = categories.find(c => c.id === expense.category_id);
          
          return (
            <Card key={expense.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {expense.description}
                      </h3>
                      <Badge variant="outline">{category?.name || 'Categoria'}</Badge>
                      {getPaymentMethodBadge(expense.payment_method)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Data:</strong> {new Date(expense.expense_date).toLocaleDateString('pt-BR')}</p>
                      {expense.supplier_name && (
                        <p><strong>Fornecedor:</strong> {expense.supplier_name}</p>
                      )}
                      {expense.reference_number && (
                        <p><strong>Referência:</strong> {expense.reference_number}</p>
                      )}
                      {expense.payment_method_details && (
                        <p><strong>Detalhes:</strong> {expense.payment_method_details}</p>
                      )}
                      {expense.notes && (
                        <p className="text-xs text-gray-500 mt-2">{expense.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      MZM {expense.amount.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Registrado em {new Date(expense.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredExpenses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhuma despesa encontrada.</p>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* Record Expense Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Compra de material escolar, Pagamento de salários, etc."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (MZM) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_date">Data da Despesa *</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_name">Fornecedor</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="Nome do fornecedor ou loja"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pagamento *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value as Expense['payment_method'] })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.payment_method === 'bank_transfer' || formData.payment_method === 'mobile_money' || formData.payment_method === 'other') && (
              <div className="space-y-2">
                <Label htmlFor="payment_method_details">Detalhes do Método</Label>
                <Input
                  id="payment_method_details"
                  value={formData.payment_method_details}
                  onChange={(e) => setFormData({ ...formData, payment_method_details: e.target.value })}
                  placeholder="Ex: Banco Millennium BIM, M-Pesa, etc."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reference_number">Número de Referência</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Ex: REC-001, TRF-2025-1103-001, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais sobre a despesa"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Despesa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

