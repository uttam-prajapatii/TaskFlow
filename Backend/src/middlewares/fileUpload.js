import multer from 'multer';
import { BadRequestError } from '../utils/errors.js';

/**
 * Higher-order middleware function to configure file upload constraints.
 * Returns a middleware that validates mimeType, file size, and catches Multer exceptions.
 */
export const configureUpload = ({
  allowedMimeTypes = [],
  maxSizeInBytes = 10 * 1024 * 1024, // 10MB default
} = {}) => {
  const storage = multer.memoryStorage();

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
