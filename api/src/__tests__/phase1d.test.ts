import request from 'supertest';
import { app } from '../app';
import Class from '../models/Class';
import Child from '../models/Child';
import StaffAssignment from '../models/StaffAssignment';
import Attendance from '../models/Attendance';
import DailyReport from '../models/DailyReport';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import ExpenseCategory from '../models/ExpenseCategory';
import Expense from '../models/Expense';
import { IUserDocument } from '../models/User';
import { NotificationService } from '../services/notificationService';
import { settleBackgroundTasks } from '../utils/background';
import { createUser, bearer } from './helpers';

async function world() {
  const admin = await createUser('administrador', { firstName: 'Admin' });
  const staffX = await createUser('staff', { firstName: 'Educadora' });
  const staffNone = await createUser('staff', { firstName: 'Sem Turma' });
  const parentA = await createUser('responsavel', { firstName: 'Mãe', whatsappOptIn: true, phone: '841111111' });
  const parentB = await createUser('responsavel', { firstName: 'Pai' });
  const [classX, classY] = await Class.create([
    { name: 'Turma X', min_age_months: 12, max_age_months: 24, capacity: 10 },
    { name: 'Turma Y', min_age_months: 24, max_age_months: 36, capacity: 10 }
  ]);
  await StaffAssignment.create({ staff_id: staffX._id, class_id: classX._id });
  const [childA, childB] = await Child.create([
    { name: 'Criança A', birth_date: new Date('2024-01-01'), class_id: classX._id, parent_id: parentA._id },
    { name: 'Criança B', birth_date: new Date('2023-01-01'), class_id: classY._id, parent_id: parentB._id }
  ]);
  return { admin, staffX, staffNone, parentA, parentB, classX, classY, childA, childB };
}

const as = (user: IUserDocument) => ({
  get: (url: string) => request(app).get(`/api/v1${url}`).set('Authorization', bearer(user)),
  post: (url: string, body: object = {}) => request(app).post(`/api/v1${url}`).set('Authorization', bearer(user)).send(body),
  put: (url: string, body: object) => request(app).put(`/api/v1${url}`).set('Authorization', bearer(user)).send(body)
});
const id = (doc: { _id?: unknown }) => String(doc._id);

describe('messaging', () => {
  it('lists who each user may write to, with context', async () => {
    const w = await world();

    const forParent = (await as(w.parentA).get('/messages/recipients')).body.data;
    expect(forParent.map((r: { id: string }) => r.id).sort()).toEqual([id(w.admin), id(w.staffX)].sort());
    expect(forParent.find((r: { id: string }) => r.id === id(w.staffX)).classes).toEqual(['Turma X']);

    const forStaff = (await as(w.staffX).get('/messages/recipients')).body.data;
    const ids = forStaff.map((r: { id: string }) => r.id);
    expect(ids).toEqual(expect.arrayContaining([id(w.admin), id(w.staffNone), id(w.parentA)]));
    expect(ids).not.toContain(id(w.parentB));
    expect(ids).not.toContain(id(w.staffX));
    expect(forStaff.find((r: { id: string }) => r.id === id(w.parentA)).children).toEqual(['Criança A']);

    const forAdmin = (await as(w.admin).get('/messages/recipients')).body.data;
    expect(forAdmin).toHaveLength(4);
  });

  it('only lets users send to people they may write to', async () => {
    const w = await world();
    const msg = (to: object) => ({ subject: 'Olá', content: 'Mensagem', ...to });

    expect((await as(w.parentA).post('/messages', msg({ recipient_id: id(w.parentB) }))).status).toBe(404);
    expect((await as(w.parentA).post('/messages', msg({ recipient_id: id(w.staffNone) }))).status).toBe(404);
    expect((await as(w.parentA).post('/messages', msg({ recipient_id: id(w.staffX) }))).status).toBe(201);
    expect((await as(w.parentA).post('/messages', msg({ recipient_id: id(w.staffX), child_id: id(w.childB) }))).status).toBe(404);
    expect((await as(w.staffX).post('/messages', msg({ recipient_role: 'responsavel' }))).status).toBe(403);
    expect((await as(w.admin).post('/messages', msg({ recipient_role: 'responsavel' }))).status).toBe(201);
    expect((await as(w.admin).post('/messages', msg({}))).status).toBe(400);
  });
});

