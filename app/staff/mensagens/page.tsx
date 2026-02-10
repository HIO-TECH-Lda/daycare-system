'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi, childrenApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { Send, MessageCircle, Search, Plus, User } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function StaffMensagensPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: messagesData = [], isLoading } = useQuery({
    queryKey: queryKeys.messages.inbox(),
    queryFn: async () => {
      const response = await messagesApi.getInbox();
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: children = [] } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => messagesApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      toast.success(messages.success.messageSent);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => messagesApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
    },
  });

  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get all parents that staff has messaged with
  const conversationPartners = useMemo(() => {
    const parentIds = new Set<string>();
    messagesData.forEach(msg => {
      if (msg.sender_id === user?.id && msg.recipient_id !== user?.id) {
        parentIds.add(msg.recipient_id);
      } else if (msg.recipient_id === user?.id && msg.sender_id !== user?.id) {
        parentIds.add(msg.sender_id);
      }
    });
    
    // Extract parent info from messages (in real app, fetch users with role 'responsavel')
    return Array.from(parentIds).map(parentId => {
      const parentMessages = messagesData.filter(m => 
        (m.sender_id === parentId && m.recipient_id === user?.id) ||
        (m.recipient_id === parentId && m.sender_id === user?.id)
      );
      const lastMessage = parentMessages[parentMessages.length - 1];
      const unreadCount = parentMessages.filter(m => 
        m.recipient_id === user?.id && !m.is_read
      ).length;
      
      return {
        id: parentId,
        name: lastMessage?.sender_id === parentId ? 'Responsável' : 'Responsável',
        lastMessage,
        unreadCount,
      };
    }).sort((a, b) => {
      if (!a.lastMessage || !b.lastMessage) return 0;
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    });
  }, [messagesData, user?.id]);

  // Get all parents (for new chat selection) - TODO: fetch from API
  const allParents = useMemo(() => {
    const parentIdsWithConversations = new Set(conversationPartners.map(p => p.id));
    return children
      .filter(c => !parentIdsWithConversations.has(c.parent_id))
      .map(child => ({
        id: child.parent_id,
        name: 'Responsável',
        children: [child],
      }));
  }, [conversationPartners, children]);

  // Filter parents for new chat dialog
  const filteredNewChatParents = useMemo(() => {
    if (!newChatSearch) return allParents;
    return allParents.filter(p => 
      p.name.toLowerCase().includes(newChatSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(newChatSearch.toLowerCase())
    );
  }, [allParents, newChatSearch]);

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversationPartners;
    return conversationPartners.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversationPartners, searchTerm]);

  // Get messages for selected parent
  const conversationMessages = useMemo(() => {
    if (!selectedParentId) return [];
    return messagesData
      .filter(m => 
        (m.sender_id === user?.id && m.recipient_id === selectedParentId) ||
        (m.recipient_id === user?.id && m.sender_id === selectedParentId)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messagesData, selectedParentId, user?.id]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedParentId && filteredConversations.length > 0) {
      setSelectedParentId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedParentId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedParentId) {
      const unreadMessages = messagesData.filter(msg => 
        msg.sender_id === selectedParentId && msg.recipient_id === user?.id && !msg.is_read
      );
      unreadMessages.forEach(msg => {
        markReadMutation.mutate(msg.id);
      });
    }
  }, [selectedParentId, user?.id, messagesData, markReadMutation]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedParentId) return;

    try {
      await sendMutation.mutateAsync({
        recipient_id: selectedParentId,
        recipient_role: 'responsavel',
        content: messageText.trim(),
        message_type: 'general',
      });
      setMessageText('');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleStartNewChat = (parentId: string) => {
    setSelectedParentId(parentId);
    setNewChatOpen(false);
    setNewChatSearch('');
  };

  const selectedParent = conversationPartners.find(p => p.id === selectedParentId);
  const selectedParentChildren = children.filter(c => c.parent_id === selectedParentId);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto w-full h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mensagens</h1>
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" />
              Nova Conversa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Iniciar Nova Conversa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar responsável..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {filteredNewChatParents.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum responsável encontrado</p>
                    </div>
                  ) : (
                    filteredNewChatParents.map(parent => {
                      const children = mockChildren.filter(c => c.parent_id === parent.id);
                      return (
                        <div
                          key={parent.id}
                          onClick={() => handleStartNewChat(parent.id)}
                          className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-green-700 font-semibold text-sm">
                                {parent.name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">{parent.name}</p>
                              <p className="text-xs text-gray-500 truncate">{parent.email}</p>
                              {children.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {children.length} criança{children.length > 1 ? 's' : ''}: {children.map(c => c.name).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row gap-4 min-h-0">
        {/* Conversations List - Sidebar on desktop, hidden on mobile */}
        <div className="hidden sm:flex flex-col w-80 border-r bg-white rounded-lg">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              ) : (
                filteredConversations.map(parent => {
                  const isSelected = selectedParentId === parent.id;
              return (
                    <div
                      key={parent.id}
                      onClick={() => setSelectedParentId(parent.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                        isSelected
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isSelected ? 'text-green-900' : 'text-gray-900'}`}>
                            {parent.name}
                          </p>
                          {parent.lastMessage && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {parent.lastMessage.message}
                            </p>
                          )}
                        </div>
                        {parent.unreadCount > 0 && (
                          <Badge className="ml-2 bg-green-600 text-white text-xs">
                            {parent.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Mobile: Conversation Selector */}
        <div className="sm:hidden">
          <Select value={selectedParentId} onValueChange={setSelectedParentId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conversa">
                {selectedParent ? selectedParent.name : 'Selecione uma conversa'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredConversations.map(parent => (
                <SelectItem key={parent.id} value={parent.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{parent.name}</span>
                    {parent.unreadCount > 0 && (
                      <Badge className="ml-2 bg-green-600 text-white text-xs">
                        {parent.unreadCount}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-lg border min-h-0">
          {selectedParent ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-semibold text-sm">
                      {selectedParent.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{selectedParent.name}</h3>
                    <p className="text-xs text-gray-500">{selectedParent.email}</p>
                    {selectedParentChildren.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Criança(s): {selectedParentChildren.map(c => c.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {conversationMessages.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Nenhuma mensagem ainda</p>
                      <p className="text-xs mt-1">Inicie uma conversa enviando uma mensagem</p>
                    </div>
                  ) : (
                    conversationMessages.map((msg, index) => {
                      const isMe = msg.sender_id === user?.id;
                      const prevMsg = index > 0 ? conversationMessages[index - 1] : null;
                      const showTime = !prevMsg || 
                        new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000; // 5 minutes
                      
                      return (
                        <div key={msg.id}>
                          {showTime && (
                            <div className="text-center my-4">
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                {new Date(msg.created_at).toLocaleDateString('pt-BR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] sm:max-w-[60%] rounded-lg p-3 ${
                              isMe 
                                ? 'bg-green-600 text-white rounded-br-sm' 
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                              <p className={`text-xs mt-1.5 ${
                                isMe ? 'text-green-100' : 'text-gray-500'
                              }`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                  </div>
                </div>
              );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
