import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

const isTest = process.env.NODE_ENV === 'test';
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured && !isTest) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} else {
  logger.warn('Cloudinary not configured or running in test mode. Using mock uploader.');
}

/**
 * Uploads a file buffer to Cloudinary using upload_stream.
 * Options carry folder structure and custom public_id naming.
 */
export const uploadStream = (fileBuffer, options = {}) => {
  if (!isCloudinaryConfigured || isTest) {
    const mockFolder = options.folder || 'taskflow/mock';
    const mockPublicId = options.public_id || `mock_file_${Date.now()}`;
    return Promise.resolve({
      public_id: `${mockFolder}/${mockPublicId}`,
      secure_url: `https://res.cloudinary.com/mock-cloud/image/upload/v1234567/${mockFolder}/${mockPublicId}.png`
    });
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary stream upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Deletes a file from Cloudinary by its publicId and resourceType.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!isCloudinaryConfigured || isTest) {
    return Promise.resolve({ result: 'ok' });
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) {
        logger.error('Cloudinary delete error:', error);
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};
