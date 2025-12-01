'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockCalendarEvents, mockClasses } from '@/lib/mock-data';
import { ArrowLeft, Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GestaoEventosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'administrador')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto w-full">


        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Eventos</h1>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Novo Evento
          </Button>
        </div>

        <div className="space-y-4">
          {mockCalendarEvents.map(event => {
            const classData = event.class_id ? mockClasses.find(c => c.id === event.class_id) : null;

            return (
              <Card key={event.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                        <Badge>{event.event_type}</Badge>
                        {classData && <Badge variant="outline">{classData.name}</Badge>}
                        {!event.class_id && <Badge variant="outline">Todas as turmas</Badge>}
                      </div>
                      <p className="text-gray-600 mb-2">{event.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

    </div>
  );
}
