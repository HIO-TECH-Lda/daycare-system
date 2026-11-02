'use client';

/**
 * Messages for every role. The API stores single messages (subject + text) in an inbox and a
 * sent list; the app groups them into one conversation per person, and keeps messages sent to
 * a whole role (e.g. all parents) apart as "Comunicados".
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { personName, refId, type Message, type Recipient } from './types';

async function list<T>(path: string): Promise<T[]> {
  return (await api.get<T[]>(path, { limit: 100 })).data;
}

export function useInbox() {
  return useQuery({ queryKey: ['messages', 'inbox'], queryFn: () => list<Message>('/messages/inbox'), meta: { offline: true }, refetchInterval: 60_000 });
}

export function useSent() {
  return useQuery({ queryKey: ['messages', 'sent'], queryFn: () => list<Message>('/messages/sent'), meta: { offline: true } });
}

/** People this user may write to, with their children (parents) or classes (staff). */
export function useRecipients() {
  return useQuery({
    queryKey: ['messages', 'recipients'],
    queryFn: async () => (await api.get<Recipient[]>('/messages/recipients')).data,
    staleTime: 10 * 60 * 1000
  });
}

export interface Conversation {
  /** The other person's user id */
  id: string;
  name: string;
  messages: Message[];
  last: Message;
  unread: number;
}

/** One conversation per person (newest first), plus the role-wide announcements. */
export function useConversations() {
  const inbox = useInbox();
  const sent = useSent();

  const grouped = useMemo(() => {
    // Each message once, tagged with the other person in the conversation
    const entries = [
      ...(inbox.data ?? []).map((message) => ({ message, otherId: refId(message.sender_id), other: message.sender_id, unread: !message.is_read })),
      // Announcements this user sent to a whole role aren't a conversation with one person
      ...(sent.data ?? []).map((message) => ({ message, otherId: refId(message.recipient_id), other: message.recipient_id, unread: false }))
    ];
    const announcements = (inbox.data ?? [])
      .filter((message) => !refId(message.recipient_id) && message.recipient_role)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const announcementIds = new Set(announcements.map((message) => message._id));

    const byPerson = new Map<string, { name: string; messages: Message[]; unread: number }>();
    for (const { message, otherId, other, unread } of entries) {
      if (!otherId || announcementIds.has(message._id)) continue;
      const current = byPerson.get(otherId);
      byPerson.set(otherId, {
        name: current?.name || personName(other) || 'Utilizador',
        messages: [...(current?.messages ?? []), message],
        unread: (current?.unread ?? 0) + (unread ? 1 : 0)
      });
    }
    const conversations: Conversation[] = [...byPerson].map(([id, conversation]) => {
      const messages = [...conversation.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { id, name: conversation.name, messages, last: messages[messages.length - 1], unread: conversation.unread };
    });
    conversations.sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt));
    return { conversations, announcements, unread: conversations.reduce((sum, c) => sum + c.unread, 0) + announcements.filter((m) => !m.is_read).length };
  }, [inbox.data, sent.data]);

  return { ...grouped, isPending: inbox.isPending || sent.isPending, error: inbox.error ?? sent.error, refetch: () => Promise.all([inbox.refetch(), sent.refetch()]) };
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { recipientId: string; subject: string; content: string; childId?: string }) =>
      api.post<Message>('/messages', { recipient_id: input.recipientId, subject: input.subject, content: input.content, ...(input.childId && { child_id: input.childId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] })
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => api.patch(`/messages/${id}/read`))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] })
  });
}
