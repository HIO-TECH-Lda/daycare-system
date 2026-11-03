'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, Megaphone, MessageCircle, Plus, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { useConversations, useMarkRead, useRecipients, useSendMessage, type Conversation } from '@/lib/api/messages';
import { useBroadcast } from '@/lib/api/finance';
import { refId, type Message, type Recipient } from '@/lib/api/types';
import { formatDate, formatTime, initials } from '@/lib/format';
import { maputoDay } from '@/lib/offline/queue';
import { ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

function when(value: string): string {
  return maputoDay(new Date(value)) === maputoDay() ? formatTime(value) : formatDate(value);
}

function replySubject(subject: string): string {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

/**
 * Messages for every role: conversations (one per person), the centre's announcements, and a
 * new message to anyone this user may write to. `?com=<user id>` opens a conversation,
 * `?com=comunicados` the announcements.
 */
export function Messages() {
  const { user } = useAuth();
  const pathname = usePathname();
  const open = useSearchParams().get('com');
  const data = useConversations();
  const recipients = useRecipients();
  const [picking, setPicking] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  if (data.isPending) return <ListSkeleton rows={5} />;
  if (data.error && !data.conversations.length) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;

  const conversation = open && open !== 'comunicados' ? data.conversations.find((item) => item.id === open) : undefined;
  // A new conversation with someone from the recipients list
  const newWith = open && !conversation && open !== 'comunicados' ? recipients.data?.find((item) => item.id === open) : undefined;
  const showingThread = !!open;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className={cn(showingThread && 'hidden lg:block')}>
        <PageHeader
          title="Mensagens"
          actions={
            <>
              {user?.role === 'administrador' && (
                <Button size="touch" variant="outline" onClick={() => setBroadcasting(true)}>
                  <Megaphone aria-hidden />
                  Comunicado
                </Button>
              )}
              <Button size="touch" onClick={() => setPicking(true)}>
                <Plus aria-hidden />
                Nova mensagem
              </Button>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <nav aria-label="Conversas" className={cn('space-y-2', showingThread && 'hidden lg:block')}>
          {data.announcements.length > 0 && (
            <Link
              href={`${pathname}?com=comunicados`}
              className={cn('flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-brand-green', open === 'comunicados' && 'border-teal-text bg-teal-tint')}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-sun-tint text-sun-text">
                <Megaphone className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Comunicados do centro</span>
                <span className="block truncate text-sm text-muted-foreground">{data.announcements[0].subject}</span>
              </span>
              <Unread count={data.announcements.filter((m) => !m.is_read).length} />
            </Link>
          )}
          {data.conversations.map((item) => (
            <ConversationRow key={item.id} conversation={item} href={`${pathname}?com=${item.id}`} active={open === item.id} mine={user?.id} />
          ))}
          {data.conversations.length === 0 && data.announcements.length === 0 && (
            <EmptyState icon={MessageCircle} title="Ainda sem mensagens">
              Escreva à equipa ou à administração com &quot;Nova mensagem&quot;.
            </EmptyState>
          )}
        </nav>

        <section className={cn('min-w-0', !showingThread && 'hidden lg:block')}>
          {open === 'comunicados' ? (
            <Announcements messages={data.announcements} back={pathname} />
          ) : conversation || newWith ? (
            <Thread key={open} personId={open!} name={conversation?.name ?? newWith!.name} context={newWith} messages={conversation?.messages ?? []} back={pathname} mine={user?.id} />
          ) : (
            <div className="hidden h-full min-h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground lg:flex">Escolha uma conversa.</div>
          )}
        </section>
      </div>

      <RecipientPicker open={picking} onClose={() => setPicking(false)} recipients={recipients.data ?? []} loading={recipients.isPending} pathname={pathname} />
      {user?.role === 'administrador' && <BroadcastDialog open={broadcasting} onClose={() => setBroadcasting(false)} />}
    </div>
  );
}

/** "Comunicado": one message to all parents or all staff (administration only). */
function BroadcastDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const broadcast = useBroadcast();
  const [role, setRole] = useState<'responsavel' | 'staff'>('responsavel');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const submit = async () => {
    try {
      await broadcast.mutateAsync({ role, subject: subject.trim(), content: content.trim() });
      toast.success(role === 'responsavel' ? 'Comunicado enviado a todos os encarregados.' : 'Comunicado enviado a toda a equipa.');
      setSubject('');
      setContent('');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comunicado</DialogTitle>
          <DialogDescription>Aparece em &quot;Comunicados do centro&quot; de cada pessoa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex gap-2">
            {(
              [
                ['responsavel', 'Todos os encarregados'],
                ['staff', 'Toda a equipa']
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={role === value}
                onClick={() => setRole(value)}
                className={cn('h-11 rounded-full border px-4 text-sm', role === value ? 'border-green-text bg-green-tint font-semibold text-green-text' : 'bg-background')}
              >
                {label}
              </button>
            ))}
          </div>
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Assunto" aria-label="Assunto" className="h-11" />
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} placeholder="Mensagem" aria-label="Mensagem" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!subject.trim() || !content.trim() || broadcast.isPending} onClick={() => void submit()}>
            Enviar a todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Unread({ count }: { count: number }) {
  if (!count) return null;
  return <span className="flex min-w-6 items-center justify-center rounded-full bg-teal-text px-1.5 text-xs font-semibold text-white">{count}</span>;
}

function ConversationRow({ conversation, href, active, mine }: { conversation: Conversation; href: string; active: boolean; mine?: string }) {
  const fromMe = refId(conversation.last.sender_id) === mine;
  return (
    <Link href={href} className={cn('flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-brand-green', active && 'border-teal-text bg-teal-tint')}>
      <Avatar className="size-11">
        <AvatarFallback className="bg-teal-tint font-semibold text-teal-text">{initials(conversation.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate', conversation.unread ? 'font-bold' : 'font-semibold')}>{conversation.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{when(conversation.last.createdAt)}</span>
        </span>
        <span className={cn('block truncate text-sm', conversation.unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {fromMe ? 'Você: ' : ''}
          {conversation.last.content}
        </span>
      </span>
      <Unread count={conversation.unread} />
    </Link>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-teal-text lg:hidden">
      <ChevronLeft className="size-4" aria-hidden />
      Conversas
    </Link>
  );
}

function useMarkOpenedAsRead(messages: Message[], mine?: string) {
  const markRead = useMarkRead();
  const unread = messages.filter((m) => !m.is_read && refId(m.sender_id) !== mine).map((m) => m._id);
  const key = unread.join(',');
  useEffect(() => {
    if (key) markRead.mutate(key.split(','));
    // Runs once per new set of unread messages
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Thread({ personId, name, context, messages, back, mine }: { personId: string; name: string; context?: Recipient; messages: Message[]; back: string; mine?: string }) {
  const send = useSendMessage();
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const last = messages[messages.length - 1];
  useMarkOpenedAsRead(messages, mine);

  const submit = async () => {
    const content = text.trim();
    const topic = last ? replySubject(last.subject) : subject.trim();
    if (!content || !topic) return;
    try {
      await send.mutateAsync({ recipientId: personId, subject: topic, content });
      setText('');
      setSubject('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar.');
    }
  };

  return (
    <div className="flex flex-col rounded-xl border bg-card">
      <div className="border-b p-4">
        <BackLink href={back} />
        <h3 className="font-heading text-xl font-bold">{name}</h3>
        {context && (
          <p className="text-sm text-muted-foreground">
            {ROLE_LABELS[context.role]}
            {context.children?.length ? ` · ${context.children.join(', ')}` : ''}
            {context.classes?.length ? ` · ${context.classes.join(', ')}` : ''}
          </p>
        )}
      </div>
      <ol className="flex max-h-[60dvh] min-h-48 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((message, index) => {
          const fromMe = refId(message.sender_id) === mine;
          const newTopic = index === 0 || replySubject(messages[index - 1].subject) !== replySubject(message.subject);
          return (
            <li key={message._id} className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm', fromMe ? 'self-end bg-teal-tint' : 'self-start bg-muted')}>
              {newTopic && <p className="mb-1 text-xs font-semibold text-muted-foreground">{message.subject}</p>}
              <p className="whitespace-pre-line">{message.content}</p>
              <p className="mt-1 text-right text-[0.7rem] text-muted-foreground">{when(message.createdAt)}</p>
            </li>
          );
        })}
        {messages.length === 0 && <li className="m-auto text-sm text-muted-foreground">Comece a conversa.</li>}
      </ol>
      <form method="post"
        className="grid gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {!last && <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Assunto" aria-label="Assunto" className="h-11" />}
        <div className="flex items-end gap-2">
          <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva uma mensagem" aria-label="Mensagem" rows={2} className="min-h-11 flex-1" />
          <Button type="submit" size="icon-lg" className="size-11" disabled={send.isPending || !text.trim() || (!last && !subject.trim())} aria-label="Enviar">
            <Send aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}

function Announcements({ messages, back }: { messages: Message[]; back: string }) {
  useMarkOpenedAsRead(messages);
  return (
    <div className="rounded-xl border bg-card p-4">
      <BackLink href={back} />
      <h3 className="mb-3 font-heading text-xl font-bold">Comunicados do centro</h3>
      <ol className="grid gap-3">
        {messages.map((message) => (
          <li key={message._id} className="rounded-xl border p-3">
            <p className="font-semibold">{message.subject}</p>
            <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
            <p className="mt-2 text-sm whitespace-pre-line">{message.content}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RecipientPicker({ open, onClose, recipients, loading, pathname }: { open: boolean; onClose: () => void; recipients: Recipient[]; loading: boolean; pathname: string }) {
  const [search, setSearch] = useState('');
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter((r) => [r.name, ...(r.children ?? []), ...(r.classes ?? [])].some((text) => text.toLowerCase().includes(term)));
  }, [recipients, search]);
  const groups: { role: Recipient['role']; title: string }[] = [
    { role: 'staff', title: 'Educadores' },
    { role: 'administrador', title: 'Administração' },
    { role: 'responsavel', title: 'Encarregados de educação' }
  ];

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Nova mensagem</SheetTitle>
          <SheetDescription>Escolha a quem escrever.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 overflow-y-auto px-4 pb-6">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Procurar pelo nome, criança ou turma" aria-label="Procurar" className="h-11 pl-9" />
          </div>
          {loading && <ListSkeleton rows={3} />}
          {groups.map((group) => {
            const people = matches.filter((r) => r.role === group.role);
            if (!people.length) return null;
            return (
              <section key={group.role} className="grid gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</h3>
                {people.map((person) => (
                  <Link key={person.id} href={`${pathname}?com=${person.id}`} onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-xl border bg-card p-3 hover:border-brand-green">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-teal-tint text-xs font-semibold text-teal-text">{initials(person.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block font-semibold">{person.name}</span>
                      {!!(person.children?.length || person.classes?.length) && (
                        <span className="block truncate text-sm text-muted-foreground">{[...(person.children ?? []), ...(person.classes ?? [])].join(', ')}</span>
                      )}
                    </span>
                  </Link>
                ))}
              </section>
            );
          })}
          {!loading && matches.length === 0 && <p className="text-sm text-muted-foreground">Ninguém encontrado.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
