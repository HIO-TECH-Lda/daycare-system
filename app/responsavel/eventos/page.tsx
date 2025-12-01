'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCalendarEvents, mockChildren } from '@/lib/mock-data';
import { Calendar } from 'lucide-react';

export default function EventosPage() {
  const { user } = useAuth();
  const myChildren = mockChildren.filter(c => c.parent_id === user?.id);
  const myClassIds = myChildren.map(c => c.class_id);
  const relevantEvents = mockCalendarEvents.filter(e => !e.class_id || myClassIds.includes(e.class_id));

  return (
    <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Calendário de Eventos</h1>

        <div className="space-y-4">
          {relevantEvents.map(event => (
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
  );
}
