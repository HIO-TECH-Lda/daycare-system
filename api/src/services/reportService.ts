import mongoose, { Types } from 'mongoose';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import Expense from '../models/Expense';
import Attendance from '../models/Attendance';
import Child from '../models/Child';
import { ApiError } from '../utils/ApiError';

/** A reporting period: `from` inclusive, `to` exclusive (the day after the last day asked for). */
export interface Period {
  from: Date;
  to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** from/to as YYYY-MM-DD (both inclusive); defaults to the current month so far. */
export function parsePeriod(from?: string, to?: string): Period {
  const now = new Date();
  const start = from ? new Date(from) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastDay = to ? new Date(to) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (Number.isNaN(start.getTime()) || Number.isNaN(lastDay.getTime()) || start > lastDay) {
    throw new ApiError(400, 'Período inválido: use from e to no formato AAAA-MM-DD, com from ≤ to');
  }
  return { from: start, to: new Date(lastDay.getTime() + DAY_MS) };
}

const byMonth = (dateField: string) => ({ $dateToString: { format: '%Y-%m', date: `$${dateField}` } });
const inPeriod = (field: string, period: Period) => ({ [field]: { $gte: period.from, $lt: period.to } });
const round = (n: number) => Math.round(n * 100) / 100;

async function sumByMonth(model: mongoose.Model<any>, dateField: string, match: Record<string, unknown>) {
  const rows = await model.aggregate([
    { $match: match },
    { $group: { _id: byMonth(dateField), amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  return rows as Array<{ _id: string; amount: number; count: number }>;
}

export class ReportService {
  /** Invoiced, received, spent and outstanding, with a month-by-month breakdown. Amounts in MT. */
  static async financeSummary(period: Period) {
    const invoiceMatch = { ...inPeriod('issue_date', period), status: { $ne: 'cancelled' } };
    const [invoiced, received, spent, open] = await Promise.all([
      sumByMonth(Invoice, 'issue_date', invoiceMatch),
      sumByMonth(Payment, 'payment_date', inPeriod('payment_date', period)),
      sumByMonth(Expense, 'expense_date', inPeriod('expense_date', period)),
      // Outstanding today, whatever the period: unpaid invoices minus what was already paid on them
      Invoice.aggregate([
        { $match: { status: { $in: ['pending', 'overdue'] } } },
        { $lookup: { from: 'payments', localField: '_id', foreignField: 'invoice_id', as: 'payments' } },
        { $project: { status: 1, due: { $max: [0, { $subtract: ['$amount', { $sum: '$payments.amount' }] }] } } },
        { $group: { _id: '$status', amount: { $sum: '$due' }, count: { $sum: 1 } } }
      ])
    ]);

    const total = (rows: Array<{ amount: number }>) => round(rows.reduce((sum, r) => sum + r.amount, 0));
    const months = [...new Set([...invoiced, ...received, ...spent].map((r) => r._id))].sort();
    const monthValue = (rows: Array<{ _id: string; amount: number }>, month: string) => round(rows.find((r) => r._id === month)?.amount ?? 0);
    const openRow = (status: string) => open.find((r: { _id: string }) => r._id === status) ?? { amount: 0, count: 0 };

    return {
      period: { from: period.from, to: new Date(period.to.getTime() - DAY_MS) },
      invoiced: total(invoiced),
      received: total(received),
      expenses: total(spent),
      net: round(total(received) - total(spent)),
      outstanding: {
        amount: round(openRow('pending').amount + openRow('overdue').amount),
        count: openRow('pending').count + openRow('overdue').count,
        overdue_amount: round(openRow('overdue').amount),
        overdue_count: openRow('overdue').count
      },
      by_month: months.map((month) => ({
        month,
        invoiced: monthValue(invoiced, month),
        received: monthValue(received, month),
        expenses: monthValue(spent, month)
      }))
    };
  }

  static async payments(period: Period, method?: string) {
    const match = { ...inPeriod('payment_date', period), ...(method && { payment_method: method }) };
    const [byMethod, months] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        { $group: { _id: '$payment_method', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } }
      ]),
      sumByMonth(Payment, 'payment_date', match)
    ]);
    return {
      period: { from: period.from, to: new Date(period.to.getTime() - DAY_MS) },
      total: round(byMethod.reduce((s: number, r: { amount: number }) => s + r.amount, 0)),
      count: byMethod.reduce((s: number, r: { count: number }) => s + r.count, 0),
      by_method: byMethod.map((r: { _id: string; amount: number; count: number }) => ({ method: r._id, amount: round(r.amount), count: r.count })),
      by_month: months.map((r) => ({ month: r._id, amount: round(r.amount), count: r.count }))
    };
  }

  static async expenses(period: Period, categoryId?: string) {
    const match = {
      ...inPeriod('expense_date', period),
      ...(categoryId && { category_id: new mongoose.Types.ObjectId(categoryId) })
    };
    const [byCategory, months] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$category_id', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'expensecategories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $sort: { amount: -1 } }
      ]),
      sumByMonth(Expense, 'expense_date', match)
    ]);
    return {
      period: { from: period.from, to: new Date(period.to.getTime() - DAY_MS) },
      total: round(byCategory.reduce((s: number, r: { amount: number }) => s + r.amount, 0)),
      by_category: byCategory.map((r: { _id: Types.ObjectId; amount: number; count: number; category: Array<{ name: string }> }) => ({
        category_id: String(r._id),
        category: r.category[0]?.name ?? '—',
        amount: round(r.amount),
        count: r.count
      })),
      by_month: months.map((r) => ({ month: r._id, amount: round(r.amount), count: r.count }))
    };
  }

  /**
   * Attendance per child for a month (YYYY-MM), optionally for one class, limited to `childIds`
   * (the caller's scope; undefined = all). Rate = (present + late) / days recorded.
   */
  static async attendance(month: string, classId?: string, childIds?: Types.ObjectId[]) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError(400, 'Mês inválido: use AAAA-MM');
    const [year, m] = month.split('-').map(Number);
    const period = { from: new Date(Date.UTC(year, m - 1, 1)), to: new Date(Date.UTC(year, m, 1)) };

    const children = await Child.find({
      ...(classId && { class_id: new mongoose.Types.ObjectId(classId) }),
      ...(childIds && { _id: { $in: childIds } })
    }).select('name class_id').populate('class_id', 'name').sort({ name: 1 }).lean();

    const rows = await Attendance.aggregate([
      { $match: { ...inPeriod('date', period), child_id: { $in: children.map((c) => c._id) } } },
      { $group: { _id: { child: '$child_id', status: '$status' }, count: { $sum: 1 } } }
    ]);

    const counts = (childId: unknown, status: string) =>
      rows.find((r: { _id: { child: unknown; status: string } }) => String(r._id.child) === String(childId) && r._id.status === status)?.count ?? 0;

    const perChild = children.map((c) => {
      const present = counts(c._id, 'present');
      const late = counts(c._id, 'late');
      const absent = counts(c._id, 'absent');
      const excused = counts(c._id, 'excused');
      const days = present + late + absent + excused;
      return {
        child_id: String(c._id),
        name: c.name,
        class: (c.class_id as any)?.name ?? null,
        present, late, absent, excused, days,
        rate: days ? round((present + late) / days) : null
      };
    });

    const totals = perChild.reduce(
      (t, c) => ({ present: t.present + c.present, late: t.late + c.late, absent: t.absent + c.absent, excused: t.excused + c.excused, days: t.days + c.days }),
      { present: 0, late: 0, absent: 0, excused: 0, days: 0 }
    );

    return {
      month,
      class_id: classId ?? null,
      totals: { ...totals, rate: totals.days ? round((totals.present + totals.late) / totals.days) : null },
      children: perChild
    };
  }
}
