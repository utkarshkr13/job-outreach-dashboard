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

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment variables');
  }

  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: { user, pass },
  });

  return _transporter;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER!;

  // Try to attach the uploaded resume from Vercel Blob
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
      } else {
        console.error('Failed to download resume blob:', res.statusText);
      }
    }
  } catch (err) {
    console.error('Failed to attach resume (non-fatal):', err);
  }

  await transporter.sendMail({
    from: `"${process.env.SENDER_NAME || 'Utkarsh Rajput'}" <${from}>`,
    to: payload.toEmail,
    subject: payload.subject,
    html: payload.emailBody.replace(/\n/g, '<br>'),
    text: payload.emailBody,
    replyTo: from,
    attachments,
  });

  return true;
}