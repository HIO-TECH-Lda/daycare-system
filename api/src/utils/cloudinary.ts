import { v2 as cloudinary } from 'cloudinary';

// Configure from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string
});

export interface UploadedImage {
  url: string;
  publicId: string;
}

export async function uploadBase64Image(base64OrUrl: string, folder = 'products'): Promise<UploadedImage> {
  // If it's already a URL, return it as-is with empty publicId
  if (/^https?:\/\//i.test(base64OrUrl)) {
    return { url: base64OrUrl, publicId: '' };
  }

  const baseFolder = process.env.CLOUDINARY_FOLDER_NAME || 'api-starter';
  const res = await cloudinary.uploader.upload(base64OrUrl, {
    folder: `${baseFolder}/${folder}`,
    resource_type: 'image'
  });

  return { url: res.secure_url, publicId: res.public_id };
}

export async function deleteImage(publicId?: string): Promise<void> {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // ignore
  }
}


