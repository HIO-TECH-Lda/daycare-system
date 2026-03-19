import multer from 'multer';

// Configure multer to handle multipart/form-data
// We use memory storage since we upload directly to Cloudinary
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware for single image upload (field name: 'image')
export const uploadSingleImage = upload.single('image');

// Middleware for avatar upload (field name: 'avatar')
export const uploadAvatar = upload.single('avatar');

// Middleware for multiple images (field name: 'images')
export const uploadMultipleImages = upload.array('images', 10);

