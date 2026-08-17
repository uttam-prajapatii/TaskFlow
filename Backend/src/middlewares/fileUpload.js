import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BadRequestError } from '../utils/errors.js';

// Ensure the local upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Higher-order middleware function to configure file upload constraints.
 * Returns a middleware that validates mimeType, file size, and catches Multer exceptions.
 */
export const configureUpload = ({
  allowedMimeTypes = [],
  maxSizeInBytes = 10 * 1024 * 1024, // 10MB default
} = {}) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const parsed = path.parse(file.originalname);
      const cleanName = parsed.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${cleanName}-${uniqueSuffix}${parsed.ext}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      return cb(new BadRequestError(`File type '${file.mimetype}' is not allowed`), false);
    }
    cb(null, true);
  };

  const upload = multer({
    storage,
    limits: { fileSize: maxSizeInBytes },
    fileFilter,
  }).single('file'); // We expect the file field name in form-data to be 'file'

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new BadRequestError(`File size exceeds the limit of ${maxSizeInBytes / (1024 * 1024)}MB`));
          }
          return next(new BadRequestError(`File upload error: ${err.message}`));
        }
        return next(err);
      }
      next();
    });
  };
};
