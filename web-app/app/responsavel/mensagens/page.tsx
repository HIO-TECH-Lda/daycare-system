'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function MensagensPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: myMessages = [], isLoading } = useQuery({
    queryKey: queryKeys.messages.inbox(),
    queryFn: async () => {
      const response = await messagesApi.getInbox();
      return response.data?.filter(m => m.sender_id === user?.id || m.recipient_id === user?.id) || [];
    },
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => messagesApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      toast.success(messages.success.messageSent);
      setMessage('');
    },
  });

  const handleSend = async () => {
    if (!message.trim()) return;
    // TODO: Get recipient_id from context or selection
    await sendMutation.mutateAsync({
      recipient_id: '', // Needs to be set based on context
      recipient_role: 'staff',
      content: message.trim(),
      message_type: 'general',
    });
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Mensagens</h1>

        <Card className="h-[calc(100vh-12rem)] sm:h-[600px] flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-600">{messages.loading}</p>
              </div>
            ) : myMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              myMessages.map(msg => {
                const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 sm:p-4 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="text-xs sm:text-sm">{msg.message}</p>
                    <p className={`text-xs mt-2 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              );
            })
            )}
          </CardContent>

          <div className="p-3 sm:p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && message.trim()) {
                    handleSend();
                  }
                }}
              />
              <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
    </div>
  );
}
