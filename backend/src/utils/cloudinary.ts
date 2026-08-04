import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL || 
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (isCloudinaryConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

/**
 * Uploads a temp file to Cloudinary (if configured) or converts to Data URI fallback for Vercel Serverless compatibility.
 * @param filePath Path to the temp file in /tmp
 * @returns The URL of the image
 */
export async function uploadToCloudinary(filePath: string): Promise<string> {
  if (!isCloudinaryConfigured) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).replace('.', '').toLowerCase() || 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      
      // Clean up tmp file
      fs.unlink(filePath, () => {});
      return dataUri;
    } catch (e) {
      console.error('Failed to convert image to Data URI fallback:', e);
      return '';
    }
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'qr-menu',
    });
    
    // Clean up tmp file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Failed to delete tmp file: ${filePath}`, err);
      }
    });

    return result.secure_url;
  } catch (error) {
    console.warn('Cloudinary upload failed, using Data URI fallback:', error);
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).replace('.', '').toLowerCase() || 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      
      fs.unlink(filePath, () => {});
      return dataUri;
    } catch (e) {
      return '';
    }
  }
}
