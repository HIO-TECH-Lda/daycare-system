'use client';

/** The notification log (Notificações): what was sent by WhatsApp and email, and resends. */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from './client';
import type { Id } from './types';

export type NotificationChannel = 'whatsapp' | 'email';
export type NotificationCategory = 'account' | 'enrollment' | 'billing' | 'reports' | 'attendance' | 'messages';
export type NotificationStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';

export interface NotificationRow {
  _id: Id;
  channel: NotificationChannel;
  category: NotificationCategory;
  template: string;
  /** Phone number (E.164) or email address */
  recipient: string;
  user_id: { _id: Id; firstName: string; lastName: string; role: string } | null;
  status: NotificationStatus;
  error: string;
  attempts: number;
  createdAt: string;
  status_at?: string;
  fallback_of?: Id | null;
  resend_of?: Id | null;
  /** Can be sent again from the log (not an account message, not resent already) */
  resendable: boolean;
  /** Already resent, or covered by an email fallback */
  handled: boolean;
}

export interface NotificationFilters {
  status?: NotificationStatus;
  channel?: NotificationChannel;
  category?: NotificationCategory;
  search?: string;
  page: number;
}

export interface NotificationPage {
  rows: NotificationRow[];
  pages: number;
  total: number;
  failedThisWeek: number;
  whatsappConfigured: boolean;
  emailConfigured: boolean;
}

type Meta = { failed_this_week: number; whatsapp_configured: boolean; email_configured: boolean };

export function useNotifications(filters: NotificationFilters) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async (): Promise<NotificationPage> => {
      const res = await api.get<NotificationRow[]>('/notifications', { ...filters, limit: 30 });
      // Next to the pagination: the week's failures and which channels are set up
      const meta = (res as { meta?: Meta }).meta;
      return {
        rows: res.data,
        pages: res.pagination?.pages ?? 1,
        total: res.pagination?.total ?? res.data.length,
        failedThisWeek: meta?.failed_this_week ?? 0,
        whatsappConfigured: meta?.whatsapp_configured ?? false,
        emailConfigured: meta?.email_configured ?? false
      };
    },
    placeholderData: keepPreviousData
  });
}

export function useResendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => api.post(`/notifications/${id}/resend`),
    // Also on failure: the attempt is a new row in the log
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });
}
