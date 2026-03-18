'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { calendarEventsApi, childrenApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { Calendar } from 'lucide-react';

export default function EventosPage() {
  const { user } = useAuth();
  
  const { data: children = [] } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: queryKeys.calendarEvents.list(),
    queryFn: async () => {
      const response = await calendarEventsApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const myChildren = children.filter(c => c.parent_id === user?.id);
  const myClassIds = myChildren.map(c => c.class_id);
  const relevantEvents = events.filter(e => !e.class_id || myClassIds.includes(e.class_id));

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
                      {new Date(event.start_date).toLocaleDateString('pt-BR', {
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
        )}
    </div>
  );
}
