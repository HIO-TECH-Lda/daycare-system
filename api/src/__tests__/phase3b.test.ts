import request from 'supertest';
import { app } from '../app';
import Class from '../models/Class';
import Child from '../models/Child';
import StaffAssignment from '../models/StaffAssignment';
import Attendance from '../models/Attendance';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import PickupPerson from '../models/PickupPerson';
import { IUserDocument } from '../models/User';
import { startOfCentreDay } from '../utils/dates';
import { createUser, bearer } from './helpers';

async function world() {
  const admin = await createUser('administrador', { firstName: 'Admin' });
  const staff = await createUser('staff', { firstName: 'Educadora' });
  const parentA = await createUser('responsavel', { firstName: 'Mãe' });
  const parentB = await createUser('responsavel', { firstName: 'Pai' });
  const classX = await Class.create({ name: 'Turma X', min_age_months: 12, max_age_months: 36, capacity: 10 });
  await StaffAssignment.create({ staff_id: staff._id, class_id: classX._id });
  const [childA, childB] = await Child.create([
    { name: 'Criança A', birth_date: new Date('2024-01-01'), class_id: classX._id, parent_id: parentA._id },
    { name: 'Criança B', birth_date: new Date('2024-02-01'), class_id: classX._id, parent_id: parentB._id }
  ]);
  return { admin, staff, parentA, parentB, childA, childB };
}

const as = (user: IUserDocument) => ({
  get: (url: string) => request(app).get(`/api/v1${url}`).set('Authorization', bearer(user)),
  post: (url: string, body: object = {}) => request(app).post(`/api/v1${url}`).set('Authorization', bearer(user)).send(body),
  patch: (url: string, body: object = {}) => request(app).patch(`/api/v1${url}`).set('Authorization', bearer(user)).send(body),
  delete: (url: string) => request(app).delete(`/api/v1${url}`).set('Authorization', bearer(user))
});
const id = (doc: { _id?: unknown }) => String(doc._id);
const DAY = 24 * 60 * 60 * 1000;

describe('absence notice (parents)', () => {
  it('records an excused absence for the parent’s own child, today or later', async () => {
    const w = await world();
    const res = await as(w.parentA).post('/attendance/absence-notice', { child_id: id(w.childA), date: new Date().toISOString(), reason: 'Doente' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'excused', notes: 'Aviso do encarregado: Doente' });

    // The educator sees it on today's list
    const today = startOfCentreDay(new Date()).toISOString().slice(0, 10);
    const list = (await as(w.staff).get(`/attendance?date=${today}`)).body.data;
    expect(list.map((a: { status: string }) => a.status)).toEqual(['excused']);
  });

  it('refuses other people’s children, past days, staff, and a child who already arrived', async () => {
    const w = await world();
    const today = new Date().toISOString();
    // Another family's child doesn't exist for this parent (404, as everywhere in the API)
    expect((await as(w.parentA).post('/attendance/absence-notice', { child_id: id(w.childB), date: today, reason: 'x' })).status).toBe(404);
    expect((await as(w.parentA).post('/attendance/absence-notice', { child_id: id(w.childA), date: new Date(Date.now() - 2 * DAY).toISOString(), reason: 'x' })).status).toBe(400);
    expect((await as(w.staff).post('/attendance/absence-notice', { child_id: id(w.childA), date: today, reason: 'x' })).status).toBe(403);

    await Attendance.create({ child_id: w.childA._id, date: startOfCentreDay(new Date()), status: 'present', check_in: new Date(), recorded_by: w.staff._id });
    const late = await as(w.parentA).post('/attendance/absence-notice', { child_id: id(w.childA), date: today, reason: 'x' });
    expect(late.status).toBe(409);
  });
});

