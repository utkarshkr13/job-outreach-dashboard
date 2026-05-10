import { NextRequest, NextResponse } from 'next/server';
import { updateStatus } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch the specific page directly instead of querying all companies
    const page: any = await notion.pages.retrieve({ page_id: id });

    const company = {
      notionId: page.id,
      company: page.properties['Company']?.title?.[0]?.text?.content ?? '',
      role: page.properties['Role']?.rich_text?.[0]?.text?.content ?? '',
      email: page.properties['Email']?.email ?? '',
      contactName: page.properties['Contact Name']?.rich_text?.[0]?.text?.content ?? '',
      emailSubject: page.properties['Email Subject']?.rich_text?.[0]?.text?.content ?? '',
      emailDraft: page.properties['Email Draft']?.rich_text?.[0]?.text?.content ?? '',
    };

    if (!company.email) return NextResponse.json({ error: 'No email address for this company' }, { status: 400 });

    await sendEmail({
      notionId: company.notionId,
      toEmail: company.email,
      subject: company.emailSubject,
      emailBody: company.emailDraft,
      companyName: company.company,
      role: company.role,
      contactName: company.contactName
    });

    await updateStatus(id, 'Sent');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}