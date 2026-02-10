'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { childrenApi, dailyReportsApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PreencherRelatorioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;

  const [mood, setMood] = useState('Feliz');
  const [summaryNote, setSummaryNote] = useState('');
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'staff')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const queryClient = useQueryClient();
  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: queryKeys.children.detail(childId),
    queryFn: async () => {
      const response = await childrenApi.get(childId);
      return response.data;
    },
    enabled: !!childId && !!user,
  });

  const createReportMutation = useMutation({
    mutationFn: (data: any) => dailyReportsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyReports.all });
      toast.success(messages.success.created);
      router.push('/staff/dashboard');
    },
  });

  if (loading || childLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">{messages.loading}</div>;
  if (!user) return null;
  if (!child) return <div>Criança não encontrada</div>;

  const addActivity = (type: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setActivities([...activities, { type, time, data: {} }]);
  };

  const handleSubmit = async () => {
    const date = params.date as string;
    try {
      await createReportMutation.mutateAsync({
        child_id: childId,
        date,
        mood,
        notes: summaryNote,
        activities: activities.map(a => a.type),
      });
    } catch (error) {
      toast.error('Erro ao salvar relatório');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full">


        <div className="flex items-center gap-4 mb-6">
          <img src={child.photo_url} alt={child.name} className="w-16 h-16 rounded-full object-cover" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
            <p className="text-gray-600">Preencher Relatório Diário</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Humor do Dia</Label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feliz">Feliz</SelectItem>
                    <SelectItem value="Calmo">Calmo</SelectItem>
                    <SelectItem value="Agitado">Agitado</SelectItem>
                    <SelectItem value="Choroso">Choroso</SelectItem>
                    <SelectItem value="Sonolento">Sonolento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resumo do Dia</Label>
                <Textarea
                  placeholder="Descreva como foi o dia da criança..."
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atividades do Dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => addActivity('feeding')} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Alimentação
                </Button>
                <Button onClick={() => addActivity('nap')} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Soneca
                </Button>
                <Button onClick={() => addActivity('diaper')} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Troca de Fralda
                </Button>
                <Button onClick={() => addActivity('pedagogical')} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Atividade Pedagógica
                </Button>
              </div>

              {activities.length > 0 && (
                <div className="space-y-4 mt-6">
                  {activities.map((activity, index) => (
                    <Card key={index} className="bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">
                              {activity.type === 'feeding' && 'Alimentação'}
                              {activity.type === 'nap' && 'Soneca'}
                              {activity.type === 'diaper' && 'Troca de Fralda'}
                              {activity.type === 'pedagogical' && 'Atividade Pedagógica'}
                            </h4>
                            <Input type="time" value={activity.time} className="w-32" />
                          </div>

                          {activity.type === 'feeding' && (
                            <>
                              <Input placeholder="Item (ex: Mamadeira)" />
                              <Input placeholder="Quantidade (ex: 180ml)" />
                            </>
                          )}

                          {activity.type === 'nap' && (
                            <Input type="number" placeholder="Duração em minutos" />
                          )}

                          {activity.type === 'diaper' && (
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Condição" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Normal">Normal</SelectItem>
                                <SelectItem value="Diarreia">Diarreia</SelectItem>
                                <SelectItem value="Constipação">Constipação</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          {activity.type === 'pedagogical' && (
                            <Textarea placeholder="Descrição da atividade" rows={2} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/staff/dashboard')}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar Relatório
            </Button>
          </div>
        </div>
    </div>
  );
}
