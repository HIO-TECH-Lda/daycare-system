import request from 'supertest';
import { app } from '../app';
import Enrollment from '../models/Enrollment';
import Class from '../models/Class';
import Child from '../models/Child';
import Guardian from '../models/Guardian';
import PickupPerson from '../models/PickupPerson';
import User from '../models/User';
import { EmailService } from '../services/emailService';
import { WhatsAppService } from '../services/whatsAppService';
import { settleBackgroundTasks } from '../utils/background';
import { createUser, bearer, tokenFromInviteLink, TEST_PASSWORD } from './helpers';

function form(overrides: Record<string, unknown> = {}) {
  return {
    child: { name: 'Lara Machava', birth_date: '2024-03-10', gender: 'Feminino', allergies: 'Amendoim' },
    guardians: [
      { name: 'Ana Machava', relationship: 'Mãe', phone: '84 123 4567', email: 'ana@example.com' },
      { name: 'Rui Machava', relationship: 'Pai', phone: '82 765 4321' }
    ],
    pickup_persons: [{ name: 'Teresa Machava', relationship: 'Avó', phone: '86 555 0000' }],
    consents: { data_processing: true, image_usage_authorized: true, whatsapp_opt_in: true },
    signature: 'Ana Machava',
    ...overrides
  };
}

const submit = (body: object, auth?: string) => {
  const req = request(app).post('/api/v1/enrollments');
  return (auth ? req.set('Authorization', auth) : req).send(body);
};

async function newClass(capacity = 10) {
  return Class.create({ name: 'Turma Girassol', min_age_months: 12, max_age_months: 36, capacity });
}

function spyOnChannels() {
  return {
    email: jest.spyOn(EmailService, 'send').mockResolvedValue(true),
    whatsapp: jest.spyOn(WhatsAppService, 'sendTemplate').mockResolvedValue(true)
  };
}

describe('submitting an enrolment', () => {
  it('stores the request and answers with a reference only', async () => {
    const channels = spyOnChannels();
    const res = await submit(form());

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ reference: `MAT-${new Date().getFullYear()}-0001`, status: 'submitted' });

    const stored = await Enrollment.findOne();
    expect(stored).toMatchObject({ source: 'public', status: 'submitted' });
    expect(stored!.guardians[0].phone).toBe('+258841234567');

    await settleBackgroundTasks();
    expect(channels.email).toHaveBeenCalledWith('enrollment-received', 'ana@example.com', expect.any(String), expect.objectContaining({ reference: res.body.data.reference }));
    expect(channels.whatsapp).toHaveBeenCalledWith('258841234567', 'sonho_enrollment_received', expect.any(String), expect.any(Array));

    expect((await submit(form())).body.data.reference).toBe(`MAT-${new Date().getFullYear()}-0002`);
  });

  it('does not use WhatsApp without consent', async () => {
    const channels = spyOnChannels();
    await submit(form({ consents: { data_processing: true, whatsapp_opt_in: false } }));
    await settleBackgroundTasks();
    expect(channels.whatsapp).not.toHaveBeenCalled();
  });

  it.each([
    ['without consent to data processing', { consents: { data_processing: false } }],
    ['without a contact for the main guardian', { guardians: [{ name: 'Ana Machava' }] }],
    ['with a birth date in the future', { child: { name: 'Lara', birth_date: '2099-01-01' } }],
    ['without guardians', { guardians: [] }],
    ['with an invalid phone', { guardians: [{ name: 'Ana Machava', phone: '123' }] }]
  ])('is refused %s', async (_case, overrides) => {
    expect((await submit(form(overrides))).status).toBe(400);
    expect(await Enrollment.countDocuments()).toBe(0);
  });

  it('quietly drops submissions that fill in the honeypot', async () => {
    const res = await submit(form({ website: 'https://spam.example' }));
    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^MAT-\d{4}-\d{4}$/);
    expect(await Enrollment.countDocuments()).toBe(0);
  });

  it('records requests entered by an admin as theirs', async () => {
    const admin = await createUser('administrador');
    await submit(form(), bearer(admin));
    const stored = await Enrollment.findOne();
    expect(stored!.source).toBe('admin');
    expect(String(stored!.submitted_by)).toBe(String(admin._id));
  });
});

