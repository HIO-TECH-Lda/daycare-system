import request from 'supertest';
import { Types } from 'mongoose';
import { app } from '../app';
import Class from '../models/Class';
import Child from '../models/Child';
import StaffAssignment from '../models/StaffAssignment';
import Attendance from '../models/Attendance';
import DailyReport from '../models/DailyReport';
import MonthlyReport from '../models/MonthlyReport';
import ReportPhoto from '../models/ReportPhoto';
import Guardian from '../models/Guardian';
import PickupPerson from '../models/PickupPerson';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import CalendarEvent from '../models/CalendarEvent';
import ExpenseCategory from '../models/ExpenseCategory';
import Expense from '../models/Expense';
import { IUserDocument } from '../models/User';
import { createUser, bearer } from './helpers';

/**
 * Two families in two classes:
 *   parentA → childA in class X      parentB → childB in class Y
 *   staffX is assigned to class X; staffNone has no class; admin sees everything.
 */
async function world() {
  const admin = await createUser('administrador');
  const staffX = await createUser('staff');
  const staffNone = await createUser('staff');
  const parentA = await createUser('responsavel');
  const parentB = await createUser('responsavel');

  const [classX, classY] = await Class.create([
    { name: 'Turma X', min_age_months: 12, max_age_months: 24, capacity: 10 },
    { name: 'Turma Y', min_age_months: 24, max_age_months: 36, capacity: 10 }
  ]);
  await StaffAssignment.create({ staff_id: staffX._id, class_id: classX._id });
  const [childA, childB] = await Child.create([
    { name: 'Criança A', birth_date: new Date('2024-01-01'), class_id: classX._id, parent_id: parentA._id },
    { name: 'Criança B', birth_date: new Date('2023-01-01'), class_id: classY._id, parent_id: parentB._id }
  ]);

  const perChild = async (child: typeof childA, parent: IUserDocument) => {
    const attendance = await Attendance.create({ child_id: child._id, date: new Date(), status: 'present', recorded_by: admin._id });
    const daily = await DailyReport.create({ child_id: child._id, date: new Date(), created_by: admin._id });
    const photo = await ReportPhoto.create({ daily_report_id: daily._id, photo_url: 'https://example.com/p.jpg', uploaded_by: admin._id });
    const monthly = await MonthlyReport.create({ child_id: child._id, month: 10, year: 2026, created_by: admin._id, status: 'validated' });
    const draft = await MonthlyReport.create({ child_id: child._id, month: 9, year: 2026, created_by: admin._id, status: 'draft' });
    const guardian = await Guardian.create({ child_id: child._id, name: 'Avó', guardian_type: 2 });
    const pickup = await PickupPerson.create({ child_id: child._id, name: 'Tio', phone: '841000000' });
    const invoice = await Invoice.create({
      invoice_number: `INV-${child.name}`, child_id: child._id, parent_id: parent._id, issue_date: new Date(),
      due_date: new Date(), amount: 1000, status: 'pending', created_by: admin._id
    });
    const payment = await Payment.create({
      invoice_id: invoice._id, parent_id: parent._id, child_id: child._id, amount: 500,
      payment_date: new Date(), payment_method: 'cash', recorded_by: admin._id
    });
    return { attendance, daily, photo, monthly, draft, guardian, pickup, invoice, payment };
  };

  const a = await perChild(childA, parentA);
  const b = await perChild(childB, parentB);
  const [eventAll, eventX, eventY] = await CalendarEvent.create([
    { title: 'Feriado', start_date: new Date(), created_by: admin._id },
    { title: 'Reunião X', start_date: new Date(), created_by: admin._id, class_id: classX._id },
    { title: 'Reunião Y', start_date: new Date(), created_by: admin._id, class_id: classY._id }
  ]);
  const category = await ExpenseCategory.create({ name: 'Alimentação' });
  await Expense.create({ category_id: category._id, amount: 100, description: 'Fruta', expense_date: new Date(), recorded_by: admin._id });

  return { admin, staffX, staffNone, parentA, parentB, classX, classY, childA, childB, a, b, eventAll, eventX, eventY };
}

type World = Awaited<ReturnType<typeof world>>;

const get = (user: IUserDocument, url: string) => request(app).get(`/api/v1${url}`).set('Authorization', bearer(user));
const ids = (body: { data: Array<{ _id?: string; id?: string }> }) => body.data.map((d) => String(d._id ?? d.id));
const id = (doc: { _id?: unknown }) => String(doc._id);

