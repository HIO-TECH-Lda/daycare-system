import { Router, Request, Response } from 'express';
import { Model } from 'mongoose';
import Child from '../models/Child';
import ReportPhoto from '../models/ReportPhoto';
import PickupPerson from '../models/PickupPerson';
import Expense from '../models/Expense';
import { CloudinaryService } from '../services/cloudinaryService';
import { MEDIA_KINDS, MediaKind, verifyMediaLink } from '../utils/media';
import { catchAsync } from '../utils/catchAsync';

// Which record field holds the stored file URL, per kind of media link
const SOURCES: Record<MediaKind, { model: Model<any>; field: string }> = {
  children: { model: Child, field: 'photo_url' },
  'report-photos': { model: ReportPhoto, field: 'photo_url' },
  'pickup-persons': { model: PickupPerson, field: 'photo_url' },
  receipts: { model: Expense, field: 'receipt_url' }
};

const FETCH_TIMEOUT_MS = 15_000;

const router = Router();

/**
 * GET /api/v1/media/:kind/:id?exp=…&sig=…
 * No login header (an <img> can't send one): the signed link is the permission, and only users
 * allowed to see the record are given it. See utils/media.
 */
router.get('/:kind/:id', catchAsync(async (req: Request, res: Response) => {
  const kind = req.params.kind as MediaKind;
  const remaining = MEDIA_KINDS.includes(kind) ? verifyMediaLink(kind, req.params.id, req.query.exp, req.query.sig) : null;
  if (remaining === null) {
    return res.status(403).json({ success: false, message: 'Link inválido ou expirado' });
  }

  const { model, field } = SOURCES[kind];
  const record = await model.findById(req.params.id).select(field).lean<Record<string, string>>();
  const stored = record?.[field];
  if (!stored) {
    return res.status(404).json({ success: false, message: 'Ficheiro não encontrado' });
  }

  // Files that aren't private on our Cloudinary account (older uploads, external URLs) are
  // already public: send the browser there rather than fetching arbitrary URLs from the server.
  if (!CloudinaryService.isPrivateAsset(stored)) {
    return res.redirect(302, stored);
  }

  const upstream = await fetch(CloudinaryService.signedFetchUrl(stored), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!upstream.ok) {
    console.error(`[media] Cloudinary answered ${upstream.status} for ${kind}/${req.params.id}`);
    return res.status(502).json({ success: false, message: 'Não foi possível obter o ficheiro' });
  }

  res.set({
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
    // Only this browser may cache it, and not beyond the link's validity
    'Cache-Control': `private, max-age=${remaining}`,
    // The web app (another origin) must be allowed to display it; helmet defaults to same-origin
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff'
  });
  return res.send(Buffer.from(await upstream.arrayBuffer()));
}));

export default router;
