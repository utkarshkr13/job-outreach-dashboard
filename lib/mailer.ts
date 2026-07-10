import nodemailer from 'nodemailer';
import { withTimeout } from './retry';
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

export interface GmailCredentials {
  gmailUser: string;
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRefreshToken: string;
  senderName?: string;
  resumeBlobUrl?: string;
  userId?: string;
}

export async function sendEmail(
  payload: EmailPayload,
  creds: GmailCredentials
): Promise<{ success: boolean; messageId?: string }> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    // In demo mode, log which file would be attached
    const customPath = path.join(process.cwd(), 'lib', 'resumes', `custom-${payload.notionId}.pdf`);
    const globalPath = path.join(process.cwd(), 'lib', 'resumes', 'global-resume.pdf');
    let attachedFile = 'None';
    if (fs.existsSync(customPath)) {
      attachedFile = `Custom Resume (custom-${payload.notionId}.pdf)`;
    } else if (fs.existsSync(globalPath)) {
      attachedFile = 'Global Default Resume (global-resume.pdf)';
    } else if (creds.resumeBlobUrl) {
      attachedFile = `Remote Resume (${creds.resumeBlobUrl})`;
    }
    console.log(`[DEMO MODE] Mock-sent email to ${payload.toEmail} for ${payload.companyName}. Attached Resume: ${attachedFile}`);
    return { success: true, messageId: `mock-msg-${payload.notionId}-${Date.now().toString().slice(-4)}` };
  }

  const { gmailUser, gmailClientId, gmailClientSecret, gmailRefreshToken, senderName, resumeBlobUrl } = creds;

  if (!gmailUser || !gmailClientId || !gmailClientSecret || !gmailRefreshToken) {
    throw new Error(
      'Missing Gmail OAuth2 credentials. User credentials must be fully configured to execute outreach.'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: gmailUser,
      clientId: gmailClientId,
      clientSecret: gmailClientSecret,
      refreshToken: gmailRefreshToken,
    },
  });

  // Multi-tier Resume Attachment Flow
  const attachments: nodemailer.SendMailOptions['attachments'] = [];
  try {
    const customPath = path.join(process.cwd(), 'lib', 'resumes', `custom-${payload.notionId}.pdf`);
    const globalPath = path.join(process.cwd(), 'lib', 'resumes', 'global-resume.pdf');

    if (fs.existsSync(customPath)) {
      // Tier 1: Local Custom Resume Override (Local Dev/Admin)
      const buffer = fs.readFileSync(customPath);
      attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
      console.log(`[MAILER] Attached local custom resume override for ${payload.companyName}`);
    } else if (resumeBlobUrl) {
      // Tier 2: Per-user dynamic Vercel Blob URL (Production SaaS tier)
      const res = await fetch(resumeBlobUrl);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
        console.log(`[MAILER] Attached remote user-specific resume from Vercel Blob URL`);
      } else {
        console.error(`[MAILER] Failed to fetch remote resume Blob at URL: ${resumeBlobUrl}`);
      }
    } else if (fs.existsSync(globalPath)) {
      // Tier 3: Local Global Default Resume
      const buffer = fs.readFileSync(globalPath);
      attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
      console.log(`[MAILER] Attached local global default resume`);
    } else {
      // Tier 4: Fallback remote Vercel Blob lookup
      try {
        const { blobs } = await list();
        const uid = creds.userId || 'demo-user-id';
        let resumeBlob =
          blobs.find(b => b.pathname === `custom-${uid}-${payload.notionId}.pdf`) ||
          blobs.find(b => b.pathname === `custom-${payload.notionId}.pdf`) ||
          blobs.find(b => b.pathname === `resume-${uid}.pdf`);
        if (!resumeBlob) {
          resumeBlob = blobs.find(b => b.pathname === 'resume.pdf');
        }

        if (resumeBlob) {
          const res = await fetch(resumeBlob.url);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            attachments.push({ filename: 'Resume.pdf', content: buffer, contentType: 'application/pdf' });
            console.log(`[MAILER] Attached remote fallback Vercel Blob resume`);
          }
        }
      } catch (blobErr) {
        console.warn('[MAILER] Remote Vercel Blob lookup failed:', blobErr);
      }
    }
  } catch (err) {
    console.error('Failed to attach resume (non-fatal):', err);
  }

  // Domain used to build absolute links (tracking pixel + unsubscribe),
  // configurable so preview deploys / custom domains resolve correctly
  // instead of always pointing at the hardcoded production URL.
  const trackingBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://job-outreach-dashboard.vercel.app');
  const userQuery = creds.userId ? `?u=${creds.userId}` : '';
  const trackingPixelUrl = `${trackingBaseUrl}/api/track/${payload.notionId}/open${userQuery}`;
  const unsubscribeUrl = `${trackingBaseUrl}/api/track/${payload.notionId}/unsubscribe${userQuery}`;

  // CAN-SPAM-style disclosure + working one-click unsubscribe, appended below
  // the sender's own signature. Kept small/grey so it doesn't compete with
  // the actual pitch, but present and functional on every send.
  const complianceFooter =
    `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:11px;color:#8a8a8e;line-height:1.5;">` +
    `You're receiving this because you're listed as a hiring contact for ${payload.companyName}. ` +
    `Not the right person, or don't want future emails about this application? ` +
    `<a href="${unsubscribeUrl}" style="color:#8a8a8e;">Unsubscribe</a>.` +
    `</div>`;
  const complianceFooterText =
    `\n\n---\nYou're receiving this because you're listed as a hiring contact for ${payload.companyName}. ` +
    `Unsubscribe: ${unsubscribeUrl}`;

  const trackedHtml =
    `${payload.emailBody.replace(/\n/g, '<br>')}<br><br>` +
    complianceFooter +
    `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  const trackedText = `${payload.emailBody}${complianceFooterText}`;

  // Sending is NOT retried here: a transient failure *after* Gmail accepted
  // the message would cause a retry to send a visible duplicate email to the
  // recruiter, which is worse than surfacing the error once. We only bound
  // how long we wait so a hung SMTP connection can't stall the request forever.
  const info = await withTimeout(
    transporter.sendMail({
      from: `"${senderName || 'Job Seeker'}" <${gmailUser}>`,
      to: payload.toEmail,
      subject: payload.subject,
      html: trackedHtml,
      text: trackedText,
      replyTo: gmailUser,
      attachments,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
      },
    }),
    20_000,
    'Gmail sendMail'
  );

  return { success: true, messageId: info.messageId };
}