describe('per-role access to child records', () => {
  let w: World;
  beforeEach(async () => {
    w = await world();
  });

  // [path for one record, which record belongs to child A / child B]
  const singleRecords: Array<[string, (w: World, side: 'a' | 'b') => string]> = [
    ['child', (w, s) => `/children/${id(s === 'a' ? w.childA : w.childB)}`],
    ['attendance', (w, s) => `/attendance/${id(w[s].attendance)}`],
    ['daily report', (w, s) => `/daily-reports/${id(w[s].daily)}`],
    ['report photo', (w, s) => `/report-photos/${id(w[s].photo)}`],
    ['photos of a report', (w, s) => `/report-photos/report/${id(w[s].daily)}`],
    ['monthly report', (w, s) => `/monthly-reports/${id(w[s].monthly)}`],
    ['guardian', (w, s) => `/guardians/${id(w[s].guardian)}`],
    ['pickup person', (w, s) => `/pickup-persons/${id(w[s].pickup)}`],
    ['attendance by child', (w, s) => `/attendance/child/${id(s === 'a' ? w.childA : w.childB)}`],
    ['daily reports by child', (w, s) => `/daily-reports/child/${id(s === 'a' ? w.childA : w.childB)}`],
    ['monthly reports by child', (w, s) => `/monthly-reports/child/${id(s === 'a' ? w.childA : w.childB)}`],
    ['guardians by child', (w, s) => `/guardians/child/${id(s === 'a' ? w.childA : w.childB)}`],
    ['pickup persons by child', (w, s) => `/pickup-persons/child/${id(s === 'a' ? w.childA : w.childB)}`]
  ];

  it.each(singleRecords)('%s: parent A and staff X see child A’s, not child B’s; unassigned staff see neither; admin sees both', async (_name, path) => {
    for (const [user, seesA, seesB] of [
      [w.parentA, 200, 404], [w.staffX, 200, 404], [w.staffNone, 404, 404], [w.admin, 200, 200]
    ] as const) {
      expect([_name, (await get(user, path(w, 'a'))).status]).toEqual([_name, seesA]);
      expect([_name, (await get(user, path(w, 'b'))).status]).toEqual([_name, seesB]);
    }
  });

  // [list path, record of child A, record of child B]
  const lists: Array<[string, string, (w: World) => [unknown, unknown]]> = [
    ['children', '/children', (w) => [w.childA, w.childB]],
    ['attendance', '/attendance', (w) => [w.a.attendance, w.b.attendance]],
    ['attendance of today', `/attendance?date=${new Date().toISOString().slice(0, 10)}`, (w) => [w.a.attendance, w.b.attendance]],
    ['daily reports', '/daily-reports', (w) => [w.a.daily, w.b.daily]],
    ['monthly reports', '/monthly-reports', (w) => [w.a.monthly, w.b.monthly]],
    ['monthly reports of a month', '/monthly-reports?month=10&year=2026', (w) => [w.a.monthly, w.b.monthly]],
    ['guardians', '/guardians', (w) => [w.a.guardian, w.b.guardian]],
    ['pickup persons', '/pickup-persons', (w) => [w.a.pickup, w.b.pickup]]
  ];

  it.each(lists)('%s list only contains records in scope', async (_name, path, pick) => {
    const [recA, recB] = pick(w).map((r) => id(r as { _id: unknown }));
    const listed = async (user: IUserDocument) => ids((await get(user, path)).body);

    expect(await listed(w.parentA)).toEqual(expect.arrayContaining([recA]));
    expect(await listed(w.parentA)).not.toContain(recB);
    expect(await listed(w.staffX)).toEqual(expect.arrayContaining([recA]));
    expect(await listed(w.staffX)).not.toContain(recB);
    expect(await listed(w.staffNone)).toEqual([]);
    expect(await listed(w.admin)).toEqual(expect.arrayContaining([recA, recB]));
  });

  it('a child_id filter for someone else’s child is refused', async () => {
    for (const path of ['/attendance', '/daily-reports', '/monthly-reports', '/guardians', '/pickup-persons']) {
      expect([path, (await get(w.parentA, `${path}?child_id=${id(w.childB)}`)).status]).toEqual([path, 404]);
    }
  });

  it('parents only see validated monthly reports; staff see drafts', async () => {
    expect((await get(w.parentA, `/monthly-reports/${id(w.a.draft)}`)).status).toBe(404);
    expect(ids((await get(w.parentA, `/monthly-reports/child/${id(w.childA)}`)).body)).not.toContain(id(w.a.draft));
    expect(ids((await get(w.parentA, '/monthly-reports')).body)).not.toContain(id(w.a.draft));
    expect((await get(w.staffX, `/monthly-reports/${id(w.a.draft)}`)).status).toBe(200);
  });
});

