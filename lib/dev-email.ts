/**
 * Development Email System
 * In-memory email logging for testing without production email provider
 * Replace sendEmail() implementation when moving to production
 */

interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  timestamp: Date;
  type: 'invite' | 'password-reset' | 'other';
}

// In-memory storage for sent emails
const sentEmails: EmailMessage[] = [];

/**
 * Send an email (development version - logs to console and memory)
 * In production, replace this with actual email provider (SendGrid, AWS SES, etc.)
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  type?: 'invite' | 'password-reset' | 'other';
}): Promise<{ messageId: string }> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const email: EmailMessage = {
    id: messageId,
    to: params.to,
    subject: params.subject,
    htmlBody: params.htmlBody,
    textBody: params.textBody,
    timestamp: new Date(),
    type: params.type || 'other',
  };

  sentEmails.push(email);

  // Log to console for development visibility
  console.log('📧 [DEV EMAIL]', {
    messageId,
    to: params.to,
    subject: params.subject,
    type: params.type || 'other',
    timestamp: email.timestamp.toISOString(),
  });

  // In development, you can view all sent emails at http://localhost:3000/api/dev/emails
  console.log('📧 View all emails at: http://localhost:3000/api/dev/emails');

  return { messageId };
}

/**
 * Get all sent emails (development only)
 */
export function getSentEmails(): EmailMessage[] {
  return [...sentEmails];
}

/**
 * Clear all sent emails
 */
export function clearSentEmails(): void {
  sentEmails.length = 0;
  console.log('🗑️ [DEV EMAIL] All emails cleared');
}

/**
 * Generate an organization invite email template
 */
export function generateInviteEmailTemplate(params: {
  operatorName: string;
  organizationName: string;
  inviteCode: string;
  inviteLink: string;
}): { htmlBody: string; textBody: string } {
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .code-box { background-color: white; border: 2px dashed #4f46e5; padding: 15px; border-radius: 6px; text-align: center; font-size: 24px; font-weight: bold; color: #4f46e5; margin: 20px 0; font-family: monospace; }
    .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Invited!</h1>
    </div>
    <div class="content">
      <p>Hi ${params.operatorName},</p>
      <p>You've been invited to join <strong>${params.organizationName}</strong> as an operator.</p>
      
      <p><strong>Your Invite Code:</strong></p>
      <div class="code-box">${params.inviteCode}</div>
      
      <p>Or click the link below to join directly:</p>
      <a href="${params.inviteLink}" class="button">Accept Invitation</a>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you don't recognize this email or didn't expect this invitation, you can safely ignore it.
      </p>
      
      <div class="footer">
        <p>Debt Settlement System</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
You're Invited!

Hi ${params.operatorName},

You've been invited to join ${params.organizationName} as an operator.

Your Invite Code: ${params.inviteCode}

Or visit this link to accept: ${params.inviteLink}

If you don't recognize this email or didn't expect this invitation, you can safely ignore it.

---
Debt Settlement System
  `.trim();

  return { htmlBody, textBody };
}

/**
 * Generate a password reset email template
 */
export function generatePasswordResetEmailTemplate(params: {
  operatorName: string;
  resetLink: string;
  expiresIn: string;
}): { htmlBody: string; textBody: string } {
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 15px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi ${params.operatorName},</p>
      <p>We received a request to reset your password. Click the link below to create a new password:</p>
      
      <a href="${params.resetLink}" class="button">Reset Password</a>
      
      <p style="color: #6b7280; font-size: 14px;">
        This link expires in ${params.expiresIn}.
      </p>
      
      <div class="warning">
        <strong>⚠️ Security Note:</strong> If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </div>
      
      <div class="footer">
        <p>Debt Settlement System</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
Reset Your Password

Hi ${params.operatorName},

We received a request to reset your password. Visit this link to create a new password:

${params.resetLink}

This link expires in ${params.expiresIn}.

⚠️ SECURITY NOTE: If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

---
Debt Settlement System
  `.trim();

  return { htmlBody, textBody };
}
