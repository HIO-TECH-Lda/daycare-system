import request from 'supertest';
import { app } from '../app';
import Class from '../models/Class';
import Child from '../models/Child';
import StaffAssignment from '../models/StaffAssignment';
import Invoice from '../models/Invoice';
import ExpenseCategory from '../models/ExpenseCategory';
import { IUserDocument } from '../models/User';
import { NotificationService } from '../services/notificationService';
import { settleBackgroundTasks } from '../utils/background';
import { createUser, bearer } from './helpers';

async function world() {
  const admin = await createUser('administrador', { firstName: 'Admin' });
  const staff = await createUser('staff', { firstName: 'Educadora' });
  const parentA = await createUser('responsavel', { firstName: 'Mãe' });
  const parentB = await createUser('responsavel', { firstName: 'Pai' });
  const [classX, classY] = await Class.create([
    { name: 'Turma X', min_age_months: 12, max_age_months: 36, capacity: 10 },
    { name: 'Turma Y', min_age_months: 36, max_age_months: 60, capacity: 10 }
  ]);
  await StaffAssignment.create({ staff_id: staff._id, class_id: classX._id });
  const [childA, childB] = await Child.create([
    { name: 'Criança A', birth_date: new Date('2024-01-01'), class_id: classX._id, parent_id: parentA._id },
    { name: 'Criança B', birth_date: new Date('2022-02-01'), class_id: classY._id, parent_id: parentB._id }
  ]);
  return { admin, staff, parentA, parentB, classX, classY, childA, childB };
}

const as = (user: IUserDocument) => ({
  get: (url: string) => request(app).get(`/api/v1${url}`).set('Authorization', bearer(user)),
  post: (url: string, body: object = {}) => request(app).post(`/api/v1${url}`).set('Authorization', bearer(user)).send(body),
  put: (url: string, body: object = {}) => request(app).put(`/api/v1${url}`).set('Authorization', bearer(user)).send(body),
  patch: (url: string, body: object = {}) => request(app).patch(`/api/v1${url}`).set('Authorization', bearer(user)).send(body),
  delete: (url: string) => request(app).delete(`/api/v1${url}`).set('Authorization', bearer(user))
});
const id = (doc: { _id?: unknown }) => String(doc._id);

describe('monthly reports: educators draft and submit, only the administration validates', () => {
  it('an educator can’t publish a report by setting its status', async () => {
    const w = await world();
    const staff = as(w.staff);
    const body = { child_id: id(w.childA), month: 10, year: 2026, general_notes: 'Bom mês.' };

    expect((await staff.post('/monthly-reports', { ...body, status: 'validated' })).status).toBe(403);
    const draft = await staff.post('/monthly-reports', { ...body, status: 'draft' });
    expect(draft.status).toBe(201);
    expect((await staff.post('/monthly-reports', body)).status).toBe(409);

    const reportId = draft.body.data._id;
    expect((await staff.put(`/monthly-reports/${reportId}`, { status: 'validated' })).status).toBe(403);
    expect((await staff.put(`/monthly-reports/${reportId}`, { status: 'submitted', rejection_reason: 'x' })).body.data).toMatchObject({ status: 'submitted', rejection_reason: '' });

    // Parents don't see it until validated
    expect((await as(w.parentA).get('/monthly-reports')).body.data).toHaveLength(0);
    expect((await as(w.admin).patch(`/monthly-reports/${reportId}/validate`)).status).toBe(200);
    expect((await as(w.parentA).get('/monthly-reports')).body.data).toHaveLength(1);

    // A validated report is final for the educator
    expect((await staff.put(`/monthly-reports/${reportId}`, { general_notes: 'Mudado' })).status).toBe(409);
    await settleBackgroundTasks();
  });
});

describe('events: educators manage their own classes’ events only', () => {
  it('refuses centre-wide events and other classes; allows their own', async () => {
    const w = await world();
    const staff = as(w.staff);
    const event = { title: 'Passeio', start_date: '2026-11-20T08:00:00Z' };

    expect((await staff.post('/calendar-events', event)).status).toBe(403);
    expect((await staff.post('/calendar-events', { ...event, class_id: id(w.classY) })).status).toBe(403);
    const mine = await staff.post('/calendar-events', { ...event, class_id: id(w.classX) });
    expect(mine.status).toBe(201);
    expect((await staff.put(`/calendar-events/${mine.body.data._id}`, { class_id: id(w.classY) })).status).toBe(403);

    const centreWide = await as(w.admin).post('/calendar-events', { ...event, title: 'Reunião de pais' });
    expect(centreWide.status).toBe(201);
    expect((await staff.put(`/calendar-events/${centreWide.body.data._id}`, { title: 'x' })).status).toBe(403);
    expect((await staff.delete(`/calendar-events/${centreWide.body.data._id}`)).status).toBe(403);
    expect((await staff.delete(`/calendar-events/${mine.body.data._id}`)).status).toBe(200);
  });
});

describe('monthly invoice run', () => {
  it('invoices every child of the chosen classes at their class’s amount, once per month', async () => {
    const w = await world();
    const newInvoice = jest.spyOn(NotificationService, 'newInvoice').mockResolvedValue(undefined as never);
    const body = {
      period: '2026-12',
      due_date: '2026-12-10',
      amounts: [
        { class_id: id(w.classX), amount: 4500 },
        { class_id: id(w.classY), amount: 5000 }
      ]
    };

    const first = await as(w.admin).post('/invoices/generate', body);
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ created: 2, skipped: 0 });
    const invoices = await Invoice.find({ period: '2026-12' }).sort({ amount: 1 });
    expect(invoices.map((i) => i.amount)).toEqual([4500, 5000]);
    expect(invoices[0].items[0].description).toBe('Propina Dezembro 2026');
    await settleBackgroundTasks();
    expect(newInvoice).toHaveBeenCalledTimes(2);

    const again = await as(w.admin).post('/invoices/generate', body);
    expect(again.body.data).toMatchObject({ created: 0, skipped: 2 });

    expect((await as(w.staff).post('/invoices/generate', body)).status).toBe(403);
    expect((await as(w.admin).post('/invoices/generate', { ...body, period: '2026-13' })).status).toBe(400);
    newInvoice.mockRestore();
  });
});

describe('expense categories', () => {
  it('lists all categories by default, and only active ones on request', async () => {
    const w = await world();
    await ExpenseCategory.create([{ name: 'Alimentação' }, { name: 'Antiga', is_active: false }]);
    expect((await as(w.admin).get('/expense-categories')).body.data.map((c: { name: string }) => c.name)).toEqual(['Alimentação', 'Antiga']);
    expect((await as(w.admin).get('/expense-categories?active_only=true')).body.data.map((c: { name: string }) => c.name)).toEqual(['Alimentação']);
  });
});
