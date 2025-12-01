'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockMessages } from '@/lib/mock-data';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StaffMensagensPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'staff')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  const myMessages = mockMessages.filter(m => m.sender_id === user.id || m.receiver_id === user.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/staff/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Comunicação</h1>

        <Card className="h-[600px] flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {myMessages.map(msg => {
              const isMe = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-4 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-2 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && message.trim()) {
                    alert('Mensagem enviada: ' + message);
                    setMessage('');
                  }
                }}
              />
              <Button onClick={() => {
                if (message.trim()) {
                  alert('Mensagem enviada: ' + message);
                  setMessage('');
                }
              }}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