describe('pickup person for today (parents)', () => {
  it('is visible to the educator today only, and the parent can cancel it', async () => {
    const w = await world();
    const created = await as(w.parentA).post('/pickup-persons/today', { child_id: id(w.childA), name: 'Tia Rosa', relationship: 'Tia', phone: '+258841234567' });
    expect(created.status).toBe(201);
    expect(created.body.data.valid_on).toBe(startOfCentreDay(new Date()).toISOString());

    let forStaff = (await as(w.staff).get('/pickup-persons')).body.data;
    expect(forStaff.map((p: { name: string }) => p.name)).toEqual(['Tia Rosa']);

    // Yesterday's one-day authorisation no longer counts
    await PickupPerson.updateOne({ _id: created.body.data._id }, { valid_on: startOfCentreDay(new Date(Date.now() - DAY)) });
    forStaff = (await as(w.staff).get('/pickup-persons')).body.data;
    expect(forStaff).toHaveLength(0);

    const again = await as(w.parentA).post('/pickup-persons/today', { child_id: id(w.childA), name: 'Avó', phone: '+258841234568' });
    expect((await as(w.parentB).delete(`/pickup-persons/today/${again.body.data._id}`)).status).toBe(404);
    expect((await as(w.parentA).delete(`/pickup-persons/today/${again.body.data._id}`)).status).toBe(200);
  });

  it('only for the parent’s own child; permanent authorisations stay with the administration', async () => {
    const w = await world();
    expect((await as(w.parentA).post('/pickup-persons/today', { child_id: id(w.childB), name: 'X', phone: '+258841234567' })).status).toBe(404);
    const permanent = await PickupPerson.create({ child_id: w.childA._id, name: 'Avó', phone: '+258841234569' });
    expect((await as(w.parentA).delete(`/pickup-persons/today/${id(permanent)}`)).status).toBe(404);
  });
});

describe('payment claims ("Já paguei")', () => {
  async function invoiceFor(parent: IUserDocument, child: { _id: unknown }, admin: IUserDocument) {
    return Invoice.create({
      invoice_number: `FT-${Math.random().toString(36).slice(2, 8)}`,
      child_id: child._id,
      parent_id: parent._id,
      issue_date: new Date(),
      due_date: new Date(Date.now() + 10 * DAY),
      amount: 4500,
      status: 'pending',
      items: [{ description: 'Propina', quantity: 1, unit_price: 4500, total: 4500 }],
      created_by: admin._id
    });
  }

  it('a parent claims; the administration confirms, which records the payment and settles the invoice', async () => {
    const w = await world();
    const invoice = await invoiceFor(w.parentA, w.childA, w.admin);

    const claim = await as(w.parentA).post('/payment-claims', { invoice_id: id(invoice), amount: 4500, method: 'mpesa', reference: 'MP123ABC' });
    expect(claim.status).toBe(201);
    expect(claim.body.data.status).toBe('pending');

    // One pending claim per invoice
    expect((await as(w.parentA).post('/payment-claims', { invoice_id: id(invoice), amount: 4500, method: 'mpesa', reference: 'MP999' })).status).toBe(409);

    const pending = (await as(w.admin).get('/payment-claims?status=pending')).body.data;
    expect(pending).toHaveLength(1);

    const confirmed = await as(w.admin).patch(`/payment-claims/${claim.body.data._id}/confirm`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('confirmed');
    const payments = await Payment.find({ invoice_id: invoice._id });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ amount: 4500, payment_method: 'mobile_money', payment_method_details: 'M-Pesa', reference_number: 'MP123ABC' });
    expect((await Invoice.findById(invoice._id))!.status).toBe('paid');

    expect((await as(w.admin).patch(`/payment-claims/${claim.body.data._id}/confirm`)).status).toBe(409);
  });

  it('needs a reference (except cash), refuses other parents’ invoices, and a rejection keeps the reason', async () => {
    const w = await world();
    const invoice = await invoiceFor(w.parentA, w.childA, w.admin);

    expect((await as(w.parentA).post('/payment-claims', { invoice_id: id(invoice), amount: 4500, method: 'emola' })).status).toBe(400);
    expect((await as(w.parentB).post('/payment-claims', { invoice_id: id(invoice), amount: 4500, method: 'cash' })).status).toBe(404);
    expect((await as(w.staff).get('/payment-claims')).status).toBe(403);

    const claim = await as(w.parentA).post('/payment-claims', { invoice_id: id(invoice), amount: 4500, method: 'cash' });
    expect(claim.status).toBe(201);
    expect((await as(w.parentA).patch(`/payment-claims/${claim.body.data._id}/reject`, { reason: 'x' })).status).toBe(403);

    const rejected = await as(w.admin).patch(`/payment-claims/${claim.body.data._id}/reject`, { reason: 'Não encontrámos o depósito' });
    expect(rejected.body.data).toMatchObject({ status: 'rejected', rejection_reason: 'Não encontrámos o depósito' });

    const mine = (await as(w.parentA).get('/payment-claims')).body.data;
    expect(mine).toHaveLength(1);
    expect((await as(w.parentB).get('/payment-claims')).body.data).toHaveLength(0);
  });
});
