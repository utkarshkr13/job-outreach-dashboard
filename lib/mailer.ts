import nodemailer from 'nodemailer';

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

  const user = process.env.OUTLOOK_USER;
  const pass = process.env.OUTLOOK_PASS;

  if (!user || !pass) {
    throw new Error('OUTLOOK_USER and OUTLOOK_PASS must be set in environment variables');
  }

  _transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false, // STARTTLS
    auth: { user, pass },
    tls: { ciphers: 'SSLv3' },
  });

  return _transporter;
}

import { list } from '@vercel/blob';

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transporter = getTransporter();
  const from = process.env.OUTLOOK_USER!;

  // Try to find the uploaded resume
  let attachments = [];
  try {
    const { blobs } = await list();
    const resumeBlob = blobs.find(b => b.pathname === 'resume.pdf');
    if (resumeBlob) {
      const res = await fetch(resumeBlob.url, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        }
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        attachments.push({
          filename: 'Resume.pdf',
          content: buffer,
          contentType: 'application/pdf'
        });
      } else {
        console.error('Failed to download resume blob for email:', res.statusText);
      }
    }
  } catch (err) {
    console.error('Failed to attach resume:', err);
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