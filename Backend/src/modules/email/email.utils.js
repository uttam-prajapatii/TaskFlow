import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedLogoDataUri = null;

function getLogoSrc() {
  if (process.env.EMAIL_LOGO_URL) {
    return process.env.EMAIL_LOGO_URL;
  }
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    // Look for logo.png in templates folder first, then Frontend/public/logo.png
    let logoPath = path.join(__dirname, 'templates', 'logo.png');
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(__dirname, '../../../../Frontend/public/logo.png');
    }
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      cachedLogoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      return cachedLogoDataUri;
    }
  } catch (e) {
    // fallback
  }
  return `${process.env.APP_BASE_URL || 'https://taskflow.app'}/logo.png`;
}

/**
 * Loads an HTML email template and replaces placeholders with provided variables.
 * 
 * @param {string} templateName - The name of the HTML file (without extension)
 * @param {Object} variables - Key-value pairs for placeholders replacement
 * @returns {Promise<string>} The parsed and formatted HTML content
 */
export async function renderTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found at path: ${templatePath}`);
  }

  let htmlContent = await fs.promises.readFile(templatePath, 'utf8');

  // Inject defaults
  const baseUrl = process.env.APP_BASE_URL || 'https://taskflow.app';
  const logoSrc = getLogoSrc();
  
  const allVariables = {
    APP_BASE_URL: baseUrl,
    LOGO_URL: logoSrc,
    YEAR: new Date().getFullYear(),
    ...variables,
  };

  // Replace {{variableName}} in template content
  for (const [key, value] of Object.entries(allVariables)) {
    const regexSafeKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const placeholder = new RegExp(`{{${regexSafeKey}}}`, 'g');
    htmlContent = htmlContent.replace(placeholder, value !== undefined && value !== null ? String(value) : '');
  }

  return htmlContent;
}