describe('reports', () => {
  it('finance summary: invoiced, received, spent, net and outstanding', async () => {
    const w = await world();
    const today = new Date();
    const invoice = await Invoice.create({
      invoice_number: 'INV-1', child_id: w.childA._id, parent_id: w.parentA._id, issue_date: today,
      due_date: today, amount: 1000, status: 'pending', created_by: w.admin._id
    });
    await Invoice.create({
      invoice_number: 'INV-2', child_id: w.childB._id, parent_id: w.parentB._id, issue_date: today,
      due_date: today, amount: 500, status: 'cancelled', created_by: w.admin._id
    });
    await Payment.create({ invoice_id: invoice._id, parent_id: w.parentA._id, child_id: w.childA._id, amount: 600, payment_date: today, payment_method: 'mobile_money', recorded_by: w.admin._id });
    const category = await ExpenseCategory.create({ name: 'Alimentação' });
    await Expense.create({ category_id: category._id, amount: 200, description: 'Fruta', expense_date: today, recorded_by: w.admin._id });

    const summary = (await as(w.admin).get('/reports/finance/summary')).body.data;
    expect(summary).toMatchObject({ invoiced: 1000, received: 600, expenses: 200, net: 400 });
    expect(summary.outstanding).toMatchObject({ amount: 400, count: 1, overdue_count: 0 });
    expect(summary.by_month).toEqual([{ month: today.toISOString().slice(0, 7), invoiced: 1000, received: 600, expenses: 200 }]);

    const payments = (await as(w.admin).get('/reports/payments')).body.data;
    expect(payments.by_method).toEqual([{ method: 'mobile_money', amount: 600, count: 1 }]);
    const expenses = (await as(w.admin).get('/reports/expenses')).body.data;
    expect(expenses.by_category).toEqual([expect.objectContaining({ category: 'Alimentação', amount: 200 })]);
  });

  it('finance reports are admin-only and validate the period', async () => {
    const w = await world();
    expect((await as(w.staffX).get('/reports/finance/summary')).status).toBe(403);
    expect((await as(w.parentA).get('/reports/payments')).status).toBe(403);
    expect((await as(w.admin).get('/reports/finance/summary?from=2026-05-01&to=2026-04-01')).status).toBe(400);
  });

  it('attendance report: per child counts; staff only for their own classes', async () => {
    const w = await world();
    const month = '2026-10';
    await Attendance.create([
      { child_id: w.childA._id, date: new Date('2026-10-01'), status: 'present', recorded_by: w.admin._id },
      { child_id: w.childA._id, date: new Date('2026-10-02'), status: 'late', recorded_by: w.admin._id },
      { child_id: w.childA._id, date: new Date('2026-10-03'), status: 'absent', recorded_by: w.admin._id },
      { child_id: w.childB._id, date: new Date('2026-10-01'), status: 'present', recorded_by: w.admin._id }
    ]);

    const own = await as(w.staffX).get(`/reports/attendance?month=${month}&class_id=${id(w.classX)}`);
    expect(own.status).toBe(200);
    expect(own.body.data.children).toEqual([expect.objectContaining({ name: 'Criança A', present: 1, late: 1, absent: 1, days: 3, rate: 0.67 })]);

    expect((await as(w.staffX).get(`/reports/attendance?month=${month}&class_id=${id(w.classY)}`)).status).toBe(403);
    expect((await as(w.staffX).get(`/reports/attendance?month=${month}`)).status).toBe(403);
    expect((await as(w.parentA).get(`/reports/attendance?month=${month}`)).status).toBe(403);

    const all = (await as(w.admin).get(`/reports/attendance?month=${month}`)).body.data;
    expect(all.totals).toMatchObject({ present: 2, late: 1, absent: 1, days: 4 });
    expect((await as(w.admin).get('/reports/attendance?month=2026-13')).status).toBe(400);
  });
});

describe('overdue invoices job', () => {
  const saved = process.env.CRON_SECRET;
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  it('is disabled without CRON_SECRET and needs the right secret', async () => {
    delete process.env.CRON_SECRET;
    expect((await request(app).get('/api/v1/jobs/mark-overdue')).status).toBe(503);
    process.env.CRON_SECRET = 'cron-secret';
    expect((await request(app).get('/api/v1/jobs/mark-overdue').set('Authorization', 'Bearer wrong')).status).toBe(401);
  });

  it('marks pending invoices past their due date as overdue, once, and tells the family', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    const notify = jest.spyOn(NotificationService, 'invoiceOverdue').mockResolvedValue({ email: true, whatsapp: false });
    const w = await world();
    const base = { child_id: w.childA._id, parent_id: w.parentA._id, issue_date: new Date('2026-09-01'), amount: 100, created_by: w.admin._id };
    const late = await Invoice.create({ ...base, invoice_number: 'A', due_date: new Date('2026-09-10'), status: 'pending' });
    const future = await Invoice.create({ ...base, invoice_number: 'B', due_date: new Date(Date.now() + 7 * 864e5), status: 'pending' });
    const paid = await Invoice.create({ ...base, invoice_number: 'C', due_date: new Date('2026-09-10'), status: 'paid' });
    const run = () => request(app).get('/api/v1/jobs/mark-overdue').set('Authorization', 'Bearer cron-secret');

    const first = await run();
    expect(first.status).toBe(200);
    expect(first.body.data.marked_overdue).toBe(1);
    expect((await Invoice.findById(late._id))!.status).toBe('overdue');
    expect((await Invoice.findById(future._id))!.status).toBe('pending');
    expect((await Invoice.findById(paid._id))!.status).toBe('paid');

    await settleBackgroundTasks();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ invoiceNumber: 'A', parent: expect.objectContaining({ phone: '+258841111111' }) }));

    expect((await run()).body.data.marked_overdue).toBe(0);
  });
});

