import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByStatus, updateStatus } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const approved = await getCompaniesByStatus('Approved');
    const results = [];

    for (const company of approved) {
      if (!company.email) {
        results.push({ company: company.company, success: false, error: 'No email' });
        continue;
      }
      try {
        await sendEmail({
          notionId: company.notionId,
          toEmail: company.email,
          subject: company.emailSubject,
          emailBody: company.emailDraft,
          companyName: company.company,
          role: company.role,
          contactName: company.contactName
        });
        await updateStatus(company.notionId, 'Sent');
        results.push({ company: company.company, success: true });
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        results.push({ company: company.company, success: false, error: e.message });
      }
    }

    return NextResponse.json({ sent: results.filter(r => r.success).length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}