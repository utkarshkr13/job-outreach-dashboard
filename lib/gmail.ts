export interface GmailClientCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function getGmailAccessToken(creds: GmailClientCredentials): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to refresh Gmail OAuth2 token: ' + await res.text());
  }
  const data = await res.json();
  return data.access_token;
}

export async function getGmailThread(
  threadId: string,
  accessToken: string
): Promise<any> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Gmail thread ${threadId}: ` + await res.text());
  }
  return res.json();
}

export async function searchGmailMessageByRfcId(
  messageIdClean: string,
  accessToken: string
): Promise<string | null> {
  // messageIdClean is messageId without brackets <>
  const q = encodeURIComponent(`rfc822msgid:${messageIdClean}`);
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (data.messages && data.messages.length > 0) {
    return data.messages[0].threadId;
  }
  return null;
}

export function parseRecruiterReply(threadData: any, userEmail: string): { replyBody: string; hasReplied: boolean } {
  if (!threadData || !threadData.messages || threadData.messages.length <= 1) {
    return { replyBody: '', hasReplied: false };
  }

  // Iterate messages, look for one that is NOT sent by userEmail
  // We check from the end (newest messages first)
  const userEmailClean = userEmail.toLowerCase().trim();
  const messages = [...threadData.messages].reverse();

  for (const msg of messages) {
    const headers = msg.payload.headers || [];
    const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
    
    if (fromHeader && !fromHeader.toLowerCase().includes(userEmailClean)) {
      // Found recruiter reply! Extract plain text body.
      let replyBody = '';
      const parts = msg.payload.parts || [msg.payload];

      const findTextBody = (payloadParts: any[]) => {
        for (const part of payloadParts) {
          if (part.mimeType === 'text/plain' && part.body && part.body.data) {
            // Decodes base64url standard
            const decoded = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
            replyBody = decoded;
            break;
          }
          if (part.parts) {
            findTextBody(part.parts);
          }
        }
      };

      findTextBody(parts);
      
      // Clean up body (truncate signature or thread quoting like "> On Tue...")
      if (replyBody) {
        replyBody = replyBody.split(/On .* wrote:/i)[0].trim();
        replyBody = replyBody.split(/On .* at .* wrote:/i)[0].trim();
        replyBody = replyBody.split(/-----Original Message-----/i)[0].trim();
      }

      return { replyBody: replyBody || 'No text content in recruiter reply.', hasReplied: true };
    }
  }

  return { replyBody: '', hasReplied: false };
}
