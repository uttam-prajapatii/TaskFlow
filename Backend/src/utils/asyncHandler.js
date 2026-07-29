/**
 * A wrapper function to handle async/await errors in Express routes.
 * It passes any rejected promise/error to the next middleware (global error handler).
 * Prevents repetitive try-catch blocks in controllers.
 * 
 * @param {Function} fn - The asynchronous Express route/middleware handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  try {
    Promise.resolve(fn(req, res, next)).catch(next);
  } catch (err) {
    next(err);
  }
};

export default asyncHandler;
