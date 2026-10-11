import nodemailer from 'nodemailer';
import type { EnquiryRecord } from './db.js';

export async function sendEnquiryNotification(enquiry: EnquiryRecord): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpFrom = process.env.SMTP_FROM || 'Dawnexus Enquiries <no-reply@dawnexus.in>';

  // Check if SMTP is configured
  if (!adminEmail || !smtpHost || !smtpUser || !smtpPass) {
    console.log(`[Email Notification] SMTP not configured. Skipping email dispatch for Enquiry #${enquiry.id} (${enquiry.full_name}).`);
    return false;
  }

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

    let servicesList = enquiry.requested_services;
    try {
      const parsed = JSON.parse(enquiry.requested_services);
      if (Array.isArray(parsed)) {
        servicesList = parsed.join(', ');
      }
    } catch {
      // Keep as string
    }

    const mailOptions = {
      from: smtpFrom,
      to: adminEmail,
      subject: `[Dawnexus New Enquiry] #${enquiry.id} - ${enquiry.full_name}`,
      text: `
New Enquiry Received on Dawnexus:
------------------------------------------
ID: #${enquiry.id}
Date: ${enquiry.created_at}
Name: ${enquiry.full_name}
Business: ${enquiry.business_name || 'N/A'}
Email: ${enquiry.email}
Phone: ${enquiry.phone || 'N/A'}
Services: ${servicesList}
Budget: ${enquiry.budget || 'Not specified'}

Project Details:
${enquiry.project_details}
------------------------------------------
View and manage in Admin Dashboard: http://localhost:3000/admin
      `,
      html: `
<div style="font-family: Arial, sans-serif; background-color: #050505; color: #FFFFFF; padding: 24px; border-radius: 8px; max-width: 600px;">
  <div style="border-bottom: 2px solid #252525; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #FFFFFF; margin: 0;">New Dawnexus Enquiry <span style="color: #C7FF4D;">#${enquiry.id}</span></h2>
    <p style="color: #A5A5A5; margin: 4px 0 0 0; font-size: 14px;">Received on ${new Date(enquiry.created_at).toLocaleString()}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px 0; color: #A5A5A5; width: 140px;">Customer Name:</td><td style="font-weight: bold; color: #FFFFFF;">${enquiry.full_name}</td></tr>
    <tr><td style="padding: 8px 0; color: #A5A5A5;">Business:</td><td style="color: #FFFFFF;">${enquiry.business_name || 'N/A'}</td></tr>
    <tr><td style="padding: 8px 0; color: #A5A5A5;">Email:</td><td><a href="mailto:${enquiry.email}" style="color: #C7FF4D; text-decoration: none;">${enquiry.email}</a></td></tr>
    <tr><td style="padding: 8px 0; color: #A5A5A5;">Phone:</td><td style="color: #FFFFFF;">${enquiry.phone || 'N/A'}</td></tr>
    <tr><td style="padding: 8px 0; color: #A5A5A5;">Services:</td><td style="color: #FFFFFF;">${servicesList}</td></tr>
    <tr><td style="padding: 8px 0; color: #A5A5A5;">Budget:</td><td style="color: #FFFFFF;">${enquiry.budget || 'Not specified'}</td></tr>
  </table>
  <div style="background-color: #0B0B0B; border: 1px solid #252525; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
    <h4 style="margin: 0 0 8px 0; color: #A5A5A5; font-size: 13px; text-transform: uppercase;">Project Details:</h4>
    <p style="margin: 0; line-height: 1.6; color: #FFFFFF; white-space: pre-wrap;">${enquiry.project_details}</p>
  </div>
  <a href="http://localhost:3000/admin" style="display: inline-block; background-color: #C7FF4D; color: #050505; font-weight: bold; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Open Admin Dashboard &rarr;</a>
</div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Notification] Email sent successfully for Enquiry #${enquiry.id}`);
    return true;
  } catch (err) {
    console.error(`[Email Notification] Failed to send email for Enquiry #${enquiry.id}:`, err);
    return false;
  }
}

