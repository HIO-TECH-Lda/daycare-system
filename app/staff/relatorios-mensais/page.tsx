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
import { childrenApi, monthlyReportsApi, staffAssignmentsApi, classesApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
import { Plus, Edit, Save, Send, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

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
};

// Mock monthly reports data
const mockMonthlyReports: MonthlyReport[] = [
  {
    id: 'mr-1',
    child_id: 'child-1',
    report_month: 10,
    report_year: 2025,
    physical_development: 'Lucas demonstrou grande progresso na coordenação motora. Consegue subir escadas alternando os pés e está melhorando o equilíbrio.',
    cognitive_development: 'Mostra interesse crescente por histórias e consegue identificar cores básicas. Está desenvolvendo habilidades de contagem até 5.',
    social_development: 'Interage bem com os colegas, compartilha brinquedos e participa ativamente das atividades em grupo.',
    emotional_development: 'Expressa suas emoções de forma mais clara e está aprendendo a lidar melhor com frustrações.',
    general_notes: 'Lucas teve um mês muito produtivo. Sua participação nas atividades aumentou significativamente.',
    achievements: 'Aprendeu a amarrar os sapatos, melhorou a comunicação verbal e desenvolveu novas amizades.',
    areas_for_improvement: 'Continuar trabalhando a paciência durante atividades que requerem mais tempo.',
    status: 'submitted',
  },
];

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

export default function RelatoriosMensaisPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<MonthlyReport[]>(mockMonthlyReports);
  const [open, setOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<MonthlyReport | null>(null);
  const [formData, setFormData] = useState({
    child_id: '',
    report_month: new Date().getMonth() + 1,
    report_year: new Date().getFullYear(),
    physical_development: '',
    cognitive_development: '',
    social_development: '',
    emotional_development: '',
    general_notes: '',
    achievements: '',
    areas_for_improvement: '',
  });

  const assignedChildren = children.filter(child => 
    staffAssignments.some(a => a.class_id === child.class_id)
  );

  const handleOpenDialog = (report?: MonthlyReport) => {
    if (report) {
      setEditingReport(report);
      setFormData({
        child_id: report.child_id,
        report_month: report.month,
        report_year: report.year,
        physical_development: report.physical_development,
        cognitive_development: report.cognitive_development,
        social_development: report.social_development,
        emotional_development: report.emotional_development,
        general_notes: report.general_notes,
        achievements: report.achievements,
        areas_for_improvement: report.areas_for_improvement,
      });
    } else {
      setEditingReport(null);
      setFormData({
        child_id: '',
        report_month: new Date().getMonth() + 1,
        report_year: new Date().getFullYear(),
        physical_development: '',
        cognitive_development: '',
        social_development: '',
        emotional_development: '',
        general_notes: '',
        achievements: '',
        areas_for_improvement: '',
      });
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, submitType: 'draft' | 'submit' = 'draft') => {
    e.preventDefault();
    try {
      const reportData = {
        child_id: formData.child_id,
        month: formData.report_month,
        year: formData.report_year,
        status: submitType === 'submit' ? 'submitted' : 'draft',
        physical_development: formData.physical_development,
        cognitive_development: formData.cognitive_development,
        social_development: formData.social_development,
        emotional_development: formData.emotional_development,
        general_notes: formData.general_notes,
        achievements: formData.achievements,
        areas_for_improvement: formData.areas_for_improvement,
      };

      if (editingReport) {
        await updateMutation.mutateAsync({ id: editingReport.id, data: reportData });
      } else {
        await createMutation.mutateAsync(reportData);
      }
      setOpen(false);
      setEditingReport(null);
    } catch (error) {
      toast.error('Erro ao salvar relatório');
    }
  };

  const getStatusBadge = (status: MonthlyReport['status']) => {
    const variants: Record<MonthlyReport['status'], { label: string; className: string }> = {
      draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
      submitted: { label: 'Enviado', className: 'bg-blue-100 text-blue-700' },
      validated: { label: 'Validado', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-700' },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Relatórios Mensais</h1>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Relatório Mensal
        </Button>
      </div>

      <div className="space-y-4">
        {reports.map(report => {
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
                        <span>{monthLabel} {report.report_year}</span>
                      </div>
                      {report.status === 'draft' && (
                        <span className="text-xs text-gray-500">Rascunho - não visível para pais</span>
                      )}
                      {report.status === 'submitted' && (
                        <span className="text-xs text-blue-600">Aguardando validação do administrador</span>
                      )}
                      {report.status === 'validated' && (
                        <span className="text-xs text-green-600">Visível para os pais</span>
                      )}
                      {report.status === 'rejected' && (
                        <span className="text-xs text-red-600">Rejeitado - requer revisão</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(report.status === 'draft' || report.status === 'rejected') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(report)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {reports.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhum relatório mensal criado ainda.</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeiro Relatório
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'Editar Relatório Mensal' : 'Novo Relatório Mensal'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="child_id">Criança *</Label>
                <Select
                  value={formData.child_id}
                  onValueChange={(value) => setFormData({ ...formData, child_id: value })}
                  required
                  disabled={!!editingReport}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a criança" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedChildren.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report_month">Mês *</Label>
                <Select
                  value={formData.report_month.toString()}
                  onValueChange={(value) => setFormData({ ...formData, report_month: parseInt(value) })}
                  required
                  disabled={!!editingReport}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report_year">Ano *</Label>
                <Input
                  id="report_year"
                  type="number"
                  value={formData.report_year}
                  onChange={(e) => setFormData({ ...formData, report_year: parseInt(e.target.value) })}
                  required
                  disabled={!!editingReport}
                  min="2020"
                  max="2100"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Áreas de Desenvolvimento</h3>
              
              <div className="space-y-2">
                <Label htmlFor="physical_development">Desenvolvimento Físico</Label>
                <Textarea
                  id="physical_development"
                  value={formData.physical_development}
                  onChange={(e) => setFormData({ ...formData, physical_development: e.target.value })}
                  placeholder="Descreva o progresso físico da criança (coordenação motora, habilidades motoras, etc.)"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cognitive_development">Desenvolvimento Cognitivo</Label>
                <Textarea
                  id="cognitive_development"
                  value={formData.cognitive_development}
                  onChange={(e) => setFormData({ ...formData, cognitive_development: e.target.value })}
                  placeholder="Descreva o progresso cognitivo (aprendizado, raciocínio, memória, etc.)"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_development">Desenvolvimento Social</Label>
                <Textarea
                  id="social_development"
                  value={formData.social_development}
                  onChange={(e) => setFormData({ ...formData, social_development: e.target.value })}
                  placeholder="Descreva o progresso social (interação com colegas, comunicação, etc.)"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emotional_development">Desenvolvimento Emocional</Label>
                <Textarea
                  id="emotional_development"
                  value={formData.emotional_development}
                  onChange={(e) => setFormData({ ...formData, emotional_development: e.target.value })}
                  placeholder="Descreva o progresso emocional (expressão de sentimentos, autocontrole, etc.)"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Informações Gerais</h3>
              
              <div className="space-y-2">
                <Label htmlFor="achievements">Conquistas</Label>
                <Textarea
                  id="achievements"
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  placeholder="Liste as principais conquistas da criança durante o mês"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="areas_for_improvement">Áreas para Melhoria</Label>
                <Textarea
                  id="areas_for_improvement"
                  value={formData.areas_for_improvement}
                  onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                  placeholder="Identifique áreas que precisam de mais atenção ou desenvolvimento"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="general_notes">Notas Gerais</Label>
                <Textarea
                  id="general_notes"
                  value={formData.general_notes}
                  onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                  placeholder="Observações adicionais sobre o desenvolvimento da criança"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, 'draft')}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
              <Button type="button" onClick={(e) => handleSubmit(e, 'submit')}>
                <Send className="w-4 h-4 mr-2" />
                Enviar para Validação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