describe('reviewing enrolments', () => {
  it('only admins can list or read requests', async () => {
    await submit(form());
    const staff = await createUser('staff');
    const admin = await createUser('administrador');

    expect((await request(app).get('/api/v1/enrollments')).status).toBe(401);
    expect((await request(app).get('/api/v1/enrollments').set('Authorization', bearer(staff))).status).toBe(403);
    const list = await request(app).get('/api/v1/enrollments?status=submitted').set('Authorization', bearer(admin));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('an admin can correct an open request and mark it under review', async () => {
    await submit(form());
    const admin = await createUser('administrador');
    const id = (await Enrollment.findOne())!._id;

    const res = await request(app).put(`/api/v1/enrollments/${id}`).set('Authorization', bearer(admin))
      .send({ status: 'under_review', notes: 'Visita marcada' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'under_review', notes: 'Visita marcada' });
  });

  it('rejecting records the reason and closes the request', async () => {
    await submit(form());
    const admin = await createUser('administrador');
    const id = (await Enrollment.findOne())!._id;
    const klass = await newClass();

    const res = await request(app).post(`/api/v1/enrollments/${id}/reject`).set('Authorization', bearer(admin)).send({ reason: 'Sem vagas para esta idade' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'rejected', rejection_reason: 'Sem vagas para esta idade' });

    expect((await request(app).post(`/api/v1/enrollments/${id}/approve`).set('Authorization', bearer(admin)).send({ class_id: String(klass._id) })).status).toBe(409);
    expect((await request(app).put(`/api/v1/enrollments/${id}`).set('Authorization', bearer(admin)).send({ notes: 'x' })).status).toBe(409);
  });
});

describe('approving an enrolment', () => {
  it('creates the parent account, child, guardians and pickup persons; the parent can then log in and see the child', async () => {
    const channels = spyOnChannels();
    await submit(form());
    const admin = await createUser('administrador');
    const klass = await newClass();
    const id = (await Enrollment.findOne())!._id;

    const res = await request(app).post(`/api/v1/enrollments/${id}/approve`).set('Authorization', bearer(admin))
      .send({ class_id: String(klass._id), start_date: '2027-01-15' });
    expect(res.status).toBe(200);
    expect(res.body.data.parent.created).toBe(true);
    expect(res.body.data.delivery).toEqual({ email: true, whatsapp: true });

    const parent = await User.findById(res.body.data.parent.id);
    expect(parent).toMatchObject({ firstName: 'Ana', lastName: 'Machava', phone: '+258841234567', email: 'ana@example.com', role: 'responsavel', status: 'invited', whatsappOptIn: true });

    const child = await Child.findById(res.body.data.child._id);
    expect(child).toMatchObject({ name: 'Lara Machava', allergies: 'Amendoim', image_usage_authorized: true, enrollment_signature: 'Ana Machava' });
    expect(String(child!.class_id)).toBe(String(klass._id));
    expect(String(child!.parent_id)).toBe(String(parent!._id));

    const guardians = await Guardian.find({ child_id: child!._id }).sort({ guardian_type: 1 });
    expect(guardians.map((g) => [g.name, g.guardian_type])).toEqual([['Ana Machava', 1], ['Rui Machava', 2]]);
    expect(await PickupPerson.countDocuments({ child_id: child!._id, is_authorized: true })).toBe(1);

    const enrollment = await Enrollment.findById(id);
    expect(enrollment).toMatchObject({ status: 'approved' });
    expect(String(enrollment!.child_id)).toBe(String(child!._id));

    await settleBackgroundTasks();
    expect(channels.email).toHaveBeenCalledWith('enrollment-approved', 'ana@example.com', expect.any(String), expect.objectContaining({ className: 'Turma Girassol', startDate: '15/01/2027' }));

    // The parent activates the account and sees exactly this child
    const token = tokenFromInviteLink(res.body.data.inviteLink);
    const accepted = await request(app).post('/api/v1/auth/accept-invite').send({ token, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD });
    const children = await request(app).get('/api/v1/children').set('Authorization', `Bearer ${accepted.body.data.token}`);
    expect(children.body.data.map((c: { name: string }) => c.name)).toEqual(['Lara Machava']);
  });

  it('links a second child to the family’s existing account', async () => {
    const parent = await createUser('responsavel', { phone: '841234567', email: 'ana@example.com' });
    await submit(form());
    const admin = await createUser('administrador');
    const klass = await newClass();
    const id = (await Enrollment.findOne())!._id;

    const res = await request(app).post(`/api/v1/enrollments/${id}/approve`).set('Authorization', bearer(admin)).send({ class_id: String(klass._id) });
    expect(res.status).toBe(200);
    expect(res.body.data.parent).toEqual({ id: String(parent._id), created: false });
    expect(res.body.data.inviteLink).toBeUndefined();
    expect(await User.countDocuments({ role: 'responsavel' })).toBe(1);
  });

  it('refuses when the guardian’s phone and email belong to different accounts, or to staff', async () => {
    await createUser('responsavel', { phone: '841234567' });
    await createUser('responsavel', { email: 'ana@example.com' });
    await submit(form());
    const admin = await createUser('administrador');
    const klass = await newClass();
    const id = (await Enrollment.findOne())!._id;

    expect((await request(app).post(`/api/v1/enrollments/${id}/approve`).set('Authorization', bearer(admin)).send({ class_id: String(klass._id) })).status).toBe(409);

    await User.deleteMany({ role: 'responsavel' });
    await createUser('staff', { phone: '841234567' });
    expect((await request(app).post(`/api/v1/enrollments/${id}/approve`).set('Authorization', bearer(admin)).send({ class_id: String(klass._id) })).status).toBe(409);
  });

  it('respects class capacity unless the admin overrides it', async () => {
    await submit(form());
    const admin = await createUser('administrador');
    const klass = await newClass(1);
    const other = await createUser('responsavel');
    await Child.create({ name: 'Já inscrito', birth_date: new Date('2024-01-01'), class_id: klass._id, parent_id: other._id });
    const id = (await Enrollment.findOne())!._id;
    const approve = (body: object) => request(app).post(`/api/v1/enrollments/${id}/approve`).set('Authorization', bearer(admin)).send(body);

    expect((await approve({ class_id: String(klass._id) })).status).toBe(409);
    expect((await approve({ class_id: String(klass._id), override_capacity: true })).status).toBe(200);
    // Approving twice is refused
    expect((await approve({ class_id: String(klass._id), override_capacity: true })).status).toBe(409);
  });

  it('creates nothing when approval fails part-way (transaction)', async () => {
    await submit(form());
    const admin = await createUser('administrador');
    const klass = await newClass();
    const id = (await Enrollment.findOne())!._id;
    jest.spyOn(PickupPerson, 'create').mockRejectedValueOnce(new Error('disk full'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await request(app).post(`/api/v1/enrollments/${id}/approve`).set('Authorization', bearer(admin)).send({ class_id: String(klass._id) });
    expect(res.status).toBe(500);

    expect(await User.countDocuments({ role: 'responsavel' })).toBe(0);
    expect(await Child.countDocuments()).toBe(0);
    expect(await Guardian.countDocuments()).toBe(0);
    expect((await Enrollment.findById(id))!.status).toBe('submitted');
  });
});
