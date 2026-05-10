import { Resend } from 'resend';
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY must be set in environment variables');

  const resend = new Resend(apiKey);

  // Build HTML body
  const htmlBody = payload.emailBody.replace(/\n/g, '<br>');

  // Try to attach resume from Vercel Blob
  const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
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

  const fromName = process.env.SENDER_NAME || 'Utkarsh Rajput';
  // Resend free tier: must send from onboarding@resend.dev OR a verified domain
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to: payload.toEmail,
    subject: payload.subject,
    html: htmlBody,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  return true;
}