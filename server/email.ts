import nodemailer from 'nodemailer';
import { getActiveNotificationEmail, type EnquiryRecord } from './db.js';

// Helper to escape HTML to prevent XSS / HTML injection in transactional emails
function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getEmailProviderStatus(): 'resend' | 'smtp' | 'none' {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    return 'resend';
  }
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_HOST.trim()
  ) {
    return 'smtp';
  }
  return 'none';
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProviderStatus();

  // 1. Send via Resend HTTP API
  if (provider === 'resend') {
    const resendApiKey = process.env.RESEND_API_KEY!.trim();
    const fromAddress = process.env.RESEND_FROM || process.env.INQUIRY_FROM_EMAIL || 'Dawnexus Alerts <alerts@dawnexus.in>';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text
        })
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        console.error('[Resend Error]:', data);
        return { success: false, error: data.message || 'Resend API error' };
      }

      console.log(`[Email Notification] Email sent successfully via Resend to ${params.to} (ID: ${data.id})`);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown Resend error';
      console.error('[Resend Network Error]:', err);
      return { success: false, error: msg };
    }
  }

  // 2. Send via Nodemailer SMTP
  if (provider === 'smtp') {
    const smtpHost = process.env.SMTP_HOST!.trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER!.trim();
    const smtpPass = process.env.SMTP_PASS!.trim();
    const smtpFrom = process.env.SMTP_FROM || process.env.INQUIRY_FROM_EMAIL || 'Dawnexus Alerts <no-reply@dawnexus.in>';

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text
      });

      console.log(`[Email Notification] Email sent successfully via SMTP to ${params.to}`);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown SMTP error';
      console.error('[SMTP Error]:', err);
      return { success: false, error: msg };
    }
  }

  // 3. Neither configured
  console.log(`[Email Notification] No email provider configured (set RESEND_API_KEY or SMTP_*). Email to ${params.to} skipped.`);
  return { success: false, error: 'Email provider not configured' };
}

/**
 * Sends a 6-digit verification OTP to the administrator to verify ownership
 * of the notification recipient address.
 */
