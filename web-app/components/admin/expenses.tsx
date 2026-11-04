'use client';

import { useState } from 'react';
import { CircleCheck, Paperclip, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAddExpenseCategory, useDeleteExpense, useExpenseCategories, useExpenses, useSaveExpense } from '@/lib/api/finance';
import type { Expense } from '@/lib/api/types';
import { refId } from '@/lib/api/types';
import { formatDate, formatMT } from '@/lib/format';
import { compressImage } from '@/lib/image';
import { maputoDay } from '@/lib/offline/queue';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/app/page-states';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function monthRange(month: string): [string, string] {
  const [year, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, '0')}`];
}

/** The centre's expenses by month: category, supplier, receipt. */
export function Expenses() {
  const [month, setMonth] = useState(maputoDay().slice(0, 7));
  const [from, to] = monthRange(month);
  const expenses = useExpenses(from, to);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const total = (expenses.data ?? []).reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Despesas"
        actions={
          <>
            <Input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} aria-label="Mês" className="h-11 w-44 bg-card" />
            <Button size="touch" onClick={() => setEditing('new')}>
              <Plus aria-hidden />
              Nova despesa
            </Button>
          </>
        }
      />
      {expenses.isPending ? (
        <ListSkeleton rows={5} />
      ) : !expenses.data ? (
        <ErrorState error={expenses.error} onRetry={() => void expenses.refetch()} />
      ) : expenses.data.length === 0 ? (
        <EmptyState icon={Wallet} title="Sem despesas neste mês" />
      ) : (
        <>
          <p className="text-sm">
            Total do mês: <strong className="tabular-nums">{formatMT(total)}</strong>
          </p>
          <ul className="divide-y rounded-2xl border bg-card">
            {expenses.data.map((expense) => (
              <li key={expense._id}>
                <button type="button" onClick={() => setEditing(expense)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50">
                  <span className="w-24 shrink-0 text-muted-foreground">{formatDate(expense.expense_date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{expense.description}</span>
                    <span className="block text-muted-foreground">
                      {typeof expense.category_id === 'object' && expense.category_id ? expense.category_id.name : ''}
                      {expense.vendor ? ` · ${expense.vendor}` : ''}
                    </span>
                  </span>
                  {expense.receipt_url && <Paperclip className="size-4 text-muted-foreground" aria-label="Com recibo" />}
                  <span className="font-semibold tabular-nums">{formatMT(expense.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <ExpenseDialog key={editing === 'new' ? 'new' : (editing?._id ?? 'none')} target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ExpenseDialog({ target, onClose }: { target: Expense | 'new' | null; onClose: () => void }) {
  const categories = useExpenseCategories();
  const addCategory = useAddExpenseCategory();
  const save = useSaveExpense();
  const remove = useDeleteExpense();
  const existing = target && target !== 'new' ? target : null;
  const [categoryId, setCategoryId] = useState(refId(existing?.category_id) ?? '');
  const [newCategory, setNewCategory] = useState('');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [date, setDate] = useState(existing?.expense_date.slice(0, 10) ?? maputoDay());
  const [vendor, setVendor] = useState(existing?.vendor ?? '');
  const [receipt, setReceipt] = useState<File | null>(null);
  const value = Number(amount.replace(/\s/g, '').replace(',', '.'));

  const createCategory = async () => {
    try {
      const res = await addCategory.mutateAsync(newCategory.trim());
      setCategoryId(res.data._id);
      setNewCategory('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a categoria.');
    }
  };

  const submit = async () => {
    try {
      // Photos of receipts are scaled down; PDFs go as they are
      const file = receipt && receipt.type.startsWith('image/') ? await compressImage(receipt) : (receipt ?? undefined);
      await save.mutateAsync({ id: existing?._id, categoryId, amount: value, description: description.trim(), date, vendor: vendor.trim(), receipt: file, receiptName: receipt?.name });
      toast.success(existing ? 'Despesa actualizada.' : 'Despesa registada.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.');
    }
  };

  const destroy = async () => {
    if (!existing) return;
    try {
      await remove.mutateAsync(existing._id);
      toast.success('Despesa apagada.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível apagar.');
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
          <DialogDescription>Junte o recibo (fotografia ou PDF) sempre que possível.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Descrição
            <Input value={description} onChange={(event) => setDescription(event.target.value)} className="h-11" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm font-medium">
              Valor (MT)
              <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Data
              <Input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} className="h-11" />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Categoria
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {(categories.data ?? []).filter((c) => c.is_active || c._id === categoryId).map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex gap-2">
            <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nova categoria" aria-label="Nova categoria" className="h-10" />
            <Button variant="outline" className="h-10" disabled={!newCategory.trim() || addCategory.isPending} onClick={() => void createCategory()}>
              Criar
            </Button>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Fornecedor (opcional)
            <Input value={vendor} onChange={(event) => setVendor(event.target.value)} className="h-11" />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-teal-text">
            {receipt ? <CircleCheck className="size-4" aria-hidden /> : <Paperclip className="size-4" aria-hidden />}
            {receipt ? receipt.name : existing?.receipt_url ? 'Substituir o recibo' : 'Juntar recibo'}
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} />
          </label>
          {existing?.receipt_url && (
            <a href={existing.receipt_url} target="_blank" rel="noreferrer" className="text-sm text-teal-text underline">
              Ver o recibo actual
            </a>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {existing ? (
            <Button variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => void destroy()}>
              Apagar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!categoryId || !(value > 0) || !description.trim() || save.isPending} onClick={() => void submit()}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
