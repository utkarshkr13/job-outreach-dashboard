import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies, updateStatus } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const allCompanies = await getAllCompanies();
    const company = allCompanies.find(c => c.notionId === id);
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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