export async function sendOtpVerificationEmail(email: string, otp: string): Promise<boolean> {
  const subject = 'Dawnexus — Verify Your Notification Email';

  const text = `
Dawnexus Admin Portal — Notification Email Verification
--------------------------------------------------------

Your verification code is: ${otp}

This verification code will expire in 5 minutes.

Enter this code into your Dawnexus Admin Portal to confirm ownership of this address.
Once verified, all new customer project inquiries will be automatically dispatched here.

Security Notice:
If you did not request this verification code, please ignore this email. Never share this code with anyone.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Dawnexus Verification Code</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #FFFFFF;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0B0B0B; border: 1px solid #252525; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #252525; padding-bottom: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0; font-size: 20px; color: #FFFFFF; letter-spacing: -0.5px;">
        DAWNEXUS <span style="color: #C7FF4D; font-size: 14px; font-weight: normal; margin-left: 8px;">ADMIN ALERTS</span>
      </h2>
      <p style="margin: 6px 0 0 0; color: #A5A5A5; font-size: 13px;">Notification Email Ownership Verification</p>
    </div>

    <!-- Message -->
    <p style="margin: 0 0 16px 0; color: #E0E0E0; font-size: 14px; line-height: 1.6;">
      An authorized administrator requested to configure <strong>${escapeHtml(email)}</strong> as the active alert recipient for new website inquiries.
    </p>

    <!-- OTP Display Box -->
    <div style="background-color: #050505; border: 1px solid #333333; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="color: #A5A5A5; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Verification Code</div>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #C7FF4D; font-family: monospace;">${escapeHtml(otp)}</div>
      <div style="color: #888888; font-size: 12px; margin-top: 10px;">Valid for <strong>5 minutes</strong> &bull; Single-use only</div>
    </div>

    <!-- Security Warning -->
    <div style="background-color: #161616; border-left: 3px solid #C7FF4D; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; color: #A5A5A5; font-size: 12px; line-height: 1.5;">
        <strong>Security Notice:</strong> If you did not initiate this request from the Dawnexus Admin Portal, please disregard this email. Never disclose this code.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #202020; padding-top: 16px; text-align: center; color: #555555; font-size: 11px;">
      &copy; ${new Date().getFullYear()} Dawnexus. All rights reserved.
    </div>

  </div>
</body>
</html>
`;

  return await sendTransactionalEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Sends a full inquiry alert to the active, verified recipient configured in the database.
 */
export async function sendEnquiryNotification(enquiry: EnquiryRecord): Promise<boolean> {
  const activeRecipient = getActiveNotificationEmail();

  if (!activeRecipient) {
    console.log(`[Email Notification] No active verified notification email configured in database. Skipping dispatch for Enquiry #${enquiry.id}.`);
    return false;
  }

  // Format submission timestamp in Asia/Kolkata
  let kolkataTime = enquiry.created_at;
  try {
    kolkataTime = new Date(enquiry.created_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });
  } catch {
    // Fallback to ISO string
  }

  // Format requested services
  let servicesList = enquiry.requested_services;
  try {
    const parsed = JSON.parse(enquiry.requested_services);
    if (Array.isArray(parsed) && parsed.length > 0) {
      servicesList = parsed.join(', ');
    } else {
      servicesList = 'General Consultation';
    }
  } catch {
    // Keep as string
  }

  const clientName = enquiry.full_name || 'Anonymous Visitor';
  const businessName = enquiry.business_name ? enquiry.business_name : 'Not provided';
  const phoneFormatted = enquiry.phone ? enquiry.phone : 'Not provided';
  const budgetFormatted = enquiry.budget ? enquiry.budget : 'Not provided';
  const adminUrl = 'https://dawnexus.in/admin';

  const subject = `New Dawnexus Inquiry — ${businessName !== 'Not provided' ? businessName : clientName} — #${enquiry.id}`;

  const text = `
New Dawnexus Inquiry Received — #${enquiry.id}
============================================================
Submission Time (IST): ${kolkataTime}
Status:                ${enquiry.status}

CUSTOMER & BUSINESS DETAILS:
------------------------------------------------------------
Full Name:     ${clientName}
Business:      ${businessName}
Phone (+91):   ${phoneFormatted}
Email:         ${enquiry.email}

PROJECT SCOPE & BUDGET:
------------------------------------------------------------
Services:      ${servicesList}
Target Budget: ${budgetFormatted}

PROJECT DETAILS / REQUIREMENTS:
------------------------------------------------------------
${enquiry.project_details}

============================================================
Review & manage in Dawnexus Admin Portal:
${adminUrl}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Dawnexus Inquiry #${enquiry.id}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #FFFFFF;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #0B0B0B; border: 1px solid #252525; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
    
    <!-- Top Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #252525; padding-bottom: 20px; margin-bottom: 24px;">
      <div>
        <h2 style="margin: 0; font-size: 20px; color: #FFFFFF; letter-spacing: -0.5px;">
          NEW INQUIRY <span style="color: #C7FF4D; font-weight: 800;">#${enquiry.id}</span>
        </h2>
        <p style="margin: 4px 0 0 0; color: #A5A5A5; font-size: 13px;">${escapeHtml(kolkataTime)} (IST)</p>
      </div>
    </div>

    <!-- Overview Table -->
    <div style="background-color: #050505; border: 1px solid #202020; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #888888; width: 140px;">Customer Name:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #FFFFFF;">${escapeHtml(clientName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888888;">Business Name:</td>
          <td style="padding: 8px 0; color: #E0E0E0;">${escapeHtml(businessName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888888;">Phone Number:</td>
          <td style="padding: 8px 0; color: #C7FF4D; font-family: monospace;">${escapeHtml(phoneFormatted)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888888;">Email Address:</td>
          <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(enquiry.email)}" style="color: #C7FF4D; text-decoration: none;">${escapeHtml(enquiry.email)}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888888;">Requested Services:</td>
          <td style="padding: 8px 0; color: #FFFFFF; font-weight: 500;">${escapeHtml(servicesList)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888888;">Target Budget:</td>
          <td style="padding: 8px 0; color: #FFFFFF; font-weight: 600;">${escapeHtml(budgetFormatted)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888888;">Current Status:</td>
          <td style="padding: 8px 0; color: #C7FF4D; font-weight: bold;">${escapeHtml(enquiry.status)}</td>
        </tr>
      </table>
    </div>

    <!-- Requirements Box -->
    <div style="margin-bottom: 28px;">
      <div style="color: #A5A5A5; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; font-weight: 600;">
        Project Requirements & Scope:
      </div>
      <div style="background-color: #050505; border: 1px solid #202020; border-radius: 12px; padding: 20px; color: #FFFFFF; line-height: 1.6; font-size: 14px; white-space: pre-wrap;">${escapeHtml(enquiry.project_details)}</div>
    </div>

    <!-- Call to action button -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${adminUrl}" style="display: inline-block; background-color: #C7FF4D; color: #050505; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 14px; letter-spacing: 0.5px;">
        Open Admin Dashboard &rarr;
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #202020; padding-top: 16px; text-align: center; color: #555555; font-size: 11px;">
      This automated alert was sent to verified recipient: <strong>${escapeHtml(activeRecipient)}</strong><br/>
      Manage notification recipients securely in the Dawnexus Admin Portal.
    </div>

  </div>
</body>
</html>
`;

  const result = await sendTransactionalEmail({
    to: activeRecipient,
    subject,
    html,
    text
  });

  return result.success;
}
