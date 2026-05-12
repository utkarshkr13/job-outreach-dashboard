import nodemailer from 'nodemailer';
import { list } from '@vercel/blob';

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

  // Try to attach resume from Vercel Blob
  const attachments: nodemailer.SendMailOptions['attachments'] = [];
  try {
    const { blobs } = await list();
    const resumeBlob = blobs.find(b => b.pathname === 'resume.pdf');
    if (resumeBlob) {
      const res = await fetch(resumeBlob.url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
      }
    }
  } catch (err) {
    console.error('Failed to attach resume (non-fatal):', err);
  }

  await transporter.sendMail({
    from: `"${process.env.SENDER_NAME || 'Utkarsh Rajput'}" <${user}>`,
    to: payload.toEmail,
    subject: payload.subject,
    html: payload.emailBody.replace(/\n/g, '<br>'),
    text: payload.emailBody,
    replyTo: user,
    attachments,
  });

  return true;
}