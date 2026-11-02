import request from 'supertest';
import { v2 as cloudinary } from 'cloudinary';
import { app } from '../app';
import Class from '../models/Class';
import Child from '../models/Child';
import DailyReport from '../models/DailyReport';
import ReportPhoto from '../models/ReportPhoto';
import { CloudinaryService } from '../services/cloudinaryService';
import { mediaUrl, verifyMediaLink } from '../utils/media';
import { createUser, bearer } from './helpers';

const PRIVATE_PHOTO = 'https://res.cloudinary.com/demo/image/authenticated/v1700000000/sonho/report-photos/abc123.jpg';
const PUBLIC_PHOTO = 'https://images.example.com/old-photo.jpg';

/** Path + query of a signed link, for supertest. */
const pathOf = (link: string) => link.replace(/^https?:\/\/[^/]+/, '');

async function setup(photoUrl = PRIVATE_PHOTO) {
  const admin = await createUser('administrador');
  const parent = await createUser('responsavel');
  const otherParent = await createUser('responsavel');
  const klass = await Class.create({ name: 'Turma X', min_age_months: 12, max_age_months: 24, capacity: 10 });
  const child = await Child.create({ name: 'Criança A', birth_date: new Date('2024-01-01'), class_id: klass._id, parent_id: parent._id, photo_url: photoUrl });
  const report = await DailyReport.create({ child_id: child._id, date: new Date(), created_by: admin._id });
  const photo = await ReportPhoto.create({ daily_report_id: report._id, photo_url: photoUrl, uploaded_by: admin._id });
  return { admin, parent, otherParent, child, report, photo };
}

describe('photo links', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
  });
  afterEach(() => {
    for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
    }
  });

  it('API responses carry a signed media link, never the storage URL', async () => {
    const { parent, child, report, photo } = await setup();

    const photos = await request(app).get(`/api/v1/report-photos/report/${report._id}`).set('Authorization', bearer(parent));
    expect(photos.status).toBe(200);
    expect(photos.body.data[0].photo_url).toMatch(new RegExp(`/api/v1/media/report-photos/${photo._id}\\?exp=\\d+&sig=`));

    const kid = await request(app).get(`/api/v1/children/${child._id}`).set('Authorization', bearer(parent));
    expect(kid.body.data.photo_url).toMatch(new RegExp(`/api/v1/media/children/${child._id}\\?`));
    expect(JSON.stringify([photos.body, kid.body])).not.toContain('res.cloudinary.com');
  });

  it('serves a private photo by fetching it from Cloudinary with a signature', async () => {
    const { parent, report } = await setup();
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(Buffer.from('JPEGDATA'), { status: 200, headers: { 'content-type': 'image/jpeg' } })
    );

    const photos = await request(app).get(`/api/v1/report-photos/report/${report._id}`).set('Authorization', bearer(parent));
    // No Authorization header: the signed link is the permission
    const res = await request(app).get(pathOf(photos.body.data[0].photo_url));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toMatch(/^private, max-age=\d+$/);
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.from(res.body).toString()).toBe('JPEGDATA');

    const fetched = String(fetchSpy.mock.calls[0][0]);
    expect(fetched).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\/image\/authenticated\/s--[^/]+--\//);
    expect(fetched).toContain('w_1600');
  });

  it('redirects to older public photos instead of fetching arbitrary URLs', async () => {
    const { child } = await setup(PUBLIC_PHOTO);
    const fetchSpy = jest.spyOn(global, 'fetch');

    const res = await request(app).get(pathOf(mediaUrl('children', child._id)));
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(PUBLIC_PHOTO);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses tampered, re-used or expired links', async () => {
    const { child, photo } = await setup();
    const link = pathOf(mediaUrl('report-photos', photo._id));

    expect((await request(app).get(link.replace(/sig=./, 'sig=X'))).status).toBe(403);
    // A valid signature for one record doesn't open another
    expect((await request(app).get(link.replace(String(photo._id), String(child._id)))).status).toBe(403);
    expect((await request(app).get(link.replace('/report-photos/', '/children/'))).status).toBe(403);
    expect((await request(app).get(`/api/v1/media/report-photos/${photo._id}`)).status).toBe(403);

    const url = new URL(mediaUrl('report-photos', photo._id));
    const [exp, sig] = [url.searchParams.get('exp'), url.searchParams.get('sig')];
    expect(verifyMediaLink('report-photos', String(photo._id), exp, sig)).toBeGreaterThan(0);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3 * 60 * 60 * 1000);
    expect(verifyMediaLink('report-photos', String(photo._id), exp, sig)).toBeNull();
  });

  it('keeps the stored photo when a client sends back the media link it was given', async () => {
    const { admin, child } = await setup();
    const res = await request(app).put(`/api/v1/children/${child._id}`).set('Authorization', bearer(admin))
      .send({ name: 'Criança A', photo_url: mediaUrl('children', child._id) });

    expect(res.status).toBe(200);
    expect((await Child.findById(child._id))!.photo_url).toBe(PRIVATE_PHOTO);
  });

  it('uploads children and report photos as private files; avatars stay public', async () => {
    const uploads: Array<Record<string, unknown>> = [];
    jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(((options: Record<string, unknown>, callback: any) => {
      uploads.push(options);
      callback(undefined, { secure_url: 'https://res.cloudinary.com/demo/x.jpg', public_id: 'x' });
      return { end: () => undefined };
    }) as any);

    await CloudinaryService.upload(Buffer.from('a'), 'report-photos');
    await CloudinaryService.upload(Buffer.from('a'), 'children');
    await CloudinaryService.upload(Buffer.from('a'), 'avatars');

    expect(uploads.map((u) => u.type)).toEqual(['authenticated', 'authenticated', 'upload']);
  });
});
