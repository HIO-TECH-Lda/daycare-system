'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockChildren, mockDailyReports, mockActivities, mockReportPhotos } from '@/lib/mock-data';
import { ArrowLeft, Utensils, Moon, Baby, BookOpen, SmilePlus, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ChildReportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;

  useEffect(() => {
    if (!loading && (!user || user.role !== 'responsavel')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  }

  if (!user) return null;

  const child = mockChildren.find(c => c.id === childId);
  if (!child) return <div>Criança não encontrada</div>;

  const report = mockDailyReports.find(r => r.child_id === childId && r.report_date === '2025-11-12');
  const activities = report ? mockActivities.filter(a => a.daily_report_id === report.id) : [];
  const photos = report ? mockReportPhotos.filter(p => p.daily_report_id === report.id) : [];

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/responsavel/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Painel
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            <img
              src={child.photo_url}
              alt={child.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
              <p className="text-gray-600">Rotina Diária - 12 de Novembro de 2025</p>
            </div>
          </div>
        </div>

        {report ? (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <SmilePlus className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Humor do Dia</p>
                    <p className="text-2xl font-bold text-gray-900">{report.mood}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{report.summary_note}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo das Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        {index < activities.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                        )}
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.time}
                          </Badge>
                          <span className="text-sm font-semibold text-gray-900">
                            {getActivityLabel(activity.activity_type)}
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
              <p className="text-gray-500 text-lg">Ainda não há relatório para hoje</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
