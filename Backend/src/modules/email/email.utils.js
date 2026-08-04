import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const allVariables = {
    ...variables,
    APP_BASE_URL: process.env.APP_BASE_URL || 'https://taskflow.app',
    YEAR: new Date().getFullYear(),
  };

  // Replace {{variableName}} in template content
  for (const [key, value] of Object.entries(allVariables)) {
    const regexSafeKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const placeholder = new RegExp(`{{${regexSafeKey}}}`, 'g');
    htmlContent = htmlContent.replace(placeholder, value !== undefined && value !== null ? String(value) : '');
  }

  return htmlContent;
}
