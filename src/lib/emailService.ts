// src/lib/emailService.ts
import { getValidMicrosoftAccessToken, sendMailViaGraph } from './graphMailService.server.js';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  useMicrosoftGraph?: boolean; // New option
  userEmail?: string; // Required if useMicrosoftGraph is true
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Send an email using either SMTP or Microsoft Graph
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Use Microsoft Graph if requested and available
    if (options.useMicrosoftGraph && options.userEmail) {
      return await sendViaMicrosoftGraph(options);
    }

    // Fall back to SMTP or development mode
    return await sendViaSMTP(options);
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

/**
 * Send email via Microsoft Graph API
 */
async function sendViaMicrosoftGraph(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accessToken = await getValidMicrosoftAccessToken(options.userEmail!);
    if (!accessToken) {
      throw new Error('Microsoft 365 account not connected or token expired');
    }

    await sendMailViaGraph(accessToken, {
      to: Array.isArray(options.to) ? options.to[0] : options.to,
      subject: options.subject,
      bodyHtml: options.html,
    });

    return {
      success: true,
      messageId: `graph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
  } catch (error) {
    console.error('Microsoft Graph email error:', error);
    throw error;
  }
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getEmailConfig();
  
  if (!config) {
    // Development mode: log the email
    console.log('📧 EMAIL (DEV MODE):');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`HTML: ${options.html.substring(0, 200)}...`);
    console.log('---');
    
    return {
      success: true,
      messageId: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
  }

  // Production: Send via SMTP using nodemailer
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const result = await transporter.sendMail({
      from: options.from || config.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? Array.isArray(options.cc) ? options.cc.join(', ') : options.cc : undefined,
      bcc: options.bcc ? Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc : undefined,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      attachments: options.attachments,
    });

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('SMTP email error:', error);
    throw error;
  }
}

/**
 * Get email configuration from environment variables
 */
function getEmailConfig(): EmailConfig | null {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email service: Running in development mode (no email config)');
      return null;
    }
    console.warn('⚠️ Email configuration missing. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM');
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from
  };
}

/**
 * Simple HTML to text converter
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Send a verification email
 */
export async function sendVerificationEmail(email: string, token: string, options?: { appUrl?: string; useMicrosoftGraph?: boolean; userEmail?: string }): Promise<void> {
  const baseUrl = options?.appUrl || process.env.APP_URL || 'https://localhost:3000';
  const verifyLink = `${baseUrl}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 30px 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a;">Welcome to SPIHEAD! 🚀</h1>
            <p style="font-size: 16px; color: #4b5563; margin: 20px 0;">
              Thank you for signing up. Please verify your email address to get started.
            </p>
            <div style="margin: 30px 0;">
              <a href="${verifyLink}" 
                 style="display: inline-block; padding: 12px 30px; background: #f59e0b; color: #1a1a1a; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Verify Email Address
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
              This link expires in 7 days.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">
              SPIHEAD - Enterprise CRM Platform
            </p>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to SPIHEAD!\n\nPlease verify your email address by visiting this link:\n${verifyLink}\n\nIf you didn't create an account, you can safely ignore this email.\n\nThis link expires in 7 days.`,
    useMicrosoftGraph: options?.useMicrosoftGraph,
    userEmail: options?.userEmail
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string, options?: { appUrl?: string; useMicrosoftGraph?: boolean; userEmail?: string }): Promise<void> {
  const baseUrl = options?.appUrl || process.env.APP_URL || 'https://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 30px 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a;">Reset Your Password 🔒</h1>
            <p style="font-size: 16px; color: #4b5563; margin: 20px 0;">
              We received a request to reset your password. Click the button below to set a new one.
            </p>
            <div style="margin: 30px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; padding: 12px 30px; background: #f59e0b; color: #1a1a1a; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
              This link expires in 1 hour.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">
              SPIHEAD - Enterprise CRM Platform
            </p>
          </div>
        </body>
      </html>
    `,
    text: `Reset Your Password\n\nWe received a request to reset your password. Visit this link to set a new one:\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\nThis link expires in 1 hour.`,
    useMicrosoftGraph: options?.useMicrosoftGraph,
    userEmail: options?.userEmail
  });
}

/**
 * Send a welcome email
 */
export async function sendWelcomeEmail(email: string, name: string, options?: { appUrl?: string; useMicrosoftGraph?: boolean; userEmail?: string }): Promise<void> {
  const baseUrl = options?.appUrl || process.env.APP_URL || 'https://localhost:3000';

  await sendEmail({
    to: email,
    subject: 'Welcome to SPIHEAD!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Welcome to SPIHEAD</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 30px 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a;">Welcome to SPIHEAD, ${name}! 🎉</h1>
            <p style="font-size: 16px; color: #4b5563; margin: 20px 0;">
              Your account has been successfully created. You're now ready to start managing your leads and deals.
            </p>
            <div style="text-align: left; background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">Get Started:</h3>
              <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #4b5563;">
                <li style="padding: 5px 0;">📊 Import your first lead</li>
                <li style="padding: 5px 0;">📧 Connect your email</li>
                <li style="padding: 5px 0;">🎯 Set up your sales pipeline</li>
              </ul>
            </div>
            <div style="margin: 20px 0;">
              <a href="${baseUrl}" 
                 style="display: inline-block; padding: 12px 30px; background: #f59e0b; color: #1a1a1a; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Go to Dashboard
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">
              SPIHEAD - Enterprise CRM Platform
            </p>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to SPIHEAD, ${name}!\n\nYour account has been created. Visit ${baseUrl} to get started.`,
    useMicrosoftGraph: options?.useMicrosoftGraph,
    userEmail: options?.userEmail
  });
}

export { getValidMicrosoftAccessToken, sendMailViaGraph } from './graphMailService.server.js';
