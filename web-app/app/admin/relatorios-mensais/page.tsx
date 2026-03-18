'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monthlyReportsApi, childrenApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Eye, Calendar, Search } from 'lucide-react';

type MonthlyReport = {
  id: string;
  child_id: string;
  report_month: number;
  report_year: number;
  physical_development: string;
  cognitive_development: string;
  social_development: string;
  emotional_development: string;
  general_notes: string;
  achievements: string;
  areas_for_improvement: string;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  created_by: string;
  rejection_reason?: string;
};

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export default function AdminRelatoriosMensaisPage() {
  const queryClient = useQueryClient();
  
  const { data: reports = [], isLoading } = useQuery({
    queryKey: queryKeys.monthlyReports.list(),
    queryFn: async () => {
      const response = await monthlyReportsApi.list();
      return response.data || [];
    },
  });

  const { data: children = [] } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => monthlyReportsApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyReports.all });
      toast.success('Relatório validado com sucesso! Agora está disponível para os pais.');
      setViewOpen(false);
    },
    onError: () => toast.error('Erro ao validar relatório'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      monthlyReportsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyReports.all });
      toast.success('Relatório rejeitado. O staff será notificado para revisar.');
      setRejectOpen(false);
      setViewOpen(false);
      setRejectionReason('');
    },
    onError: () => toast.error('Erro ao rejeitar relatório'),
  });

  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'validated' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter(report => {
    const child = children.find(c => c.id === report.child_id);
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesSearch = !searchTerm || child?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleView = (report: MonthlyReport) => {
    setSelectedReport(report);
    setViewOpen(true);
  };

  const handleValidate = (reportId: string) => {
    validateMutation.mutate(reportId);
  };

  const handleReject = () => {
    if (selectedReport && rejectionReason.trim()) {
      rejectMutation.mutate({ id: selectedReport.id, reason: rejectionReason });
    }
  };

  const getStatusBadge = (status: MonthlyReport['status']) => {
    const variants: Record<MonthlyReport['status'], { label: string; className: string }> = {
      draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
      submitted: { label: 'Aguardando Validação', className: 'bg-blue-100 text-blue-700' },
      validated: { label: 'Validado', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-700' },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const submittedCount = reports.filter(r => r.status === 'submitted').length;
  const validatedCount = reports.filter(r => r.status === 'validated').length;
  const rejectedCount = reports.filter(r => r.status === 'rejected').length;

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Validação de Relatórios Mensais</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aguardando</p>
                  <p className="text-2xl font-bold text-blue-600">{submittedCount}</p>
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
                  <p className="text-sm text-gray-600">Validados</p>
                  <p className="text-2xl font-bold text-green-600">{validatedCount}</p>
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
                  <p className="text-sm text-gray-600">Rejeitados</p>
                  <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
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
                placeholder="Buscar por nome da criança..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'submitted' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('submitted')}
              size="sm"
            >
              Aguardando
            </Button>
            <Button
              variant={statusFilter === 'validated' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('validated')}
              size="sm"
            >
              Validados
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('rejected')}
              size="sm"
            >
              Rejeitados
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-gray-600">{messages.loading}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Nenhum relatório encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map(report => {
            const child = children.find(c => c.id === report.child_id);
            const monthLabel = months.find(m => m.value === report.month)?.label || '';
            
            return (
              <Card key={report.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {child?.name || 'Criança não encontrada'}
                        </h3>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{monthLabel} {report.year}</span>
                        </div>
                      {report.rejection_reason && (
                        <span className="text-xs text-red-600">
                          Motivo: {report.rejection_reason}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(report)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalhes
                    </Button>
                    {report.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report);
                            setRejectOpen(true);
                          }}
                          className="gap-2 text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleValidate(report.id)}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Validar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

      </div>

      {/* View Report Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Relatório Mensal - {selectedReport && children.find(c => c.id === selectedReport.child_id)?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {months.find(m => m.value === selectedReport.month)?.label} {selectedReport.year}
                </span>
                {getStatusBadge(selectedReport.status)}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Desenvolvimento Físico</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.physical_development || 'Não informado'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Desenvolvimento Cognitivo</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.cognitive_development || 'Não informado'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Desenvolvimento Social</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.social_development || 'Não informado'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Desenvolvimento Emocional</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.emotional_development || 'Não informado'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Conquistas</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.achievements || 'Não informado'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Áreas para Melhoria</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.areas_for_improvement || 'Não informado'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Notas Gerais</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.general_notes || 'Não informado'}
                  </p>
                </div>

                {selectedReport.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <Label className="text-sm font-semibold text-red-900 mb-2 block">Motivo da Rejeição</Label>
                    <p className="text-sm text-red-800">{selectedReport.rejection_reason}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewOpen(false)}>
                  Fechar
                </Button>
                {selectedReport.status === 'submitted' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setViewOpen(false);
                        setRejectOpen(true);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Rejeitar
                    </Button>
                    <Button onClick={() => handleValidate(selectedReport.id)} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Validar Relatório
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Por favor, informe o motivo da rejeição. O staff será notificado para revisar o relatório.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">Motivo da Rejeição *</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Informações incompletas, necessário mais detalhes sobre desenvolvimento físico..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectOpen(false);
              setRejectionReason('');
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

