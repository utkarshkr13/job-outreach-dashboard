import { NextResponse } from 'next/server';
import { mockIngestCompany } from '@/lib/mockDb';
import { Client } from '@notionhq/client';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { getNotionConnection } from '@/lib/notion';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const { company, role } = await req.json();
    if (!company || !role) {
      return NextResponse.json({ error: 'Missing company or role' }, { status: 400 });
    }

    // Fall back to mock if no real Notion credentials are available
    if (!creds.notionApiKey || creds.notionApiKey === 'demo-notion-api-key') {
      const newCompany = mockIngestCompany(company, role);
      return NextResponse.json({ success: true, company: newCompany });
    }

    // Production Mode: Trigger Claude to search/guess contact info and insert into Notion
    const notion = connection.notion;
    
    const anthropicKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error('Missing Anthropic API Key. Configure your key in Settings to run AI discovery.');
    }
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const systemPrompt = `You are a cold email lead generation agent.
Your job is to search your knowledge base and return the most likely first name, last name, job title, and email address of a Technical Recruiter, Recruiting Lead, HR Specialist, or Engineering Manager at a given company.
Be realistic. Use standard tech industry email naming conventions (e.g. jessica.jones@stripe.com, careers@vercel.com, recruiting@slack.com).
Return a JSON object only:
{
  "name": "First Last",
  "title": "Technical Recruiter",
  "email": "email@domain.com",
  "location": "City, Country",
  "type": "Startup | Stable",
  "notes": "Brief explanation of who this contact is."
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Find recruiter contact details for: Company: ${company}, Targeted Role: ${role}` }]
    });

    const text = (response.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let contact = {
      name: 'Hiring Lead',
      title: 'Talent Acquisition',
      email: `recruiting@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      location: 'Bangalore',
      type: 'Stable' as 'Startup' | 'Stable',
      notes: 'Automatically generated default lead.'
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        contact = { ...contact, ...parsed };
      } catch (e) {}
    }

    // Insert new page into User's scoped Notion DB
    const notionResponse = await notion.pages.create({
      parent: { database_id: connection.DB_ID },
      properties: {
        'Company': { title: [{ text: { content: company } }] },
        'Role': { rich_text: [{ text: { content: role } }] },
        'Email': { email: contact.email },
        'Contact Name': { rich_text: [{ text: { content: contact.name } }] },
        'Contact Title': { rich_text: [{ text: { content: contact.title } }] },
        'Company Type': { select: { name: contact.type } },
        'Location': { rich_text: [{ text: { content: contact.location } }] },
        'Notes': { rich_text: [{ text: { content: contact.notes } }] },
        'Email Status': { select: { name: 'New' } },
        'Date Added': { date: { start: new Date().toISOString().split('T')[0] } }
      }
    });

    return NextResponse.json({
      success: true,
      company: {
        notionId: notionResponse.id,
        company,
        role,
        email: contact.email,
        contactName: contact.name,
        contactTitle: contact.title,
        location: contact.location,
        notes: contact.notes,
        emailStatus: 'New',
        dateAdded: new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error in Ingest API:', error);
    return NextResponse.json(safeErrorBody(error), { status: safeErrorStatus(error) });
  }
}
