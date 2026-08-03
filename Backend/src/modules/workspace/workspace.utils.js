import crypto from 'crypto';
import workspaceRepository from './workspace.repository.js';

/**
 * Utility to convert name into a slug format.
 */
export function slugify(text) {
  const str = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w-]+/g, '')     // Remove non-word chars
    .replace(/-+/g, '-');        // Collapse multiple -

  // Trim leading/trailing dashes (no regex)
  let start = 0;
  let end = str.length;

  while (start < end && str[start] === '-') start++;
  while (end > start && str[end - 1] === '-') end--;

  return str.slice(start, end);
}

/**
 * Generate a unique slug, appending a short random hex string if a collision occurs.
 */
export async function generateUniqueSlug(name) {
  let slug = slugify(name);
  if (!slug) {
    slug = 'workspace';
  }

  const existing = await workspaceRepository.findWorkspaceBySlug(slug);
  if (!existing) {
    return slug;
  }

  const suffix = crypto.randomBytes(3).toString('hex'); // 6 hex characters
  return `${slug}-${suffix}`;
}

/**
 * Helper to safely extract string ID from Mongoose object or string.
 */
export const getStrId = (val) => (val?._id ? val._id.toString() : (val?.toString() || ''));

/**
 * Generate a cryptographically secure random token.
 */
export const generateRandomToken = () => crypto.randomBytes(32).toString('hex');
