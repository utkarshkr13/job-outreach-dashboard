import nodemailer from 'nodemailer';
import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

export interface EmailPayload {
  notionId: string;
  toEmail: string;
  subject: string;
  emailBody: string;
  companyName: string;
  role: string;
  contactName: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    // In demo mode, log which file would be attached
    const customPath = path.join(process.cwd(), 'lib', 'resumes', `custom-${payload.notionId}.pdf`);
    const globalPath = path.join(process.cwd(), 'lib', 'resumes', 'global-resume.pdf');
    let attachedFile = 'None';
    if (fs.existsSync(customPath)) {
      attachedFile = `Custom Resume (custom-${payload.notionId}.pdf)`;
    } else if (fs.existsSync(globalPath)) {
      attachedFile = 'Global Default Resume (global-resume.pdf)';
    }
    console.log(`[DEMO MODE] Mock-sent email to ${payload.toEmail} for ${payload.companyName}. Attached Resume: ${attachedFile}`);
    return true;
  }

  const user = process.env.GMAIL_USER;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!user || !clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Gmail OAuth2 env vars. Need: GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user,
      clientId,
      clientSecret,
      refreshToken,
    },
  });

  // Multi-tier Resume Attachment Flow
  const attachments: nodemailer.SendMailOptions['attachments'] = [];
  try {
    const customPath = path.join(process.cwd(), 'lib', 'resumes', `custom-${payload.notionId}.pdf`);
    const globalPath = path.join(process.cwd(), 'lib', 'resumes', 'global-resume.pdf');

    if (fs.existsSync(customPath)) {
      // Tier 1: Local Custom Resume Override
      const buffer = fs.readFileSync(customPath);
      attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
      console.log(`[MAILER] Attached local custom resume override for ${payload.companyName}`);
    } else if (fs.existsSync(globalPath)) {
      // Tier 2: Local Global Default Resume
      const buffer = fs.readFileSync(globalPath);
      attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
      console.log(`[MAILER] Attached local global default resume`);
    } else {
      // Tier 3: Vercel Blob Remote Fallback (when running in production on Vercel)
      try {
        const { blobs } = await list();
        // Check for custom remote resume first, then global
        let resumeBlob = blobs.find(b => b.pathname === `custom-${payload.notionId}.pdf`);
        if (!resumeBlob) {
          resumeBlob = blobs.find(b => b.pathname === 'resume.pdf');
        }

        if (resumeBlob) {
          const res = await fetch(resumeBlob.url, {
            headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
          });
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
            console.log(`[MAILER] Attached remote Vercel Blob resume`);
          }
        }
      } catch (blobErr) {
        console.warn('[MAILER] Remote Vercel Blob lookup failed (expected in local offline dev):', blobErr);
      }
    }
  } catch (err) {
    console.error('Failed to attach resume (non-fatal):', err);
  }

  // Append invisible open tracking pixel (using live Vercel domain)
  const trackingPixelUrl = `https://job-outreach-dashboard.vercel.app/api/track/${payload.notionId}/open`;
  const trackedHtml = `${payload.emailBody.replace(/\n/g, '<br>')}<br><br><img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

  await transporter.sendMail({
    from: `"${process.env.SENDER_NAME || 'Utkarsh Rajput'}" <${user}>`,
    to: payload.toEmail,
    subject: payload.subject,
    html: trackedHtml,
    text: payload.emailBody,
    replyTo: user,
    attachments,
  });

  return true;
}