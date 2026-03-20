import { v2 as cloudinary } from 'cloudinary';

export type CloudinaryFolder = 'avatars' | 'children' | 'pickup-persons' | 'report-photos' | 'receipts';

export interface UploadResult {
  url: string;
  publicId: string;
}

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary.
   * Throws if Cloudinary credentials are not set.
   */
  static async upload(
    buffer: Buffer,
    folder: CloudinaryFolder,
    options?: { resourceType?: 'image' | 'raw' | 'auto' }
  ): Promise<UploadResult> {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
      );
    }

    configure();

    const base = process.env.CLOUDINARY_FOLDER_NAME || 'sonho-de-crianca';
    const fullFolder = `${base}/${folder}`;
    const resourceType = options?.resourceType ?? 'auto';

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: fullFolder,
          resource_type: resourceType,
          overwrite: true,
          // Auto-optimise images; skip transformation for raw files (PDFs)
          ...(resourceType !== 'raw' && {
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
          })
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload returned no result'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  }

  /**
   * Delete an asset from Cloudinary by its public_id.
   * Silently skips if not configured.
   */
  static async delete(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
    if (!isCloudinaryConfigured()) return;
    configure();
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }

  /**
   * Extract the public_id from a Cloudinary secure_url so it can be deleted.
   * Returns null if the URL is not a Cloudinary URL.
   */
  static extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
    return match ? match[1] : null;
  }
}
