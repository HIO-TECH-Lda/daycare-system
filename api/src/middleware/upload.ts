import multer from 'multer';
import { ApiError } from '../utils/ApiError';

// Vercel rejects request bodies above ~4.5 MB, so files are capped below that.
// The web app compresses photos before uploading.
export const MAX_UPLOAD_MB = 4;

const storage = multer.memoryStorage();

const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Apenas ficheiros de imagem são permitidos'));
  }
};

const imageOrPdfFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Apenas ficheiros de imagem ou PDF são permitidos'));
  }
};

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }
});

const uploadFile = multer({
  storage,
  fileFilter: imageOrPdfFilter,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }
});

/** Single image upload — field name: `avatar` (for user profile) */
export const uploadAvatar = uploadImage.single('avatar');

/** Single image upload — field name: `photo` (for children, pickup persons, report photos) */
export const uploadPhoto = uploadImage.single('photo');

/** Single image or PDF upload — field name: `receipt` (for expenses) */
export const uploadReceipt = uploadFile.single('receipt');

/** Generic single image — field name: `image` */
export const uploadSingleImage = uploadImage.single('image');

/** Generic multiple images — field name: `images` */
export const uploadMultipleImages = uploadImage.array('images', 10);

export const upload = uploadImage;
