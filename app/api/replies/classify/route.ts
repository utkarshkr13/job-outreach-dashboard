import { NextResponse } from 'next/server';
import { getCompanyById, getNotionConnection } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  try {
    const { replyBody, notionId } = await req.json();

    if (!replyBody || !notionId) {
      return NextResponse.json({ error: 'Missing replyBody or notionId' }, { status: 400 });
    }

    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const company = await getCompanyById(connection, notionId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    const apiKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Anthropic API Key. Please configure keys to run reply classification.');
    }

    const client = new Anthropic({ apiKey });
    
    const originalEmail = company.emailDraft || '';
    const recruiterName = company.contactName || 'Recruiter';
    const companyName = company.company;
    const signature = [creds.senderName, creds.senderPhone, creds.senderLinkedin].filter(Boolean).join('\n');

    const systemPrompt = `You are analyzing a recruiter's reply to a cold job application email.

Original email sent to: ${recruiterName} at ${companyName}
Original email body:
${originalEmail}

Recruiter reply:
${replyBody}

1. Classify the sentiment:
   - positive: interested, wants to move forward
   - scheduling: asking to set up a call or interview
   - request_info: asking for resume, portfolio, LinkedIn, or more details
   - rejection: not hiring, not a fit, no openings
   - not_now: interested but bad timing (freeze, on leave, etc.)

2. Draft a professional reply (50-100 words) appropriate for the sentiment:
   - positive/scheduling: enthusiastic, confirm availability, propose 2-3 time slots
   - request_info: immediately provide what was asked + CTA
   - rejection: graceful thank you, leave door open for future
   - not_now: understand, ask to reconnect in the timeframe they mentioned
   - Use the candidate signature:
${signature}

Return EXACTLY a JSON structure matching:
{
  "sentiment": "positive" | "scheduling" | "request_info" | "rejection" | "not_now",
  "suggestedResponse": "Draft reply text here"
}

No markdown wrappers outside the JSON, output only raw JSON.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Classify recruiter reply and draft response.' }],
    });

    const text = (response.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Claude response did not contain a valid JSON object.');
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      sentiment: result.sentiment,
      suggestedResponse: result.suggestedResponse,
    });
  } catch (e: any) {
    console.error('❌ POST /api/replies/classify error:', e.message);
    const isAuthError = e.message.includes('Unauthorized') || e.message.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuthError ? 401 : 500 });
  }
}
