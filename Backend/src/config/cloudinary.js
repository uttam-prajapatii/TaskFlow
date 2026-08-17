import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test' || (typeof globalThis.describe === 'function' && typeof globalThis.test === 'function');
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
 * Helper to determine MIME type from file extension or file object.
 */
const getMimeType = (filePath, fileObj) => {
  if (fileObj && fileObj.mimetype) return fileObj.mimetype;
  const ext = path.extname(filePath || '').toLowerCase();
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.zip': 'application/zip',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

/**
 * Uploads a local file to Cloudinary and deletes it from local disk when finished.
 * If a buffer is passed, it writes to a temp file, uploads, and deletes it.
 * Under Bun runtime, it avoids streams by reading the file and uploading as a base64 data URI.
 */
export const uploadStream = async (file, options = {}) => {
  let filePath = null;
  let isTempFile = false;
  let uploadSource = null;

  try {
    const isBun = typeof Bun !== 'undefined';

    // Resolve file path or buffer to read from
    let buffer = null;
    let mimeType = 'application/octet-stream';

    if (typeof file === 'string') {
      filePath = file;
      if (isBun) {
        buffer = await fs.promises.readFile(filePath);
        mimeType = getMimeType(filePath, null);
      }
    } else if (file && file.path) {
      filePath = file.path;
      if (isBun) {
        buffer = await fs.promises.readFile(filePath);
        mimeType = getMimeType(filePath, file);
      }
    } else if (file && file.buffer) {
      if (isBun) {
        buffer = file.buffer;
        mimeType = file.mimetype || 'application/octet-stream';
      } else {
        // Create a temporary file from buffer
        const tempDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        filePath = path.join(tempDir, `temp_${Date.now()}_${Math.round(Math.random() * 1e9)}`);
        await fs.promises.writeFile(filePath, file.buffer);
        isTempFile = true;
      }
    } else if (Buffer.isBuffer(file)) {
      if (isBun) {
        buffer = file;
        mimeType = 'application/octet-stream';
      } else {
        // Create a temporary file from raw buffer
        const tempDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        filePath = path.join(tempDir, `temp_${Date.now()}_${Math.round(Math.random() * 1e9)}`);
        await fs.promises.writeFile(filePath, file);
        isTempFile = true;
      }
    }

    if (isBun && buffer) {
      const base64 = buffer.toString('base64');
      uploadSource = `data:${mimeType};base64,${base64}`;
    } else {
      uploadSource = filePath;
    }

    if (!uploadSource) {
      throw new Error('Invalid file source. Must be a file path, file object, or buffer.');
    }

    // Adapt folder option to asset_folder to achieve short URLs while maintaining hierarchical folders in the dashboard
    const uploadOptions = {
      resource_type: 'auto',
      use_asset_folder_as_public_id_prefix: false,
      ...options
    };

    if (uploadOptions.folder && !uploadOptions.asset_folder) {
      uploadOptions.asset_folder = uploadOptions.folder;
      delete uploadOptions.folder;
    }

    if (!isCloudinaryConfigured || isTest) {
      const mockPublicId = uploadOptions.public_id || `mock_file_${Date.now()}`;
      return {
        public_id: mockPublicId,
        secure_url: `https://res.cloudinary.com/mock-cloud/image/upload/v1234567/${mockPublicId}.png`
      };
    }

    // Upload to Cloudinary using uploadSource (either base64 data URI on Bun, or file path on Node)
    return await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(uploadSource, uploadOptions, (error, result) => {
        if (error) {
          logger.error('Cloudinary direct file upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  } finally {
    // Delete the file from local storage
    if (filePath) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          logger.info(`Successfully deleted local file: ${filePath}`);
        }
      } catch (cleanupError) {
        logger.warn(`Failed to delete local file ${filePath}: ${cleanupError.message}`);
      }
    }
  }
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