describe('offline sync', () => {
  it('attendance: a replayed client_id is saved once; another educator for the same child and day merges', async () => {
    const w = await world();
    const staff = as(w.staffX);
    const body = { child_id: id(w.childA), date: '2026-11-02T06:30:00Z', status: 'present', client_id: 'tablet-1-0001' };

    const created = await staff.post('/attendance', body);
    expect(created.status).toBe(201);
    expect(created.body.sync).toBe('created');

    const replayed = await staff.post('/attendance', body);
    expect(replayed.status).toBe(200);
    expect(replayed.body.sync).toBe('replayed');

    // The same educator's next write (e.g. check-out) merges without a conflict
    const own = await staff.post('/attendance', { child_id: id(w.childA), date: '2026-11-02T14:00:00Z', status: 'present', client_id: 'tablet-1-0002' });
    expect(own.body.sync).toBe('merged');
    expect(own.body.conflict).toBeUndefined();

    // Another educator's tablet, offline, recorded the same child that day (different time of day, same calendar day in Maputo)
    const colleague = await createUser('staff', { firstName: 'Colega' });
    await StaffAssignment.create({ staff_id: colleague._id, class_id: w.classX._id });
    const merged = await as(colleague).post('/attendance', { child_id: id(w.childA), date: '2026-11-02T21:30:00Z', status: 'late', client_id: 'tablet-2-0001' });
    expect(merged.status).toBe(200);
    expect(merged.body).toMatchObject({ sync: 'merged', conflict: true });
    expect(merged.body.previous.status).toBe('present');

    const stored = await Attendance.find({ child_id: w.childA._id });
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe('late');
    expect(stored[0].date.toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });

  it('a client_id can’t be reused for another child', async () => {
    const w = await world();
    await StaffAssignment.create({ staff_id: w.staffX._id, class_id: w.classY._id });
    const staff = as(w.staffX);
    await staff.post('/attendance', { child_id: id(w.childA), date: '2026-11-02', status: 'present', client_id: 'dup' });
    expect((await staff.post('/attendance', { child_id: id(w.childB), date: '2026-11-02', status: 'present', client_id: 'dup' })).status).toBe(409);
  });

  it('updates report a conflict when the record changed since the version the app edited', async () => {
    const w = await world();
    const staff = as(w.staffX);
    const created = (await staff.post('/attendance', { child_id: id(w.childA), date: '2026-11-02', status: 'present' })).body.data;

    const fresh = await staff.put(`/attendance/${created._id}`, { notes: 'Chegou feliz', base_updated_at: created.updatedAt });
    expect(fresh.body.conflict).toBeUndefined();

    const stale = await staff.put(`/attendance/${created._id}`, { notes: 'Versão antiga', base_updated_at: created.updatedAt });
    expect(stale.body).toMatchObject({ conflict: true });
    expect(stale.body.previous.notes).toBe('Chegou feliz');
    expect(stale.body.data.notes).toBe('Versão antiga');
  });

  it('an update can clear a check-out time (undoing a mistaken tap)', async () => {
    const w = await world();
    const staff = as(w.staffX);
    const created = (await staff.post('/attendance', { child_id: id(w.childA), date: '2026-11-02', status: 'present', check_in: '2026-11-02T06:00:00Z', check_out: '2026-11-02T15:00:00Z' })).body.data;

    const undone = await staff.put(`/attendance/${created._id}`, { check_out: null });
    expect(undone.status).toBe(200);
    expect(undone.body.data.check_out).toBeNull();
    expect(undone.body.data.check_in).toBe('2026-11-02T06:00:00.000Z');
  });

  it('daily report: one per child per day; the family is told only when it is first created', async () => {
    const w = await world();
    const notify = jest.spyOn(NotificationService, 'newDailyReport').mockResolvedValue({ email: true, whatsapp: false });
    const staff = as(w.staffX);

    const first = await staff.post('/daily-reports', { child_id: id(w.childA), date: '2026-11-02', mood: 'feliz', client_id: 'r-1' });
    expect(first.status).toBe(201);
    const second = await staff.post('/daily-reports', { child_id: id(w.childA), date: '2026-11-02', notes: 'Dormiu bem', client_id: 'r-2' });
    expect(second.body.sync).toBe('merged');
    await settleBackgroundTasks();

    const reports = await DailyReport.find({ child_id: w.childA._id });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ mood: 'feliz', notes: 'Dormiu bem' });
    expect(notify).toHaveBeenCalledTimes(1);

    // Updates can't move the report to another child
    await staff.put(`/daily-reports/${id(reports[0])}`, { child_id: id(w.childB), notes: 'x' });
    expect(String((await DailyReport.findById(reports[0]._id))!.child_id)).toBe(id(w.childA));
  });
});