describe('per-role access: writes by staff', () => {
  let w: World;
  beforeEach(async () => {
    w = await world();
  });

  it('staff can record attendance only for children in their classes', async () => {
    const send = (childId: unknown) => request(app).post('/api/v1/attendance').set('Authorization', bearer(w.staffX))
      .send({ child_id: id({ _id: childId }), date: new Date().toISOString(), status: 'present' });
    expect((await send(w.childA._id)).status).toBe(201);
    expect((await send(w.childB._id)).status).toBe(404);
  });

  it('staff cannot change or delete records of other classes', async () => {
    const auth = bearer(w.staffX);
    expect((await request(app).put(`/api/v1/attendance/${id(w.b.attendance)}`).set('Authorization', auth).send({ status: 'late' })).status).toBe(404);
    expect((await request(app).delete(`/api/v1/daily-reports/${id(w.b.daily)}`).set('Authorization', auth)).status).toBe(404);
    expect((await request(app).delete(`/api/v1/report-photos/${id(w.b.photo)}`).set('Authorization', auth)).status).toBe(404);
    // ...nor move a record of their class to a child of another class (updates can't change the child)
    await request(app).put(`/api/v1/attendance/${id(w.a.attendance)}`).set('Authorization', auth).send({ child_id: id(w.childB), status: 'late' });
    expect(String((await Attendance.findById(w.a.attendance._id))!.child_id)).toBe(id(w.childA));
  });

  it('staff cannot write reports or photos for other classes', async () => {
    const auth = bearer(w.staffX);
    const daily = await request(app).post('/api/v1/daily-reports').set('Authorization', auth)
      .send({ child_id: id(w.childB), date: new Date().toISOString() });
    expect(daily.status).toBe(404);
    const photo = await request(app).post('/api/v1/report-photos').set('Authorization', auth)
      .send({ daily_report_id: id(w.b.daily), photo_url: 'https://example.com/x.jpg' });
    expect(photo.status).toBe(404);
  });
});

describe('per-role access: finance and admin data', () => {
  let w: World;
  beforeEach(async () => {
    w = await world();
  });

  it('parents see only their own invoices and payments', async () => {
    expect(ids((await get(w.parentA, '/invoices')).body)).toEqual([id(w.a.invoice)]);
    expect((await get(w.parentA, `/invoices/${id(w.b.invoice)}`)).status).toBe(403);
    expect(ids((await get(w.parentA, '/payments')).body)).toEqual([id(w.a.payment)]);
    expect((await get(w.parentA, `/payments/${id(w.b.payment)}`)).status).toBe(404);
    expect((await get(w.parentA, `/payments/invoice/${id(w.b.invoice)}`)).status).toBe(404);
    expect((await get(w.parentA, `/payments?invoice_id=${id(w.b.invoice)}`)).status).toBe(404);
    expect((await get(w.parentA, `/payments/${id(w.a.payment)}`)).status).toBe(200);
  });

  it('staff have no access to invoices, payments or expenses', async () => {
    for (const path of ['/invoices', `/invoices/${id(w.a.invoice)}`, '/payments', `/payments/${id(w.a.payment)}`, '/expenses', '/expense-categories']) {
      expect([path, (await get(w.staffX, path)).status]).toEqual([path, 403]);
    }
  });

  it('expenses are admin-only', async () => {
    expect((await get(w.parentA, '/expenses')).status).toBe(403);
    expect((await get(w.admin, '/expenses')).status).toBe(200);
  });

  it('staff assignments are not visible to parents', async () => {
    expect((await get(w.parentA, '/staff-assignments')).status).toBe(403);
    expect((await get(w.staffX, '/staff-assignments')).status).toBe(200);
  });
});

describe('per-role access: calendar and users', () => {
  let w: World;
  beforeEach(async () => {
    w = await world();
  });

  it('class events are visible only to that class’s families and staff; centre-wide events to all', async () => {
    const seen = async (user: IUserDocument) => ids((await get(user, '/calendar-events')).body);
    expect(await seen(w.parentA)).toEqual(expect.arrayContaining([id(w.eventAll), id(w.eventX)]));
    expect(await seen(w.parentA)).not.toContain(id(w.eventY));
    expect(await seen(w.staffNone)).toEqual([id(w.eventAll)]);
    expect(await seen(w.admin)).toHaveLength(3);
    expect((await get(w.parentA, `/calendar-events/${id(w.eventY)}`)).status).toBe(404);
    expect(await seen(w.parentA)).not.toContain(id(w.eventY));
    expect(ids((await get(w.parentA, `/calendar-events?class_id=${id(w.classY)}`)).body)).toEqual([]);
  });

  it('staff only list the parents of their own classes (plus staff and admins)', async () => {
    const listed = ids((await get(w.staffX, '/users?limit=100')).body);
    expect(listed).toContain(id(w.parentA));
    expect(listed).not.toContain(id(w.parentB));
    expect(listed).toEqual(expect.arrayContaining([id(w.admin), id(w.staffNone)]));
    expect(ids((await get(w.admin, '/users?limit=100')).body)).toEqual(expect.arrayContaining([id(w.parentA), id(w.parentB)]));
  });

  it('a malformed id is a 400, not a crash', async () => {
    expect((await get(w.parentA, '/attendance/not-an-id')).status).toBe(400);
    expect((await get(w.parentA, `/attendance/child/${new Types.ObjectId().toString()}`)).status).toBe(404);
  });
});
