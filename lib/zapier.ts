export interface ZapierPayload {
  notionId: string;
  toEmail: string;
  subject: string;
  emailBody: string;
  companyName: string;
  role: string;
  contactName: string;
}

export async function sendViaZapier(payload: ZapierPayload): Promise<boolean> {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('ZAPIER_WEBHOOK_URL not set');

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return response.ok;
}
