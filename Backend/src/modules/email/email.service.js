import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import logger from '../../utils/logger.js';
import { renderTemplate } from './email.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = new Resend(resendApiKey);

console.log("Resend API Key : ", resendApiKey);
if (resendApiKey) {
  logger.info('Resend Email Service configured and ready');
} else {
  logger.warn('Resend API Key is missing (RESEND_API_KEY). Emails will fail to send.');
}

/**
 * Shared low-level function to load templates, replace variables, and send email.
 * 
 * @param {Object} options - Email sending configurations
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.templateName - HTML template name
 * @param {Object} options.variables - Key-value variables to interpolate
 * @returns {Promise<Object>} Mail sending metadata
 */
export async function sendEmail({ to, subject, templateName, variables }) {
  try {
    let logoPath = path.join(__dirname, 'templates', 'logo.png');
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(__dirname, '../../../../Frontend/public/logo.png');
    }
    const hasLogoFile = fs.existsSync(logoPath);

    let htmlContent = await renderTemplate(templateName, variables);

    // Replace data URI or LOGO_URL with cid:taskflow-logo for email clients
    if (hasLogoFile) {
      htmlContent = htmlContent.replace(/src="data:image\/png;base64,[^"]+"/g, 'src="cid:taskflow-logo"');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
      to,
      subject,
      html: htmlContent,
      attachments: hasLogoFile ? [
        {
          filename: 'logo.png',
          path: logoPath,
          contentId: 'taskflow-logo',
        }
      ] : [],
    };

    const { data, error } = await resend.emails.send(mailOptions);

    if (error) {
      throw new Error(`Resend API Error: ${error.message} (status: ${error.statusCode})`);
    }

    logger.info(`Email sent successfully. id=${data.id} to=${to} template=${templateName}`);
    return data;
  } catch (error) {
    logger.error(`Error sending email to=${to} template=${templateName}: ${error.message}`, {
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Sends a workspace invitation email.
 * 
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.workspaceName - Name of the workspace the user is invited to
 * @param {string} params.inviteToken - Secret invitation token for verification
 * @returns {Promise<Object>} Mail sending metadata
 */
export async function sendInviteEmail({ toEmail, workspaceName, inviteToken }) {
  const inviteUrl = `${process.env.APP_BASE_URL || 'https://taskflow.app'}/workspaces/invite/${inviteToken}`;
  return sendEmail({
    to: toEmail,
    subject: `You have been invited to join the ${workspaceName} workspace`,
    templateName: 'invite',
    variables: {
      workspaceName,
      inviteUrl,
    },
  });
}

/**
 * Sends a task assignment email.
 * 
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.taskTitle - Title of the assigned task
 * @param {string} params.assignedByName - Name of the user who assigned the task
 * @param {string} params.taskUrl - Direct link URL to the task
 * @returns {Promise<Object>} Mail sending metadata
 */
export async function sendAssignmentEmail({ toEmail, taskTitle, assignedByName, taskUrl }) {
  return sendEmail({
    to: toEmail,
    subject: `Task Assigned: "${taskTitle}"`,
    templateName: 'assignment',
    variables: {
      taskTitle,
      assignedByName,
      taskUrl,
    },
  });
}

/**
 * Sends a comment mention notification email.
 * 
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.mentionedByName - Name of the user who mentioned the recipient
 * @param {string} params.commentSnippet - A short preview snippet of the comment text
 * @param {string} params.taskUrl - Direct link URL to the task
 * @returns {Promise<Object>} Mail sending metadata
 */
export async function sendMentionEmail({ toEmail, mentionedByName, commentSnippet, taskUrl }) {
  return sendEmail({
    to: toEmail,
    subject: `${mentionedByName} mentioned you in a comment`,
    templateName: 'mention',
    variables: {
      mentionedByName,
      commentSnippet,
      taskUrl,
    },
  });
}

/**
 * Sends a due date reminder email.
 * 
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.taskTitle - Title of the task due soon
 * @param {string|Date} params.dueDate - Date when the task is due
 * @param {string} params.taskUrl - Direct link URL to the task
 * @returns {Promise<Object>} Mail sending metadata
 */
export async function sendDueDateReminderEmail({ toEmail, taskTitle, dueDate, taskUrl }) {
  const formattedDate = new Date(dueDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return sendEmail({
    to: toEmail,
    subject: `Reminder: Task "${taskTitle}" is due soon`,
    templateName: 'dueDateReminder',
    variables: {
      taskTitle,
      dueDate: formattedDate,
      taskUrl,
    },
  });
}

/**
 * Sends a password reset verification link email.
 * 
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.resetToken - Password reset token
 * @returns {Promise<Object>} Mail sending metadata
 */
export async function sendPasswordResetEmail({ toEmail, resetToken }) {
  const resetUrl = `${process.env.APP_BASE_URL || 'https://taskflow.app'}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: toEmail,
    subject: 'Reset your TaskFlow password',
    templateName: 'passwordReset',
    variables: {
      resetUrl,
    },
  });
}
