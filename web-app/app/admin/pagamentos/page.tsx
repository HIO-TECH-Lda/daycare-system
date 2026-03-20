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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, childrenApi, invoicesApi, usersApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
import { Plus, Search, Calendar, DollarSign, FileText, Download, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

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

export default function PagamentosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [formData, setFormData] = useState({
    invoice_id: '',
    parent_id: '',
    child_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as Payment['payment_method'],
    payment_method_details: '',
    reference_number: '',
    notes: '',
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: queryKeys.payments.list(),
    queryFn: async () => {
      const response = await paymentsApi.list();
      return (response.data || []) as Payment[];
    },
  });

  const { data: children = [] } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: queryKeys.invoices.list(),
    queryFn: async () => {
      const response = await invoicesApi.list();
      return response.data || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const response = await usersApi.list({ role: 'responsavel' });
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof paymentsApi.create>[0]) => paymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      toast.success(messages.success.created);
      setOpen(false);
      setFormData({
        invoice_id: '', parent_id: '', child_id: '', amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash', payment_method_details: '', reference_number: '', notes: '',
      });
    },
    onError: () => toast.error('Erro ao registrar pagamento'),
  });

  const filteredPayments = payments.filter(payment => {
    const child = children.find(c => c.id === payment.child_id);
    const matchesSearch = !searchTerm || 
      child?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || payment.payment_method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const todayAmount = payments
    .filter(p => p.payment_date === new Date().toISOString().split('T')[0])
    .reduce((sum, p) => sum + p.amount, 0);
  const thisMonthAmount = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const handleOpenDialog = () => {
    setFormData({
      invoice_id: '',
      parent_id: '',
      child_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      payment_method_details: '',
      reference_number: '',
      notes: '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      invoice_id: formData.invoice_id || undefined,
      parent_id: formData.parent_id,
      child_id: formData.child_id,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      payment_method: formData.payment_method as Parameters<typeof paymentsApi.create>[0]['payment_method'],
      payment_method_details: formData.payment_method_details || undefined,
      reference_number: formData.reference_number || undefined,
      notes: formData.notes || undefined,
    });
  };

  const getPaymentMethodLabel = (method: Payment['payment_method']) => {
    return paymentMethods.find(m => m.value === method)?.label || method;
  };

  const getPaymentMethodBadge = (method: Payment['payment_method']) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-700',
      card: 'bg-yellow-100 text-yellow-700',
      bank_transfer: 'bg-blue-100 text-blue-700',
      check: 'bg-purple-100 text-purple-700',
      mobile_money: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return <Badge className={colors[method] || 'bg-gray-100 text-gray-700'}>{getPaymentMethodLabel(method)}</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Registro de Pagamentos</h1>
        <div className="flex gap-2">
          <Link href="/admin/pagamentos/relatorios">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </Button>
          </Link>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Registrar Pagamento
          </Button>
        </div>
      </div>

      {/* Stats */}
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
              placeholder="Buscar por criança, responsável ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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

      {/* Payments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-gray-600">{messages.loading}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Nenhum pagamento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map(payment => {
            const child = children.find(c => c.id === payment.child_id);
            const invoice = payment.invoice_id ? invoices.find(i => i.id === payment.invoice_id) : null;
          
          return (
            <Card key={payment.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {child?.name || 'Criança não encontrada'}
                      </h3>
                      {getPaymentMethodBadge(payment.payment_method)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Criança:</strong> {child?.name || 'Não encontrado'}</p>
                      <p><strong>Data:</strong> {new Date(payment.payment_date).toLocaleDateString('pt-BR')}</p>
                      <p><strong>Valor:</strong> MZM {payment.amount.toFixed(2).replace('.', ',')}</p>
                      {payment.reference_number && (
                        <p><strong>Referência:</strong> {payment.reference_number}</p>
                      )}
                      {invoice && (
                        <p><strong>Fatura:</strong> #{invoice.id.slice(-6)}</p>
                      )}
                      {payment.payment_method_details && (
                        <p><strong>Detalhes:</strong> {payment.payment_method_details}</p>
                      )}
                      {payment.notes && (
                        <p className="text-xs text-gray-500 mt-2">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      MZM {payment.amount.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Registrado em {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }))
        }

        {filteredPayments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhum pagamento encontrado.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Novo Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="invoice" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invoice">Com Fatura</TabsTrigger>
                <TabsTrigger value="standalone">Pagamento Avulso</TabsTrigger>
              </TabsList>
              
              <TabsContent value="invoice" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_id">Fatura *</Label>
                  <Select
                    value={formData.invoice_id}
                    onValueChange={(value) => {
                      const invoice = invoices.find(i => i.id === value);
                      if (invoice) {
                        setFormData({
                          ...formData,
                          invoice_id: value,
                          parent_id: invoice.parent_id,
                          child_id: invoice.child_id,
                          amount: invoice.amount.toString(),
                        });
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a fatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices
                        .filter(inv => inv.status === 'pending')
                        .map((invoice) => {
                          const child = children.find(c => c.id === invoice.child_id);
                          return (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {child?.name} - MZM {invoice.amount.toFixed(2)} - Venc: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="standalone" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent_id">Responsável *</Label>
                    <Select
                      value={formData.parent_id}
                      onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="child_id">Criança *</Label>
                    <Select
                      value={formData.child_id}
                      onValueChange={(value) => setFormData({ ...formData, child_id: value })}
                      required
                      disabled={!formData.parent_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a criança" />
                      </SelectTrigger>
                      <SelectContent>
                        {children
                          .filter(c => c.parent_id === formData.parent_id)
                          .map((child) => (
                            <SelectItem key={child.id} value={child.id}>
                              {child.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

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
                <Label htmlFor="payment_date">Data do Pagamento *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pagamento *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value as Payment['payment_method'] })}
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
                placeholder="Ex: TRF-2025-1103-001, REC-001, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais sobre o pagamento"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Pagamento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

