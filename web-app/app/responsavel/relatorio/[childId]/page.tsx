'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { childrenApi, dailyReportsApi, reportPhotosApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { Utensils, Moon, Baby, BookOpen, SmilePlus, Image as ImageIcon } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ChildReportPage() {
  const params = useParams();
  const childId = params.childId as string;
  const today = new Date().toISOString().split('T')[0];

  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: queryKeys.children.detail(childId),
    queryFn: async () => {
      const response = await childrenApi.get(childId);
      return response.data;
    },
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: queryKeys.dailyReports.list({ child_id: childId, date: today }),
    queryFn: async () => {
      const response = await dailyReportsApi.list({ child_id: childId, date: today });
      return response.data || [];
    },
    enabled: !!childId,
  });

  const report = reports[0];
  
  const { data: photos = [] } = useQuery({
    queryKey: queryKeys.reportPhotos.byReport(report?.id || ''),
    queryFn: async () => {
      if (!report?.id) return [];
      const response = await reportPhotosApi.getByReport(report.id);
      return response.data || [];
    },
    enabled: !!report?.id,
  });


  if (childLoading || reportsLoading) return <div className="flex items-center justify-center h-64">{messages.loading}</div>;
  if (!child) return <div>Criança não encontrada</div>;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'feeding':
        return <Utensils className="w-5 h-5" />;
      case 'nap':
        return <Moon className="w-5 h-5" />;
      case 'diaper':
        return <Baby className="w-5 h-5" />;
      case 'pedagogical':
        return <BookOpen className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'feeding':
        return 'Alimentação';
      case 'nap':
        return 'Soneca';
      case 'diaper':
        return 'Troca de Fralda';
      case 'pedagogical':
        return 'Atividade Pedagógica';
      default:
        return type;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'feeding':
        return 'bg-orange-100 text-orange-700';
      case 'nap':
        return 'bg-purple-100 text-purple-700';
      case 'diaper':
        return 'bg-blue-100 text-blue-700';
      case 'pedagogical':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={child.photo_url}
              alt={child.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{child.name}</h1>
              <p className="text-sm text-gray-600">Rotina Diária - {new Date(today).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {report ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <SmilePlus className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Humor do Dia</p>
                    <p className="text-lg font-semibold text-gray-900">{report.mood || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{report.notes || report.summary_note || 'Nenhuma nota'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Atividades do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.activities && report.activities.length > 0 ? (
                    report.activities.map((activityName, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-700`}>
                            <BookOpen className="w-5 h-5" />
                          </div>
                          {index < report.activities.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <span className="text-sm font-semibold text-gray-900">
                            {activityName}
                          </span>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
                          {activity.activity_type === 'feeding' && (
                            <>
                              <p><span className="font-medium">Item:</span> {activity.food_item}</p>
                              <p><span className="font-medium">Quantidade:</span> {activity.amount}</p>
                            </>
                          )}

                          {activity.activity_type === 'nap' && (
                            <p><span className="font-medium">Duração:</span> {activity.duration_minutes} minutos</p>
                          )}

                          {activity.activity_type === 'diaper' && (
                            <p><span className="font-medium">Condição:</span> {activity.diaper_condition}</p>
                          )}

                          {activity.activity_type === 'pedagogical' && (
                            <p>{activity.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Fotos do Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map(photo => (
                      <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt="Foto da atividade"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Ainda não há relatório para hoje</p>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
