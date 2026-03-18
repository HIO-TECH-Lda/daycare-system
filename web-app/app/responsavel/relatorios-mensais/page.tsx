'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { monthlyReportsApi, childrenApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { useAuth } from '@/lib/auth-context';
import { Calendar, Eye, Download, CheckCircle2 } from 'lucide-react';

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
  validated_at?: string;
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

// Mock data - only validated reports visible to parents
const mockMonthlyReports: MonthlyReport[] = [
  {
    id: 'mr-2',
    child_id: 'child-2',
    report_month: 10,
    report_year: 2025,
    physical_development: 'Sofia está desenvolvendo habilidades motoras finas com destreza. Consegue usar tesoura com segurança.',
    cognitive_development: 'Demonstra excelente memória e capacidade de concentração. Consegue seguir instruções complexas.',
    social_development: 'É uma líder natural, ajuda os colegas e resolve conflitos de forma pacífica.',
    emotional_development: 'Muito empática e expressiva. Consegue identificar emoções em si mesma e nos outros.',
    general_notes: 'Sofia continua sendo uma criança exemplar. Seu desenvolvimento está acima da média para sua idade.',
    achievements: 'Aprendeu a ler palavras simples, melhorou habilidades de escrita e desenvolveu interesse por ciências.',
    areas_for_improvement: 'Trabalhar a moderação - às vezes se empolga demais e precisa aprender a esperar sua vez.',
    status: 'validated',
    validated_at: '2025-11-05T10:30:00',
  },
];

export default function RelatoriosMensaisPage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Get parent's children
  const myChildren = mockChildren.filter(c => c.parent_id === user?.id);
  
  // Get validated reports for parent's children
  const validatedReports = mockMonthlyReports.filter(report => {
    const child = mockChildren.find(c => c.id === report.child_id);
    const isMyChild = child && child.parent_id === user?.id;
    const matchesFilter = selectedChild === 'all' || report.child_id === selectedChild;
    return report.status === 'validated' && isMyChild && matchesFilter;
  });

  const handleView = (report: MonthlyReport) => {
    setSelectedReport(report);
    setViewOpen(true);
  };

  const handleDownload = (report: MonthlyReport) => {
    // In real app, generate PDF
    alert('Funcionalidade de download será implementada em breve.');
  };

  const getChildName = (childId: string) => {
    return mockChildren.find(c => c.id === childId)?.name || 'Criança não encontrada';
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Relatórios Mensais</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="sm:w-64">
            <Label htmlFor="child_filter">Filtrar por Criança</Label>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger id="child_filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Crianças</SelectItem>
                {myChildren.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-gray-600">{messages.loading}</p>
          </div>
        ) : validatedReports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2">
                {selectedChild === 'all'
                  ? 'Nenhum relatório mensal validado disponível ainda.'
                  : 'Nenhum relatório mensal validado para esta criança.'}
              </p>
              <p className="text-sm text-gray-500">
                Os relatórios mensais validados pelos administradores aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {validatedReports.map(report => {
              const monthLabel = months.find(m => m.value === report.month)?.label || '';
              const childName = children.find(c => c.id === report.child_id)?.name || 'Criança não encontrada';
              
              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{childName}</h3>
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Validado
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{months.find(m => m.value === report.month)?.label || ''} {report.year}</span>
                          </div>
                          {report.validated_at && (
                            <span className="text-xs text-gray-500">
                              Validado em: {new Date(report.validated_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 text-sm text-gray-700">
                          <p className="line-clamp-2">
                            {report.general_notes || 'Relatório mensal de desenvolvimento da criança.'}
                          </p>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(report)}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Report Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Relatório Mensal - {selectedReport && getChildName(selectedReport.child_id)}
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {months.find(m => m.value === selectedReport.month)?.label} {selectedReport.year}
                </span>
                <Badge className="bg-green-100 text-green-700 ml-auto">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Validado
                </Badge>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-blue-900 mb-2 block">Desenvolvimento Físico</Label>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {selectedReport.physical_development || 'Não informado'}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-purple-900 mb-2 block">Desenvolvimento Cognitivo</Label>
                  <p className="text-sm text-purple-800 whitespace-pre-wrap">
                    {selectedReport.cognitive_development || 'Não informado'}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-green-900 mb-2 block">Desenvolvimento Social</Label>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">
                    {selectedReport.social_development || 'Não informado'}
                  </p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-yellow-900 mb-2 block">Desenvolvimento Emocional</Label>
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap">
                    {selectedReport.emotional_development || 'Não informado'}
                  </p>
                </div>

                <div className="bg-green-100 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-green-900 mb-2 block">✨ Conquistas</Label>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">
                    {selectedReport.achievements || 'Não informado'}
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-orange-900 mb-2 block">📈 Áreas para Melhoria</Label>
                  <p className="text-sm text-orange-800 whitespace-pre-wrap">
                    {selectedReport.areas_for_improvement || 'Não informado'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-gray-900 mb-2 block">Notas Gerais</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedReport.general_notes || 'Não informado'}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDownload(selectedReport)} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button onClick={() => setViewOpen(false)}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

